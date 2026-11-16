
const bookings = require("../models/bookingModel");
const tokenCounters = require("../models/tokenCounterModel");
const users = require("../models/userModel");
const orgs = require("../models/orgModel");
const mongoose = require("mongoose");
const { sendBookingConfirmationEmail, sendCancellationEmail, sendNextTokenEmail } = require("../services/emailService");
const stripe = require("../services/stripeService");
const pendingBookings = require("../models/pendingBookingModel");


exports.createCheckoutSessionController = async (req, res) => {
  try {
    const {
      orgId,
      service,
      bookingDate,
      timeSlot
    } = req.body;

    const userEmail = req.payload;

    if (!orgId || !service || !bookingDate || !timeSlot) {
      return res.status(400).json({
        message: "Please provide all booking details"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({
        message: "Invalid organization"
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      new Date(bookingDate).toISOString().slice(0, 10) !== bookingDate
    ) {
      return res.status(400).json({
        message: "Invalid booking date"
      });
    }

    const user = await users.findOne({
      email: userEmail
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const organization = await orgs.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found"
      });
    }

    if (!organization.orgQueues.includes(service)) {
      return res.status(400).json({
        message: "Invalid queue"
      });
    }

    const existingBooking = await bookings.findOne({
      userEmail,
      orgId,
      bookingDate,
      service,
      timeSlot,
      status: {
        $in: ["waiting", "serving"]
      }
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "You already have an active booking for this slot"
      });
    }

    const price = service.toLowerCase().includes("normal") ? 50 : 100;

    const pendingBooking = await pendingBookings.create({
      userEmail,
      username: user.username,
      orgId: organization._id,
      orgName: organization.orgName,
      orgAddress: organization.orgAddress,
      service,
      bookingDate,
      timeSlot,
      price
    });

    try {
      const session = await stripe.checkout.sessions.create({
  mode: "payment",

        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `QueueLess Token - ${organization.orgName}`,
                description: `${service} | ${bookingDate} | ${timeSlot}`
              },
              unit_amount: price * 100
            },
            quantity: 1
          }
        ],

        metadata: {
          pendingBookingId: pendingBooking._id.toString()
        },

        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`
      });

      pendingBooking.stripeSessionId = session.id;
      await pendingBooking.save();

      return res.status(200).json({
        message: "Stripe checkout session created",
        checkoutUrl: session.url
      });

    } catch (stripeError) {
      await pendingBookings.findByIdAndDelete(pendingBooking._id);
      throw stripeError;
    }

  } catch (error) {
    console.log("Stripe checkout error:", error.message);

    return res.status(500).json({
      message: "Unable to create payment session",
      error: error.message
    });
  }
};


exports.stripeWebhookController = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.log("Stripe webhook signature error:", error.message);

    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      if (session.payment_status !== "paid") {
        return res.status(200).json({ received: true });
      }

      const pendingBookingId = session.metadata.pendingBookingId;

      if (!pendingBookingId) {
        return res.status(400).json({
          message: "Pending booking ID not found"
        });
      }

      // Check whether this payment was already processed
      const existingPayment = await bookings.findOne({
        stripeSessionId: session.id
      });

      if (existingPayment) {
        return res.status(200).json({ received: true });
      }

      const pendingBooking = await pendingBookings.findById(
        pendingBookingId
      );

      if (!pendingBooking) {
        return res.status(404).json({
          message: "Pending booking not found"
        });
      }

      // Generate the next token number
      const counter = await tokenCounters.findOneAndUpdate(
        {
          orgId: pendingBooking.orgId,
          bookingDate: pendingBooking.bookingDate,
          service: pendingBooking.service
        },
        {
          $inc: { lastToken: 1 }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      const tokenNumber = counter.lastToken;

      const prefix = pendingBooking.service
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);

      const tokenCode = `${prefix}-${String(tokenNumber).padStart(3, "0")}`;

      // Create the actual booking after payment
      const newBooking = await bookings.create({
        userEmail: pendingBooking.userEmail,
        username: pendingBooking.username,
        orgId: pendingBooking.orgId,
        orgName: pendingBooking.orgName,
        orgAddress: pendingBooking.orgAddress,
        service: pendingBooking.service,
        bookingDate: pendingBooking.bookingDate,
        timeSlot: pendingBooking.timeSlot,
        tokenNumber,
        tokenCode,
        price: pendingBooking.price,
        status: "waiting",
        paymentStatus: "paid",
        stripeSessionId: session.id,
        paymentId: session.payment_intent
      });

      // Send booking confirmation email
      try {
        await sendBookingConfirmationEmail(
          pendingBooking.userEmail,
          {
            username: pendingBooking.username,
            orgName: pendingBooking.orgName,
            service: pendingBooking.service,
            tokenNumber,
            bookingDate: pendingBooking.bookingDate,
            timeSlot: pendingBooking.timeSlot,
            price: pendingBooking.price
          }
        );
      } catch (emailError) {
        console.log("Booking email failed:", emailError.message);
      }

      // Remove the temporary booking
      await pendingBookings.findByIdAndDelete(pendingBookingId);

      console.log("Paid booking created:", newBooking.tokenCode);

    } catch (error) {
      console.log("Stripe webhook processing error:", error);

      return res.status(500).json({
        message: "Webhook processing failed"
      });
    }
  }

  return res.status(200).json({ received: true });
};



exports.checkPaymentStatusController = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.payload;

    const booking = await bookings.findOne({
      stripeSessionId: sessionId,
      userEmail
    });

    if (!booking) {
      return res.status(200).json({
        paid: false,
        message: "Payment confirmation is still processing"
      });
    }

    return res.status(200).json({
      paid: booking.paymentStatus === "paid",
      message: "Payment confirmed",
      booking
    });

  } catch (error) {
    console.log("Payment status error:", error.message);

    return res.status(500).json({
      message: "Unable to check payment status"
    });
  }
};



// ==================================
// BOOK A TOKEN
// ==================================

exports.createBookingController = async (req, res) => {

  try {

    const {
      orgId,
      service,
      bookingDate,
      timeSlot
    } = req.body;

    const userEmail = req.payload;

    if (
      !orgId ||
      !service ||
      !bookingDate ||
      !timeSlot
    ) {
      return res.status(400).json({
        message: "Please provide all booking details"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({
        message: "Invalid organization"
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      new Date(bookingDate).toISOString().slice(0, 10) !== bookingDate
    ) {
      return res.status(400).json({
        message: "Invalid booking date"
      });
    }

    // Find the logged-in user
    const user = await users.findOne({
      email: userEmail
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Find the selected organization
    const organization = await orgs.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found"
      });
    }

    if (!organization.orgQueues.includes(service)) {
  return res.status(400).json({
    message: "Invalid queue"
  });
}

    // Prevent duplicate active bookings
    const existingBooking = await bookings.findOne({
      userEmail,
      orgId,
      bookingDate,
      service,
      timeSlot,
      status: {
        $in: ["waiting", "serving"]
      }
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "You already have an active booking for this slot",
        booking: existingBooking
      });
    }

    // Generate the next token atomically
    let counter;

    try {

      counter = await tokenCounters.findOneAndUpdate(
        {
          orgId,
          bookingDate,
          service
        },
        {
          $inc: {
            lastToken: 1
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

    } catch (error) {

      // Handle simultaneous first-time counter creation
      if (error.code !== 11000) {
        throw error;
      }

      counter = await tokenCounters.findOneAndUpdate(
        {
          orgId,
          bookingDate,
          service
        },
        {
          $inc: {
            lastToken: 1
          }
        },
        {
          new: true
        }
      );

    }

    const tokenNumber = counter.lastToken;

    const prefix = service
  .split(" ")
  .map(word => word[0])
  .join("")
  .toUpperCase()
  .slice(0, 3);

    const tokenCode =
      `${prefix}-${String(tokenNumber).padStart(3, "0")}`;

    // Set price on the backend, not from the frontend
    const price = service.toLowerCase().includes("normal") ? 50 : 100;

    // Save booking
    const newBooking = await bookings.create({

      userEmail,

      username: user.username,

      orgId: organization._id,

      orgName: organization.orgName,

      orgAddress: organization.orgAddress,

      service,

      bookingDate,

      timeSlot,

      tokenNumber,

      tokenCode,

      price,

      status: "waiting"

    });

    // Send booking confirmation email
try {
    await sendBookingConfirmationEmail(user.email, {
        username: user.username,
        orgName: organization.orgName,
        service: service,
        tokenNumber: tokenNumber,
        bookingDate: bookingDate,
        timeSlot: timeSlot,
        price: price
    });

} catch (emailError) {
    console.log("Booking email notification failed:", emailError.message);
}

    return res.status(201).json({

      message: "Token booked successfully",

      booking: newBooking

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      message: "Error booking token",
      error: error.message
    });

  }

};


// ==================================
// GET USER BOOKINGS
// ==================================

exports.getUserBookingsController = async (req, res) => {

  try {

    const userEmail = req.payload;

    const userBookings = await bookings.find({
      userEmail
    }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      bookings: userBookings
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }

};


// ==================================
// GET ORGANIZATION QUEUE
// ==================================

exports.getOrganizationQueueController = async (req, res) => {

  try {

    const { date, service, timeSlot } = req.query;

    const organization = await orgs.findOne({
      orgEmail: req.payload
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found"
      });
    }

    if (!date || !service || !timeSlot) {
      return res.status(400).json({
        message: "Date, service and time slot are required"
      });
    }

    const filter = {
      orgId: organization._id,
      bookingDate: date,
      service,
      timeSlot
    };

    

    const queue = await bookings.find(filter)
      .sort({ tokenNumber: 1 });

    const serving = queue.find(
      item => item.status === "serving"
    ) || null;

    const waiting = queue.filter(
      item => item.status === "waiting"
    );

    const completed = queue.filter(
      item => item.status === "completed"
    );

    return res.status(200).json({
      serving,
      waiting,
      completed,
      totalWaiting: waiting.length,
      totalCompleted: completed.length
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }

};


// ==================================
// SERVE NEXT TOKEN
// ==================================

exports.serveNextController = async (req, res) => {

  try {

    const { date, service, timeSlot } = req.body;

    const organization = await orgs.findOne({
      orgEmail: req.payload
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found"
      });
    }

    if (!date || !service || !timeSlot) {
      return res.status(400).json({
        message: "Date, service and time slot are required"
      });
    }

    const filter = {
      orgId: organization._id,
      bookingDate: date,
      service,
      timeSlot
    };

    // Complete the currently serving token
    await bookings.updateMany(
      {
        ...filter,
        status: "serving"
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date()
        }
      }
    );

    // Find the next waiting token
    const nextBooking = await bookings.findOneAndUpdate(
      {
        ...filter,
        status: "waiting"
      },
      {
        $set: {
          status: "serving",
          servedAt: new Date()
        }
      },
      {
        new: true,
        sort: {
          tokenNumber: 1
        }
      }
    );

    // Send email notification to the next user
if (nextBooking) {
    try {
        await sendNextTokenEmail(nextBooking.userEmail, {
            username: nextBooking.username,
            orgName: nextBooking.orgName,
            service: nextBooking.service,
            tokenNumber: nextBooking.tokenNumber
        });

    } catch (emailError) {
        console.log(
            "Next-token email notification failed:",
            emailError.message
        );
    }
}

    return res.status(200).json({

      message: nextBooking
        ? "Next token is now serving"
        : "No more waiting tokens",

      nowServing: nextBooking

    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }

};


// ==================================
// CANCEL USER BOOKING
// ==================================

exports.cancelBookingController = async (req, res) => {

  try {

    const { id } = req.params;

    const booking = await bookings.findOne({
      _id: id,
      userEmail: req.payload
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    if (booking.status !== "waiting") {
      return res.status(400).json({
        message: "Only waiting bookings can be cancelled"
      });
    }

    booking.status = "cancelled";

    await booking.save();

    // Send booking cancellation email
try {
    await sendCancellationEmail(booking.userEmail, {
        username: booking.username,
        orgName: booking.orgName,
        service: booking.service,
        tokenNumber: booking.tokenNumber,
        bookingDate: booking.bookingDate,
        timeSlot: booking.timeSlot
    });

} catch (emailError) {
    console.log(
        "Cancellation email notification failed:",
        emailError.message
    );
}

    return res.status(200).json({
      message: "Booking cancelled successfully",
      booking
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }

};



// ==================================
// GET PUBLIC QUEUE AVAILABILITY
// ==================================

exports.getQueueAvailabilityController = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, service, timeSlot } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid organization ID"
      });
    }

    if (!date || !service || !timeSlot) {
      return res.status(400).json({
        message: "Date, service and time slot are required"
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        message: "Invalid booking date"
      });
    }

    const organization = await orgs.findById(id);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found"
      });
    }

    if (!organization.orgQueues.includes(service)) {
  return res.status(400).json({
    message: "Invalid queue"
  });
}

    const filter = {
      orgId: organization._id,
      bookingDate: date,
      service,
      timeSlot,
      status: "waiting"
    };

    const totalWaiting = await bookings.countDocuments(filter);

    return res.status(200).json({
      totalWaiting
    });

  } catch (error) {
    console.log("Queue availability error:", error);

    return res.status(500).json({
      message: "Unable to fetch queue availability"
    });
  }
};

