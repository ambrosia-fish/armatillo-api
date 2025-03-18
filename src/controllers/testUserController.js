const TestUser = require('../models/TestUser');

// Check if a user is an approved test user
exports.checkTestUser = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        approved: false
      });
    }
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user by email
    const testUser = await TestUser.findOne({ email: normalizedEmail });
    
    if (!testUser) {
      // User not found - record as a pending user
      const pendingUser = new TestUser({
        email: normalizedEmail,
        status: 'pending',
        notes: 'Auto-created during login attempt'
      });
      
      await pendingUser.save();
      
      return res.status(200).json({
        approved: false,
        status: 'pending',
        message: 'Your access request has been recorded. Please contact josef@feztech.io for access.'
      });
    }
    
    // Check if user is approved
    if (testUser.status === 'approved') {
      return res.status(200).json({
        approved: true,
        status: 'approved'
      });
    } else {
      return res.status(200).json({
        approved: false,
        status: testUser.status,
        message: testUser.status === 'rejected' 
          ? 'Your access request has been declined.'
          : 'Your access request is pending approval. Please contact josef@feztech.io for access.'
      });
    }
  } catch (error) {
    console.error('Error checking test user:', error);
    res.status(500).json({ 
      error: 'Error checking test user status',
      approved: false
    });
  }
};

// Request test user access (for users who want to explicitly request access)
exports.requestAccess = async (req, res) => {
  try {
    const { email, name, notes } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists
    let testUser = await TestUser.findOne({ email: normalizedEmail });
    
    if (testUser) {
      // Update existing user if status is not already approved
      if (testUser.status !== 'approved') {
        testUser.status = 'pending';
        testUser.name = name || testUser.name;
        testUser.notes = notes || testUser.notes;
        testUser.updatedAt = Date.now();
        
        await testUser.save();
      }
    } else {
      // Create new test user
      testUser = new TestUser({
        email: normalizedEmail,
        name,
        notes,
        status: 'pending'
      });
      
      await testUser.save();
    }
    
    res.status(200).json({ 
      message: 'Access request submitted successfully',
      status: 'pending' 
    });
  } catch (error) {
    console.error('Error requesting test access:', error);
    res.status(500).json({ error: 'Error processing access request' });
  }
};

// Admin endpoints (protected by admin middleware)

// Get all test users
exports.getAllTestUsers = async (req, res) => {
  try {
    const testUsers = await TestUser.find().sort({ createdAt: -1 });
    res.status(200).json(testUsers);
  } catch (error) {
    console.error('Error fetching test users:', error);
    res.status(500).json({ error: 'Error fetching test users' });
  }
};

// Update test user status
exports.updateTestUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const testUser = await TestUser.findByIdAndUpdate(
      id,
      { 
        status, 
        notes,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!testUser) {
      return res.status(404).json({ error: 'Test user not found' });
    }
    
    res.status(200).json(testUser);
  } catch (error) {
    console.error('Error updating test user:', error);
    res.status(500).json({ error: 'Error updating test user' });
  }
};

// Delete test user
exports.deleteTestUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testUser = await TestUser.findByIdAndDelete(id);
    
    if (!testUser) {
      return res.status(404).json({ error: 'Test user not found' });
    }
    
    res.status(200).json({ message: 'Test user deleted successfully' });
  } catch (error) {
    console.error('Error deleting test user:', error);
    res.status(500).json({ error: 'Error deleting test user' });
  }
};
