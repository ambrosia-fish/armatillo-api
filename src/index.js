
// Session middleware for OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'armatillo_dev_session_secret_2025', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));
