const Instance = require('../models/Instance');
const { AppError } = require('../utils/errorHandler');

// Normalize data to standardized format
const normalizeInstanceData = (data) => {
  const normalized = { ...data };

  // Set intentionType if it doesn't exist
  if (!normalized.intentionType) {
    if (normalized.automatic !== undefined) {
      normalized.intentionType = normalized.automatic ? 'automatic' : 'intentional';
    } else {
      normalized.intentionType = 'automatic'; // Default value
    }
    
    // Remove legacy field
    delete normalized.automatic;
  }

  // Set time if it doesn't exist
  if (!normalized.time && normalized.createdAt) {
    normalized.time = normalized.createdAt;
  }
  
  // Handle legacy emotion/feeling fields
  if (!normalized.selectedEmotions && normalized.feelings) {
    normalized.selectedEmotions = normalized.feelings;
    delete normalized.feelings;
  }
  
  // Handle legacy environment fields
  if (!normalized.selectedEnvironments && normalized.environment) {
    normalized.selectedEnvironments = normalized.environment;
    delete normalized.environment;
  }
  
  // Handle legacy thoughts field
  if (!normalized.selectedThoughts && normalized.thoughts) {
    // Convert string to array
    if (typeof normalized.thoughts === 'string') {
      normalized.selectedThoughts = [normalized.thoughts];
    }
    delete normalized.thoughts;
  }
  
  // Ensure duration is always present
  if (normalized.duration === undefined) {
    normalized.duration = 5; // Default value
  }

  return normalized;
};

exports.getInstances = async (req, res, next) => {
  try {
    const instances = await Instance.find({ user_id: req.user._id }).sort({ time: -1 });
    
    // Convert to standard format and return
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
    
    // Normalize to standard format
    const normalizedInstance = normalizeInstanceData(instance.toObject());
    
    res.status(200).json(normalizedInstance);
  } catch (error) {
    console.error('Error in getInstance:', error);
    next(new AppError('Failed to retrieve instance', 500));
  }
};

exports.createInstance = async (req, res, next) => {
  try {
    // Normalize incoming data to standardized format
    const normalizedData = normalizeInstanceData(req.body);
    
    // Add user data
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
    // Normalize incoming data to standardized format
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