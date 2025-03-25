const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { logger } = require('../utils/errorHandler');

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB Connection Error', { 
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

module.exports = connectDB;
