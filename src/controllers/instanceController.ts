import { Request, Response } from 'express';
import Instance, { IInstance } from '../models/Instance';

// Get all instances
export const getInstances = async (req: Request, res: Response): Promise<void> => {
  try {
    const instances = await Instance.find().sort({ createdAt: -1 });
    res.status(200).json(instances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single instance
export const getInstance = async (req: Request, res: Response): Promise<void> => {
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
export const createInstance = async (req: Request, res: Response): Promise<void> => {
  try {
    const instance = new Instance(req.body);
    const savedInstance = await instance.save();
    res.status(201).json(savedInstance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an instance
export const updateInstance = async (req: Request, res: Response): Promise<void> => {
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
export const deleteInstance = async (req: Request, res: Response): Promise<void> => {
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