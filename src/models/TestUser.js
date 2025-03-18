const mongoose = require('mongoose');

const TestUserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['approved', 'pending', 'rejected'], 
    default: 'pending' 
  },
  name: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
TestUserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TestUser', TestUserSchema);
