const Instance = require('../models/Instance');
const { AppError } = require('../utils/errorHandler');

// Normalize data to handle both new and legacy formats
const normalizeInstanceData = (data) => {
  const normalized = { ...data };

  // Handle intentionType vs automatic (legacy) field
  if (normalized.intentionType && !normalized.automatic) {
    normalized.automatic = normalized.intentionType === 'automatic';
  } else if (normalized.automatic !== undefined && !normalized.intentionType) {
    normalized.intentionType = normalized.automatic ? 'automatic' : 'intentional';
  }

  // Handle selectedEmotions vs feelings (legacy) field
  if (normalized.selectedEmotions && normalized.selectedEmotions.length > 0 && !normalized.feelings) {
    normalized.feelings = normalized.selectedEmotions;
  } else if (normalized.feelings && normalized.feelings.length > 0 && !normalized.selectedEmotions) {
    normalized.selectedEmotions = normalized.feelings;
  }

  // Handle selectedEnvironments vs environment (legacy) field
  if (normalized.selectedEnvironments && normalized.selectedEnvironments.length > 0 && !normalized.environment) {
    normalized.environment = normalized.selectedEnvironments;
  } else if (normalized.environment && normalized.environment.length > 0 && !normalized.selectedEnvironments) {
    normalized.selectedEnvironments = normalized.environment;
  }

  // Handle selectedThoughts vs thoughts (legacy) field
  if (normalized.selectedThoughts && normalized.selectedThoughts.length > 0 && !normalized.thoughts) {
    // Convert array to string for legacy format
    normalized.thoughts = normalized.selectedThoughts.join(', ');
  }

  return normalized;
};

exports.getInstances = async (req, res, next) => {
  try {
    const instances = await Instance.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    
    // Map instances to ensure consistent response format
    const normalizedInstances = instances.map(instance => {
      const instanceObj = instance.toObject();
      return normalizeInstanceData(instanceObj);
    });
    
    res.status(200).json(normalizedInstances);
  } catch (error) {
    console.error('Error in getInstances:', error);
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
    
    // Normalize instance data
    const normalizedInstance = normalizeInstanceData(instance.toObject());
    
    res.status(200).json(normalizedInstance);
  } catch (error) {
    console.error('Error in getInstance:', error);
    next(new AppError('Failed to retrieve instance', 500));
  }
};

exports.createInstance = async (req, res, next) => {
  try {
    // Normalize incoming data
    const normalizedData = normalizeInstanceData(req.body);
    
    const instanceData = {
      ...normalizedData,
      user_id: req.user._id,
      userName: req.user.displayName || req.user.name || req.user.email.split('@')[0]
    };
    
    const instance = new Instance(instanceData);
    const savedInstance = await instance.save();
    
    // Return normalized response
    const normalizedResponse = normalizeInstanceData(savedInstance.toObject());
    
    res.status(201).json(normalizedResponse);
  } catch (error) {
    console.error('Error in createInstance:', error);
    next(new AppError(`Failed to create instance: ${error.message}`, 400));
  }
};

exports.updateInstance = async (req, res, next) => {
  try {
    // Normalize incoming data
    const normalizedData = normalizeInstanceData(req.body);
    
    const instance = await Instance.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user._id
      },
      normalizedData,
      { new: true, runValidators: true }
    );
    
    if (!instance) {
      return next(new AppError('Instance not found', 404));
    }
    
    // Return normalized response
    const normalizedResponse = normalizeInstanceData(instance.toObject());
    
    res.status(200).json(normalizedResponse);
  } catch (error) {
    console.error('Error in updateInstance:', error);
    next(new AppError(`Failed to update instance: ${error.message}`, 400));
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
    console.error('Error in deleteInstance:', error);
    next(new AppError('Failed to delete instance', 500));
  }
};
