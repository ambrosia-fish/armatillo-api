const express = require('express');
const {
  getStrategies,
  getStrategy,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  getStrategiesByTrigger,
  toggleStrategyStatus
} = require('../controllers/strategyController');
const { authenticate, approvedOnly } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all strategy routes
router.use(authenticate);

// Apply approvedOnly middleware to all strategy routes
router.use(approvedOnly);

// Main CRUD routes
router.route('/')
  .get(getStrategies)
  .post(createStrategy);

router.route('/:id')
  .get(getStrategy)
  .put(updateStrategy)
  .delete(deleteStrategy);

// Additional specific routes
router.route('/trigger/:trigger')
  .get(getStrategiesByTrigger);

router.route('/:id/toggle-status')
  .put(toggleStrategyStatus);

module.exports = router;