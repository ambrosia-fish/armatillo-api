const express = require('express');
const router = express.Router();
const TestUser = require('../models/TestUser');
const { authenticate, adminOnly } = require('../middleware/auth');

// Get all test users
router.get('/test-users', authenticate, adminOnly, async (req, res) => {
  try {
    const testUsers = await TestUser.find().sort({ createdAt: -1 });
    res.json(testUsers);
  } catch (error) {
    console.error('Error fetching test users:', error);
    res.status(500).json({ error: 'Failed to fetch test users' });
  }
});

// Approve a test user
router.post('/test-users/:id/approve', authenticate, adminOnly, async (req, res) => {
  try {
    const testUser = await TestUser.findById(req.params.id);
    
    if (!testUser) {
      return res.status(404).json({ error: 'Test user not found' });
    }
    
    testUser.status = 'approved';
    testUser.notes = `${testUser.notes || ''}\nApproved by admin ${req.user.email} on ${new Date().toISOString()}`;
    await testUser.save();
    
    res.json(testUser);
  } catch (error) {
    console.error('Error approving test user:', error);
    res.status(500).json({ error: 'Failed to approve test user' });
  }
});

// Reject a test user
router.post('/test-users/:id/reject', authenticate, adminOnly, async (req, res) => {
  try {
    const testUser = await TestUser.findById(req.params.id);
    
    if (!testUser) {
      return res.status(404).json({ error: 'Test user not found' });
    }
    
    testUser.status = 'rejected';
    testUser.notes = `${testUser.notes || ''}\nRejected by admin ${req.user.email} on ${new Date().toISOString()}`;
    await testUser.save();
    
    res.json(testUser);
  } catch (error) {
    console.error('Error rejecting test user:', error);
    res.status(500).json({ error: 'Failed to reject test user' });
  }
});

// Add a new test user
router.post('/test-users', authenticate, adminOnly, async (req, res) => {
  try {
    const { email, status, notes, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const existingUser = await TestUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Test user already exists' });
    }
    
    // Create test user
    const testUser = await TestUser.create({
      email,
      status: status || 'approved',
      name: name || '',
      notes: notes || `Added by admin ${req.user.email}`
    });
    
    res.status(201).json(testUser);
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
});

module.exports = router;
