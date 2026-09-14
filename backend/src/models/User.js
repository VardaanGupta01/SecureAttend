import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const stringId = {
  type: String,
  default: () => randomUUID(),
};

const userSchema = new mongoose.Schema(
  {
    _id: stringId,
    email: String,
    password: String,
    name: String,
    role: { type: String, enum: ['STUDENT', 'PROFESSOR', 'TA', 'ADMIN'] },
    attendanceRecordIds: { type: [String], default: [] },
    profilePictureBase64: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    // Student fields
    studentNumber: String,
    major: String,
    year: Number,
    faceImageUrl: String,
    faceImageBase64: String,
    cumulativeAttendanceRate: Number,
    // Professor fields
    department: String,
    employeeId: String,
    title: String,
    officeLocation: String,
    // TA fields
    taId: String,
    supervisorProfessorId: String,
  },
  {
    collection: 'users',
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ studentNumber: 1 });
userSchema.index({ taId: 1 });

export const User = mongoose.model('User', userSchema);
