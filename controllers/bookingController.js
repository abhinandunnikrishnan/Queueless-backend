
const bookings = require("../models/bookingModel");
const tokenCounters = require("../models/tokenCounterModel");
const users = require("../models/userModel");
const orgs = require("../models/orgModel");
const mongoose = require("mongoose");

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

    const validServices = [
      "General Consultation",
      "Specialist Consultation"
    ];

    if (!validServices.includes(service)) {
      return res.status(400).json({
        message: "Invalid service"
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

    const prefix =
      service === "General Consultation" ? "G" : "S";

    const tokenCode =
      `${prefix}-${String(tokenNumber).padStart(3, "0")}`;

    // Set price on the backend, not from the frontend
    const price =
      service === "General Consultation" ? 50 : 100;

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

    const validServices = [
      "General Consultation",
      "Specialist Consultation"
    ];

    if (!validServices.includes(service)) {
      return res.status(400).json({
        message: "Invalid service"
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

