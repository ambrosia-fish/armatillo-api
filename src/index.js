const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const connectDB = require('./config/db');
const instanceRoutes = require('./routes/instances');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const testUserRoutes = require('./routes/testUsers');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:19000', 
  'http://localhost:19006',
  'https://app.armatillo.com', 
  'https://dev.armatillo.com',
  'armatillo://',
  'exp://',
  'https://armatillo-app.vercel.app'
];

// Configure CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`Blocked request from disallowed origin: ${origin}`);
      return callback(null, false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// JSON Parser
app.use(express.json({ limit: '1mb' }));

// Session middleware for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'armatillo_session_secret', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test-users', testUserRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('BFRB Tracking API is running...');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});