import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    classId: String,
    qrToken: String,
    qrCodeImageBase64: String,
    codeword: String,
    startTime: Date,
    endTime: Date,
    expiresAt: Date,
    open: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED', 'EXPIRED'],
      default: 'SCHEDULED',
    },
    professorHeadcount: { type: Number, default: 0 },
    expectedAttendeeCount: { type: Number, default: 0 },
    actualAttendeeCount: { type: Number, default: 0 },
    location: String,
    latitude: Number,
    longitude: Number,
    wifiSSID: String,
    allowedRadiusMeters: { type: Number, default: 50 },
    allowedStudentIds: { type: [String], default: [] },
    maxAttendees: Number,
    requireLocation: { type: Boolean, default: true },
    requireFace: { type: Boolean, default: true },
    requireProfessorVerification: { type: Boolean, default: true },
    requireTAVerification: { type: Boolean, default: true },
    enableQrRotation: { type: Boolean, default: false },
    qrRotationIntervalSeconds: Number,
    lastQrRotationAt: Date,
    nextQrRotationAt: Date,
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'sessions',
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

sessionSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > new Date(this.expiresAt);
};

sessionSchema.index({ classId: 1 });

export const Session = mongoose.model('Session', sessionSchema);
