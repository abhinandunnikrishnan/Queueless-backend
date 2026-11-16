const mongoose = require("mongoose");

const pendingBookingSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true
    },

    username: {
      type: String,
      required: true
    },

    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orgs",
      required: true
    },

    orgName: {
      type: String,
      required: true
    },

    orgAddress: {
      type: String,
      default: ""
    },

    service: {
      type: String,
      required: true
    },

    bookingDate: {
      type: String,
      required: true
    },

    timeSlot: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    stripeSessionId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const pendingBookings = mongoose.model(
  "pendingBookings",
  pendingBookingSchema
);

module.exports = pendingBookings;