const axios = require('axios');

/**
 * Exchange authorization code for Google OAuth tokens
 * @param {string} code - The authorization code from Google
 * @returns {Promise<Object>} User profile data from Google
 */
const getGoogleUserData = async (code) => {
  try {
    // Get the API URL from environment variables
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const callbackUrl = `${apiUrl}/api/auth/google-callback`;
    
    console.log('Using callback URL:', callbackUrl);
    
    // Exchange code for tokens
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

    // Use the access token to get user profile
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    // Return user data
    return {
      googleId: userInfoResponse.data.id,
      email: userInfoResponse.data.email,
      displayName: userInfoResponse.data.name || userInfoResponse.data.email.split('@')[0]
    };
  } catch (error) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Google');
  }
};

module.exports = { getGoogleUserData };
