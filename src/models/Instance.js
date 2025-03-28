const mongoose = require('mongoose');

const InstanceSchema = new mongoose.Schema({
  // Primary fields
  time: { type: Date, required: true },
  duration: { type: Number, required: true },
  urgeStrength: { type: Number },
  intentionType: { type: String, enum: ['automatic', 'intentional'] },
  
  // Selected categories (arrays of strings)
  selectedEnvironments: { type: [String] },
  selectedEmotions: { type: [String] },
  selectedSensations: { type: [String] },
  selectedThoughts: { type: [String] },
  selectedSensoryTriggers: { type: [String] },
  
  // Detailed notes for categories
  mentalDetails: { type: String },
  physicalDetails: { type: String },
  thoughtDetails: { type: String },
  environmentDetails: { type: String },
  sensoryDetails: { type: String },
  
  // Additional notes
  notes: { type: String },
  
  // User information
  userName: { type: String },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true
  },
  
  // Legacy fields for backward compatibility
  automatic: { type: Boolean },
  location: { type: String },
  activity: { type: String },
  feelings: { type: [String] },
  environment: { type: [String] },
  thoughts: { type: String },
  
  // Metadata
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Instance', InstanceSchema);
