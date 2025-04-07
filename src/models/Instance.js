const mongoose = require('mongoose');

/**
 * Instance Schema - Standardized format for BFRB tracking data
 */
const InstanceSchema = new mongoose.Schema({
  // Timestamp fields
  time: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },

  // Core tracking fields
  duration: { type: Number, required: true }, 
  urgeStrength: { type: Number, required: true },
  intentionType: { 
    type: String, 
    enum: ['automatic', 'intentional'],
    required: true 
  },
  
  // Selected categories (arrays of option IDs)
  selectedEnvironments: { type: [String], default: [] },
  selectedActivities: { type: [String], default: [] },
  selectedEmotions: { type: [String], default: [] },
  selectedThoughts: { type: [String], default: [] },
  selectedSensations: { type: [String], default: [] },
  
  // Additional fields
  notes: { type: String },
  
  // User information
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true
  }
});

// Add a pre-save hook to ensure proper format
InstanceSchema.pre('save', function(next) {
  // If intentionType doesn't exist, but automatic does, convert it
  if (!this.intentionType && this.automatic !== undefined) {
    this.intentionType = this.automatic ? 'automatic' : 'intentional';
  }
  
  // If time doesn't exist, use createdAt
  if (!this.time) {
    this.time = this.createdAt;
  }
  
  // Always make sure createdAt is set
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  
  next();
});

// Add a virtual field for automatic (for backward compatibility)
InstanceSchema.virtual('automatic').get(function() {
  return this.intentionType === 'automatic';
});

module.exports = mongoose.model('Instance', InstanceSchema);