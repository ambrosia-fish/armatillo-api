const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const connectDB = require('./config/db');
const instanceRoutes = require('./routes/instances');
const authRoutes = require('./routes/auth');
const { authErrorHandler } = require('./middleware/auth');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Session middleware for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret', 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/auth', authRoutes);

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
