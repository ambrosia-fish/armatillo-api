const express = require('express');
const {
  getInstances,
  getInstance,
  createInstance,
  updateInstance,
  deleteInstance
} = require('../controllers/instanceController');

const router = express.Router();

router.route('/')
  .get(getInstances)
  .post(createInstance);

router.route('/:id')
  .get(getInstance)
  .put(updateInstance)
  .delete(deleteInstance);

module.exports = router;