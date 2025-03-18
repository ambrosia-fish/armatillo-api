const express = require('express');
const {
  getInstances,
  getInstance,
  createInstance,
  updateInstance,
  deleteInstance
} = require('../controllers/instanceController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all instance routes
router.use(authenticate);

router.route('/')
  .get(getInstances)
  .post(createInstance);

router.route('/:id')
  .get(getInstance)
  .put(updateInstance)
  .delete(deleteInstance);

module.exports = router;