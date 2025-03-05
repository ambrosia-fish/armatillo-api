import mongoose, { Document, Schema } from 'mongoose';

export interface IInstance extends Document {
  time: Date;
  duration: number;
  urgeStrength?: number;
  intentionType?: string;
  selectedEnvironments?: string[];
  selectedEmotions?: string[];
  selectedSensations?: string[];
  selectedThoughts?: string[];
  notes?: string;
  userId?: string; // For future authentication
  createdAt: Date;
}

const InstanceSchema: Schema = new Schema({
  time: { type: Date, required: true },
  duration: { type: Number, required: true },
  urgeStrength: { type: Number },
  intentionType: { type: String },
  selectedEnvironments: { type: [String] },
  selectedEmotions: { type: [String] },
  selectedSensations: { type: [String] },
  selectedThoughts: { type: [String] },
  notes: { type: String },
  userId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IInstance>('Instance', InstanceSchema);