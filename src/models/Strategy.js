const mongoose = require('mongoose');

// Sub-schemas for strategy components
const CompetingResponseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  action: { type: String },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const StimulusControlSchema = new mongoose.Schema({
  title: { type: String, required: true },
  action: { type: String },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const CommunitySupportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { type: String },
  contactInfo: { type: String },
  action: { type: String },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  frequency: { 
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  time: { type: Date },
  isActive: { type: Boolean, default: true }
}, { _id: true });

/**
 * Strategy Schema - Format for BFRB habit reversal strategies
 */
const StrategySchema = new mongoose.Schema({
  // Basic information
  name: { 
    type: String,
    trim: true
  },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  
  // Trigger or context this strategy applies to
  trigger: { type: String, required: true },
  
  // Core components - using sub-schemas
  competingResponses: [CompetingResponseSchema],
  stimulusControls: [StimulusControlSchema],
  communitySupports: [CommunitySupportSchema],
  notifications: [NotificationSchema],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // User information
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true
  }
});

// Update the updatedAt timestamp before saving
StrategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Strategy', StrategySchema);