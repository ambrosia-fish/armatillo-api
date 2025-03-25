const axios = require('axios');
const { logger } = require('./errorHandler');

/**
 * Exchange authorization code for Google OAuth tokens
 * @param {string} code - The authorization code from Google
 * @returns {Promise<Object>} User profile data from Google
 */
const getGoogleUserData = async (code) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const callbackUrl = `${apiUrl}/api/auth/google-callback`;
    
    logger.info('Using Google OAuth callback URL', { callbackUrl });
    
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    return {
      googleId: userInfoResponse.data.id,
      email: userInfoResponse.data.email,
      displayName: userInfoResponse.data.name || userInfoResponse.data.email.split('@')[0]
    };
  } catch (error) {
    logger.error('Google OAuth Authentication Error', {
      message: error.response?.data || error.message,
      stack: error.stack
    });
    throw new Error('Failed to authenticate with Google');
  }
};

module.exports = { getGoogleUserData };
