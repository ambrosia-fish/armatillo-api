# Armatillo API

Backend API for the Armatillo BFRB (Body-Focused Repetitive Behavior) tracking application.

## Technologies

- TypeScript
- Express.js
- MongoDB with Mongoose
- Node.js

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with:
   ```
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/bfrb-tracker
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### BFRB Instances

- `GET /api/instances` - Get all instances
- `GET /api/instances/:id` - Get a specific instance
- `POST /api/instances` - Create a new instance
- `PUT /api/instances/:id` - Update an instance
- `DELETE /api/instances/:id` - Delete an instance

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
