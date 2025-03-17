/**
 * Script to seed test users for development
 * 
 * Run with: node src/scripts/seedTestUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TestUser = require('../models/TestUser');

// Test users to seed
const testUsers = [
  {
    email: 'approved1@example.com',
    approved: true,
    notes: 'Seeded approved test user'
  },
  {
    email: 'approved2@example.com',
    approved: true,
    notes: 'Seeded approved test user'
  },
  {
    email: 'pending1@example.com',
    approved: false,
    notes: 'Seeded pending test user'
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function seedTestUsers() {
  try {
    // Clear existing test users if needed
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('Clearing existing test users...');
      await TestUser.deleteMany({});
      console.log('Existing test users cleared');
    }

    // Insert test users
    console.log('Seeding test users...');
    const promises = testUsers.map(async user => {
      // Check if user already exists
      const existingUser = await TestUser.findOne({ email: user.email });
      if (existingUser) {
        console.log(`User ${user.email} already exists, updating...`);
        existingUser.approved = user.approved;
        existingUser.notes = user.notes;
        return existingUser.save();
      } else {
        console.log(`Creating new test user: ${user.email}`);
        return TestUser.create(user);
      }
    });

    await Promise.all(promises);
    console.log('Test users seeded successfully');
    
    // Print all test users
    const allUsers = await TestUser.find({});
    console.log('\nCurrent test users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.approved ? 'Approved' : 'Pending'})`);
    });

    mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error seeding test users:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seedTestUsers();
