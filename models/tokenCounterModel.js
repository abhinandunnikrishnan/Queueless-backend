
const mongoose = require("mongoose");

const tokenCounterSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "orgs",
    required: true
  },

  bookingDate: {
    type: String,
    required: true
  },

  service: {
    type: String,
    required: true
  },

  lastToken: {
    type: Number,
    default: 0
  }
});

// One counter for each organization, date and service
tokenCounterSchema.index(
  {
    orgId: 1,
    bookingDate: 1,
    service: 1
  },
  {
    unique: true
  }
);

const tokenCounters = mongoose.model(
  "tokenCounters",
  tokenCounterSchema
);

module.exports = tokenCounters;
