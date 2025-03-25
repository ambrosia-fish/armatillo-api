const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config();

// Create a logger if not already created in errorHandler
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log' })
  ]
});

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
