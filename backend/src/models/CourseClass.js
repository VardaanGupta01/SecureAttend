import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const courseClassSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    code: String,
    title: String,
    description: String,
    professorId: String,
    taIds: { type: [String], default: [] },
    studentIds: { type: [String], default: [] },
    semester: String,
    credits: Number,
    schedule: String,
    location: String,
    latitude: Number,
    longitude: Number,
    wifiSSID: String,
    createdAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  {
    collection: 'classes',
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

courseClassSchema.index({ professorId: 1 });
courseClassSchema.index({ studentIds: 1 });
courseClassSchema.index({ taIds: 1 });

export const CourseClass = mongoose.model('CourseClass', courseClassSchema);
