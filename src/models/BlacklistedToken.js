// This file has been removed as part of the security simplification
// It is kept as an empty file for backward compatibility
const mongoose = require('mongoose');

// Empty schema
const BlacklistedTokenSchema = new mongoose.Schema({});

module.exports = mongoose.model('BlacklistedToken', BlacklistedTokenSchema);