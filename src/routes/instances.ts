import express from 'express';
import {
  getInstances,
  getInstance,
  createInstance,
  updateInstance,
  deleteInstance
} from '../controllers/instanceController';

const router = express.Router();

router.route('/')
  .get(getInstances)
  .post(createInstance);

router.route('/:id')
  .get(getInstance)
  .put(updateInstance)
  .delete(deleteInstance);

export default router;