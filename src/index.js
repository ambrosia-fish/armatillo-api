const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const connectDB = require('./config/db');
const instanceRoutes = require('./routes/instances');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const strategyRoutes = require('./routes/strategies');
const { errorHandler } = require('./utils/errorHandler');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Get allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];

// Apply CORS with specific configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Still allow for now, but log it
    }
  },
  credentials: true
}));

// Log origins for debugging
console.log('CORS configured with allowed origins:', allowedOrigins);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// JSON Parser
app.use(express.json({ limit: '1mb' }));

// Session middleware for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false
}));

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/strategies', strategyRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('BFRB Tracking API is running...');
});

// Global error handler
app.use(errorHandler.globalErrorMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});