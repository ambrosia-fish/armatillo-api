# Armatillo API

Backend API for Armatillo BFRB (Body-Focused Repetitive Behavior) tracking app.

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
   ```
4. Start the development server: `npm run dev`

## Security Features

### Token-based Authentication

The API uses JWT (JSON Web Tokens) for authentication with two types of tokens:

- **Access Token**: Short-lived token (1 hour) used for API access
- **Refresh Token**: Long-lived token (30 days) used to obtain new access tokens

### Token Endpoints

- `POST /api/auth/register` - Register a new user and get tokens
- `POST /api/auth/login` - Authenticate user and get tokens
- `POST /api/auth/refresh` - Use refresh token to get a new access token
- `POST /api/auth/logout` - Invalidate refresh token (requires authentication)
- `GET /api/auth/me` - Get current user info (requires authentication)

### OAuth Authentication

OAuth support for mobile apps with CSRF protection:

- `GET /api/auth/google-mobile?state=random_string` - Initiate Google OAuth
- `GET /api/auth/google-callback` - OAuth callback endpoint

The state parameter is used to prevent CSRF attacks during OAuth flow.

### Development Authentication Bypass

A special development-only endpoint is available when running with `NODE_ENV=development`:

- `GET /api/auth/dev-login` - Automatically creates a development user and returns valid tokens

This endpoint is designed to work with the Armatillo app's development OAuth bypass feature, allowing developers to skip the OAuth login process during local development. It:

1. Checks if a development user exists (email: `dev@example.com`)
2. Creates this user if it doesn't exist
3. Generates standard access and refresh tokens
4. Returns the tokens in the same format as the regular login endpoints

This endpoint is automatically disabled in production environments.

## API Endpoints

### Instances

- `GET /api/instances` - Get all instances
- `POST /api/instances` - Create new instance
- `GET /api/instances/:id` - Get instance by ID
- `PUT /api/instances/:id` - Update instance
- `DELETE /api/instances/:id` - Delete instance

## Error Handling

The API returns standardized error responses with appropriate status codes and error messages. Authentication errors include specific error codes:

- `invalid_token` - Token is malformed or invalid
- `token_expired` - Token has expired
- `no_token` - No authentication token provided

## Development

- Run in development mode: `npm run dev`
- Run in production mode: `npm start`
