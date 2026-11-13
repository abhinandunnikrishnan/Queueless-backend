
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
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
      enum: [
        "General Consultation",
        "Specialist Consultation"
      ],
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

    tokenNumber: {
      type: Number,
      required: true
    },

    tokenCode: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        "waiting",
        "serving",
        "completed",
        "cancelled",
        "skipped"
      ],
      default: "waiting"
    },

    servedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate token numbers in the same queue
bookingSchema.index(
  {
    orgId: 1,
    bookingDate: 1,
    service: 1,
    tokenNumber: 1
  },
  {
    unique: true
  }
);

const bookings = mongoose.model("bookings", bookingSchema);

module.exports = bookings;
