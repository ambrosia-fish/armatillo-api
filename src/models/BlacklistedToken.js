const mongoose = require('mongoose');

/**
 * This model is no longer in use - retained for backward compatibility
 * A simplified model without the full security features
 */
const BlacklistedTokenSchema = new mongoose.Schema({
  tokenFingerprint: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  
  // When the token was blacklisted
  blacklistedAt: { 
    type: Date, 
    default: Date.now, 
    index: true
  },
  
  // Optional expiry for cleanup purposes
  expiresAt: {
    type: Date,
    default: function() {
      // Default to 90 days from now
      const now = new Date();
      return new Date(now.setDate(now.getDate() + 90));
    },
    index: true
  }
});

// Add index on expiry date for cleanup operations
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BlacklistedToken', BlacklistedTokenSchema);