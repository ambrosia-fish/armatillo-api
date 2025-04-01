const Instance = require('../models/Instance');

/**
 * Get all user instances
 */
const getInstances = async (req, res, next) => {
  try {
    const instances = await Instance.find({ user_id: req.user._id })
      .sort({ time: -1 });
    
    res.json(instances);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single instance by ID
 */
const getInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    res.json(instance);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new instance
 */
const createInstance = async (req, res, next) => {
  try {
    const instanceData = {
      ...req.body,
      user_id: req.user._id,
      userName: req.user.displayName
    };
    
    const instance = await Instance.create(instanceData);
    res.status(201).json(instance);
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing instance
 */
const updateInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    res.json(instance);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete instance
 */
const deleteInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    res.status(200).json({ message: 'Instance deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstances,
  getInstance,
  createInstance,
  updateInstance,
  deleteInstance
};