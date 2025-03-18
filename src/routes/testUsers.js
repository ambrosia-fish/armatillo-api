const express = require('express');
const {
  checkTestUser,
  requestAccess,
  getAllTestUsers,
  updateTestUser,
  deleteTestUser
} = require('../controllers/testUserController');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/check', checkTestUser);
router.post('/request', requestAccess);

// Admin routes (protected)
router.get('/', authenticate, adminOnly, getAllTestUsers);
router.put('/:id', authenticate, adminOnly, updateTestUser);
router.delete('/:id', authenticate, adminOnly, deleteTestUser);

module.exports = router;
