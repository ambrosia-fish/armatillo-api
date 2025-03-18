
/**
 * Get the API URL based on environment
 * @returns {string} The API URL
 */
const getApiUrl = () => {
  // For Railway development deployment
  if (process.env.RAILWAY_STATIC_URL && process.env.NODE_ENV === 'development') {
    return 'https://armatillo-api-development.up.railway.app';
  }
  
  // For Railway production deployment
  if (process.env.RAILWAY_STATIC_URL) {
    return 'https://armatillo-api-production.up.railway.app';
  }
  
  // For local development or custom domain
  return process.env.API_URL || 'http://localhost:3000';
};

