const Strategy = require('../models/Strategy');
const { AppError } = require('../utils/errorHandler');

// Helper function to normalize data if needed
const normalizeStrategyData = (data) => {
  const normalized = { ...data };
  
  // Ensure arrays are initialized
  if (!normalized.competingResponses) normalized.competingResponses = [];
  if (!normalized.stimulusControls) normalized.stimulusControls = [];
  if (!normalized.communitySupports) normalized.communitySupports = [];
  if (!normalized.notifications) normalized.notifications = [];
  
  // Convert legacy field names if present (for backward compatibility)
  normalized.competingResponses = normalized.competingResponses.map(response => {
    const normalizedResponse = { ...response };
    
    // Handle legacy field names
    if (response.description && !response.title) {
      normalizedResponse.title = response.description;
      delete normalizedResponse.description;
    }
    
    if (response.notes && !response.action) {
      normalizedResponse.action = response.notes;
      delete normalizedResponse.notes;
    }
    
    return normalizedResponse;
  });
  
  normalized.stimulusControls = normalized.stimulusControls.map(control => {
    const normalizedControl = { ...control };
    
    // Handle legacy field names
    if (control.description && !control.title) {
      normalizedControl.title = control.description;
      delete normalizedControl.description;
    }
    
    if (control.notes && !control.action) {
      normalizedControl.action = control.notes;
      delete normalizedControl.notes;
    }
    
    return normalizedControl;
  });
  
  normalized.communitySupports = normalized.communitySupports.map(support => {
    const normalizedSupport = { ...support };
    
    // Handle legacy field names for community supports
    if (support.notes && !support.action) {
      normalizedSupport.action = support.notes;
      delete normalizedSupport.notes;
    }
    
    return normalizedSupport;
  });
  
  return normalized;
};

exports.getStrategies = async (req, res, next) => {
  try {
    const strategies = await Strategy.find({ user_id: req.user._id }).sort({ updatedAt: -1 });
    
    // Convert to standard format and return
    const normalizedStrategies = strategies.map(strategy => {
      const strategyObj = strategy.toObject();
      return normalizeStrategyData(strategyObj);
    });
    
    res.status(200).json(normalizedStrategies);
  } catch (error) {
    console.error('Error in getStrategies:', error);
    next(new AppError('Failed to retrieve strategies', 500));
  }
};

exports.getStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!strategy) {
      return next(new AppError('Strategy not found', 404));
    }
    
    // Normalize to standard format
    const normalizedStrategy = normalizeStrategyData(strategy.toObject());
    
    res.status(200).json(normalizedStrategy);
  } catch (error) {
    console.error('Error in getStrategy:', error);
    next(new AppError('Failed to retrieve strategy', 500));
  }
};

exports.createStrategy = async (req, res, next) => {
  try {
    // Check for required field trigger
    if (!req.body.trigger) {
      return next(new AppError('Trigger is required', 400));
    }
    
    // Normalize incoming data
    const normalizedData = normalizeStrategyData(req.body);
    
    // If name is not provided, set it to the trigger value
    if (!normalizedData.name || !normalizedData.name.trim()) {
      normalizedData.name = normalizedData.trigger;
    }
    
    // Add user data
    const strategyData = {
      ...normalizedData,
      user_id: req.user._id
    };
    
    const strategy = new Strategy(strategyData);
    const savedStrategy = await strategy.save();
    
    // Return normalized response
    const normalizedResponse = normalizeStrategyData(savedStrategy.toObject());
    
    res.status(201).json(normalizedResponse);
  } catch (error) {
    console.error('Error in createStrategy:', error);
    next(new AppError(`Failed to create strategy: ${error.message}`, 400));
  }
};

exports.updateStrategy = async (req, res, next) => {
  try {
    // Normalize incoming data
    const normalizedData = normalizeStrategyData(req.body);
    
    // If name is not provided but trigger is, set name to trigger
    if ((!normalizedData.name || !normalizedData.name.trim()) && normalizedData.trigger) {
      normalizedData.name = normalizedData.trigger;
    }
    
    // Ensure updatedAt is set
    normalizedData.updatedAt = Date.now();
    
    const strategy = await Strategy.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user._id
      },
      normalizedData,
      { new: true, runValidators: true }
    );
    
    if (!strategy) {
      return next(new AppError('Strategy not found', 404));
    }
    
    // Return normalized response
    const normalizedResponse = normalizeStrategyData(strategy.toObject());
    
    res.status(200).json(normalizedResponse);
  } catch (error) {
    console.error('Error in updateStrategy:', error);
    next(new AppError(`Failed to update strategy: ${error.message}`, 400));
  }
};

exports.deleteStrategy = async (req, res, next) => {
  try {
    const strategy = await Strategy.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!strategy) {
      return next(new AppError('Strategy not found', 404));
    }
    
    res.status(200).json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error in deleteStrategy:', error);
    next(new AppError('Failed to delete strategy', 500));
  }
};

// Additional endpoints for specific operations

// Get strategies by trigger
exports.getStrategiesByTrigger = async (req, res, next) => {
  try {
    const { trigger } = req.params;
    
    const strategies = await Strategy.find({ 
      user_id: req.user._id,
      trigger: trigger 
    }).sort({ updatedAt: -1 });
    
    const normalizedStrategies = strategies.map(strategy => {
      return normalizeStrategyData(strategy.toObject());
    });
    
    res.status(200).json(normalizedStrategies);
  } catch (error) {
    console.error('Error in getStrategiesByTrigger:', error);
    next(new AppError('Failed to retrieve strategies by trigger', 500));
  }
};

// Toggle strategy active status
exports.toggleStrategyStatus = async (req, res, next) => {
  try {
    const strategy = await Strategy.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!strategy) {
      return next(new AppError('Strategy not found', 404));
    }
    
    strategy.isActive = !strategy.isActive;
    strategy.updatedAt = Date.now();
    
    await strategy.save();
    
    res.status(200).json(normalizeStrategyData(strategy.toObject()));
  } catch (error) {
    console.error('Error in toggleStrategyStatus:', error);
    next(new AppError('Failed to toggle strategy status', 500));
  }
};

// Increment strategy use count
exports.incrementUseCount = async (req, res, next) => {
  try {
    const strategy = await Strategy.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.user._id
      },
      { 
        $inc: { useCount: 1 },
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    );
    
    if (!strategy) {
      return next(new AppError('Strategy not found', 404));
    }
    
    // Return normalized response
    const normalizedResponse = normalizeStrategyData(strategy.toObject());
    
    res.status(200).json(normalizedResponse);
  } catch (error) {
    console.error('Error in incrementUseCount:', error);
    next(new AppError('Failed to increment strategy use count', 500));
  }
};