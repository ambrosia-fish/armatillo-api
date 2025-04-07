# Armatillo API

Backend API for Armatillo, a mobile application for tracking Body-Focused Repetitive Behaviors (BFRBs) during habit reversal training.

## About

Armatillo API provides the backend infrastructure for the Armatillo mobile application, handling user authentication, data storage, and BFRB instance tracking with secure endpoints and standardized data models.

## Project Structure

```
src/
  ├── config/              # Database and environment configuration
  ├── controllers/         # Request handlers and business logic
  │   ├── authController.js
  │   └── instanceController.js
  ├── middleware/          # Custom middleware functions
  │   └── auth.js
  ├── models/              # MongoDB schema definitions
  │   ├── Instance.js      # BFRB tracking data model
  │   ├── RefreshToken.js  # Token storage for auth
  │   └── User.js          # User account model
  ├── routes/              # API route definitions
  │   ├── admin.js
  │   ├── auth.js
  │   └── instances.js
  ├── utils/               # Helper functions
  │   ├── errorHandler.js  # Error handling utilities
  │   ├── googleOAuth.js   # Google OAuth integration
  │   └── tokenUtils.js    # JWT token management
  └── index.js             # Main application entry point
```

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key
   SESSION_SECRET=your_session_secret
   API_URL=http://localhost:5000
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
   ```
4. Start the development server: `npm run dev`

## Data Models

### Instance Model

The core data model for tracking BFRB episodes:

- `time`: When the BFRB episode occurred
- `duration`: How long the episode lasted (in seconds)
- `urgeStrength`: Intensity of the urge (numeric scale)
- `intentionType`: Whether the behavior was 'automatic' or 'intentional'
- `selectedEnvironments`: Array of environment tags
- `selectedActivities`: Array of activity tags
- `selectedEmotions`: Array of emotion tags
- `selectedThoughts`: Array of thought tags
- `selectedSensations`: Array of physical sensation tags
- `notes`: Optional text notes about the episode
- `user_id`: Reference to the user who recorded this instance

### User Model

Handles user account information:

- `email`: User's email address (unique)
- `password`: Hashed password (minimum 6 characters)
- `displayName`: User's display name
- `googleId`: Google OAuth ID (if applicable)
- `isAdmin`: Boolean flag for admin privileges
- `createdAt`: Account creation timestamp

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user with email/password
- `POST /api/auth/refresh` - Get new access token using refresh token
- `POST /api/auth/logout` - Invalidate refresh token
- `GET /api/auth/me` - Get current user profile

### OAuth Authentication

- `GET /api/auth/google-mobile?state=random_string` - Initiate Google OAuth
- `GET /api/auth/google-callback` - OAuth callback endpoint

### Development Utilities

When running in development mode (`NODE_ENV=development`):
- `GET /api/auth/dev-login` - Create development user and get tokens

### BFRB Instances

- `GET /api/instances` - Get all instances for authenticated user
- `POST /api/instances` - Create new BFRB tracking instance
- `GET /api/instances/:id` - Get instance by ID
- `PUT /api/instances/:id` - Update instance
- `DELETE /api/instances/:id` - Delete instance

### Admin Routes

- Admin endpoints available at `/api/admin/*` (requires admin privileges)

## Security Features

### Token-based Authentication

The API uses JWT (JSON Web Tokens) for authentication with two types of tokens:

- **Access Token**: Short-lived token (1 hour) used for API access
- **Refresh Token**: Long-lived token (30 days) used to obtain new access tokens

### CORS Configuration

The API implements CORS protection with configurable allowed origins via the `ALLOWED_ORIGINS` environment variable.

## Error Handling

The API returns standardized error responses with appropriate status codes and error messages:

- `invalid_token` - Token is malformed or invalid
- `token_expired` - Token has expired
- `no_token` - No authentication token provided

## Development

- Run in development mode: `npm run dev`
- Run in production mode: `npm start`
- Seed test users (if script exists): `npm run seed`
- Clear seeded data (if script exists): `npm run seed:clear`

## Dependencies

- Express.js - Web framework
- Mongoose - MongoDB ODM
- JWT - Authentication tokens
- bcryptjs - Password hashing
- cors - Cross-origin resource sharing
- dotenv - Environment configuration
- helmet - Security headers
- winston - Logging
- express-session - Session management for OAuth
- axios - HTTP client for OAuth integration
