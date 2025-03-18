const Instance = require('../models/Instance');

// Get all instances for the logged-in user
exports.getInstances = async (req, res) => {
  try {
    // Find instances associated with the current user using the proper ObjectId reference
    const instances = await Instance.find({
      $or: [
        { user_id: req.user._id },  // Primary method using direct ObjectId reference
        { userId: req.user._id.toString() },  // Legacy support
        { userEmail: req.user.email }  // Secondary method using email
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json(instances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single instance (only if it belongs to the logged-in user)
exports.getInstance = async (req, res) => {
  try {
    const instance = await Instance.findOne({
      _id: req.params.id,
      $or: [
        { user_id: req.user._id },  // Primary method using direct ObjectId reference
        { userId: req.user._id.toString() },  // Legacy support
        { userEmail: req.user.email }  // Secondary method using email
      ]
    });
    
    if (!instance) {
      res.status(404).json({ message: 'Instance not found' });
      return;
    }
    
    res.status(200).json(instance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create an instance
exports.createInstance = async (req, res) => {
  try {
    // Create a new instance with the user information from the authenticated user
    const instanceData = {
      ...req.body,
      user_id: req.user._id,  // Store direct MongoDB ObjectId reference
      userId: req.user._id.toString(),  // Legacy: Store as string for backward compatibility
      userEmail: req.user.email,
      userName: req.user.displayName || req.user.name || req.user.email.split('@')[0]
    };
    
    const instance = new Instance(instanceData);
    const savedInstance = await instance.save();
    
    res.status(201).json(savedInstance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an instance (only if it belongs to the logged-in user)
exports.updateInstance = async (req, res) => {
  try {
    // Find and update instance, but only if it belongs to the current user
    const instance = await Instance.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { user_id: req.user._id },  // Primary method using direct ObjectId reference
          { userId: req.user._id.toString() },  // Legacy support
          { userEmail: req.user.email }  // Secondary method using email
        ]
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!instance) {
      res.status(404).json({ message: 'Instance not found' });
      return;
    }
    
    res.status(200).json(instance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an instance (only if it belongs to the logged-in user)
exports.deleteInstance = async (req, res) => {
  try {
    // Delete instance, but only if it belongs to the current user
    const instance = await Instance.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { user_id: req.user._id },  // Primary method using direct ObjectId reference
        { userId: req.user._id.toString() },  // Legacy support
        { userEmail: req.user.email }  // Secondary method using email
      ]
    });
    
    if (!instance) {
      res.status(404).json({ message: 'Instance not found' });
      return;
    }
    
    res.status(200).json({ message: 'Instance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};