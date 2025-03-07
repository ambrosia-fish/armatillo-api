const mongoose = require('mongoose');

/**
 * BlacklistedToken schema for storing tokens that are no longer valid
 * Used for token revocation, particularly in security incidents
 */
const BlacklistedTokenSchema = new mongoose.Schema({
  // Store token fingerprint (SHA-256 hash) instead of the actual token
  tokenFingerprint: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  
  // Type of token that was blacklisted
  tokenType: {
    type: String,
    enum: ['access', 'refresh', 'auth_code'],
    required: true
  },
  
  // User ID associated with the token, if known
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  
  // Reason for blacklisting (security incident, logout, etc.)
  reason: { 
    type: String,
    required: true
  },
  
  // IP address that initiated the blacklisting (if available)
  ipAddress: {
    type: String
  },
  
  // Device info when available
  deviceInfo: {
    type: String
  },
  
  // When the token was blacklisted
  blacklistedAt: { 
    type: Date, 
    default: Date.now, 
    index: true
  },
  
  // Optional expiry for cleanup purposes (can be set to token's original expiry)
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
