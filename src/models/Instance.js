const mongoose = require('mongoose');

const InstanceSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  duration: { type: Number, required: true },
  urgeStrength: { type: Number },
  intentionType: { type: String },
  selectedEnvironments: { type: [String] },
  selectedEmotions: { type: [String] },
  selectedSensations: { type: [String] },
  selectedThoughts: { type: [String] },
  notes: { type: String },
  userId: { type: String },
  userEmail: { type: String },
  userName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Instance', InstanceSchema);