const crypto = require('crypto');

/**
 * Verify PKCE code challenge against code verifier
 * @param {string} codeVerifier - The original code verifier from client
 * @param {string} codeChallenge - The code challenge that was sent initially
 * @param {string} codeChallengeMethod - The method used (S256 or plain)
 * @returns {boolean} True if challenge verification passes
 */
const verifyPKCEChallenge = (codeVerifier, codeChallenge, codeChallengeMethod = 'S256') => {
  // If no code challenge method is provided, assume S256
  if (!codeChallengeMethod || codeChallengeMethod === 'plain') {
    // Plain method - just compare directly
    return codeVerifier === codeChallenge;
  }
  
  if (codeChallengeMethod === 'S256') {
    // Calculate the challenge from the verifier using SHA256
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64');
    
    // Base64URL encoding: replace + with -, / with _, and remove =
    const calculatedChallenge = hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return calculatedChallenge === codeChallenge;
  }
  
  // Unknown method
  throw new Error(`Unsupported code challenge method: ${codeChallengeMethod}`);
};

/**
 * Store code challenge information in the session
 * @param {object} req - Express request object
 * @param {string} codeChallenge - Code challenge from the client
 * @param {string} codeChallengeMethod - Method used to generate the challenge
 */
const storeCodeChallenge = (req, codeChallenge, codeChallengeMethod) => {
  if (!req.session) {
    throw new Error('Session middleware must be configured to use PKCE');
  }
  
  // Store in session for later verification
  req.session.pkce = {
    codeChallenge,
    codeChallengeMethod: codeChallengeMethod || 'S256',
    createdAt: Date.now()
  };
};

/**
 * Retrieve stored code challenge information from the session
 * @param {object} req - Express request object
 * @returns {object|null} Code challenge info or null if not found
 */
const getStoredCodeChallenge = (req) => {
  if (!req.session || !req.session.pkce) {
    return null;
  }
  
  // Check if the challenge has expired (10 minutes max)
  const MAX_AGE = 10 * 60 * 1000; // 10 minutes in milliseconds
  if (Date.now() - req.session.pkce.createdAt > MAX_AGE) {
    // Expired, clear it and return null
    req.session.pkce = null;
    return null;
  }
  
  return req.session.pkce;
};

/**
 * Clear stored code challenge information from the session
 * @param {object} req - Express request object
 */
const clearCodeChallenge = (req) => {
  if (req.session && req.session.pkce) {
    req.session.pkce = null;
  }
};

module.exports = {
  verifyPKCEChallenge,
  storeCodeChallenge,
  getStoredCodeChallenge,
  clearCodeChallenge
};
