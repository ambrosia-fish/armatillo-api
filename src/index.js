const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const instanceRoutes = require('./routes/instances');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { authErrorHandler } = require('./middleware/auth');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000', 'http://localhost:19000', 'http://localhost:19006'];

// Add production origins if in production
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(
    'https://app.armatillo.com', 
    'armatillo://',
    'exp://',
    'https://armatillo-app.vercel.app'
  );
}

// For development, log all CORS requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from origin: ${req.headers.origin}`);
  next();
});

// Use a more permissive CORS policy for debugging
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for now to debug connection issues
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

// Apply rate limiting to auth routes
app.use('/api/auth', authLimiter);

// JSON Parser with size limit
app.use(express.json({ limit: '1mb' }));

// Session middleware for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret', 
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

// Auth error handling middleware
app.use(authErrorHandler);

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
