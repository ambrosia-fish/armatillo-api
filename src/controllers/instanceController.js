const Instance = require('../models/Instance');
const { AppError } = require('../utils/errorHandler');

exports.getInstances = async (req, res, next) => {
  try {
    const instances = await Instance.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(instances);
  } catch (error) {
    next(new AppError('Failed to retrieve instances', 500));
  }
};

exports.getInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!instance) {
      return next(new AppError('Instance not found', 404));
    }
    
    res.status(200).json(instance);
  } catch (error) {
    next(new AppError('Failed to retrieve instance', 500));
  }
};

exports.createInstance = async (req, res, next) => {
  try {
    const instanceData = {
      ...req.body,
      user_id: req.user._id,
      userName: req.user.displayName || req.user.name || req.user.email.split('@')[0]
    };
    
    const instance = new Instance(instanceData);
    const savedInstance = await instance.save();
    
    res.status(201).json(savedInstance);
  } catch (error) {
    next(new AppError('Failed to create instance', 400));
  }
};

exports.updateInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user._id
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!instance) {
      return next(new AppError('Instance not found', 404));
    }
    
    res.status(200).json(instance);
  } catch (error) {
    next(new AppError('Failed to update instance', 400));
  }
};

exports.deleteInstance = async (req, res, next) => {
  try {
    const instance = await Instance.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!instance) {
      return next(new AppError('Instance not found', 404));
    }
    
    res.status(200).json({ message: 'Instance deleted successfully' });
  } catch (error) {
    next(new AppError('Failed to delete instance', 500));
  }
};
