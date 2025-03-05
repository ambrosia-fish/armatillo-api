const Instance = require('../models/Instance');

// Get all instances
exports.getInstances = async (req, res) => {
  try {
    const instances = await Instance.find().sort({ createdAt: -1 });
    res.status(200).json(instances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single instance
exports.getInstance = async (req, res) => {
  try {
    const instance = await Instance.findById(req.params.id);
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
    const instance = new Instance(req.body);
    const savedInstance = await instance.save();
    res.status(201).json(savedInstance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an instance
exports.updateInstance = async (req, res) => {
  try {
    const instance = await Instance.findByIdAndUpdate(
      req.params.id,
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

// Delete an instance
exports.deleteInstance = async (req, res) => {
  try {
    const instance = await Instance.findByIdAndDelete(req.params.id);
    if (!instance) {
      res.status(404).json({ message: 'Instance not found' });
      return;
    }
    res.status(200).json({ message: 'Instance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};