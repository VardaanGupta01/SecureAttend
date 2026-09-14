import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const verificationDetailsSchema = new mongoose.Schema(
  {
    passed: Boolean,
    message: String,
    timestamp: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    studentId: String,
    studentName: String,
    studentRollNumber: String,
    sessionId: String,
    classId: String,
    currentStep: {
      type: String,
      enum: [
        'INITIATED',
        'QR_VERIFIED',
        'LOCATION_VERIFIED',
        'FACE_VERIFIED',
        'AWAITING_PROFESSOR',
        'AWAITING_TA',
        'COMPLETED',
        'REJECTED',
      ],
      default: 'INITIATED',
    },
    verificationLayersPassed: { type: [String], default: [] },
    verificationDetails: { type: Map, of: verificationDetailsSchema, default: {} },
    qrVerified: { type: Boolean, default: false },
    locationVerified: { type: Boolean, default: false },
    faceVerified: { type: Boolean, default: false },
    systemVerified: { type: Boolean, default: false },
    professorVerified: { type: Boolean, default: false },
    taVerified: { type: Boolean, default: false },
    flaggedProxy: { type: Boolean, default: false },
    proxyReason: String,
    proxySeverity: {
      type: String,
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'NONE',
    },
    studentLatitude: Number,
    studentLongitude: Number,
    studentWifiSSID: String,
    distanceFromClassroom: Number,
    faceImageBase64: String,
    faceMatchScore: Number,
    livenessDetected: Boolean,
    checkInTime: { type: Date, default: Date.now },
    qrVerifiedAt: Date,
    locationVerifiedAt: Date,
    faceVerifiedAt: Date,
    professorVerifiedAt: Date,
    taVerifiedAt: Date,
    deviceInfo: String,
    deviceFingerprint: String,
    deviceMacAddress: String,
    ipAddress: String,
    notes: String,
    professorNotes: String,
    taNotes: String,
    finalStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'FLAGGED', 'REJECTED', 'APPROVED'],
      default: 'PENDING',
    },
  },
  {
    collection: 'attendance',
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        if (ret.verificationDetails instanceof Map) {
          ret.verificationDetails = Object.fromEntries(ret.verificationDetails);
        }
        return ret;
      },
    },
  }
);

attendanceSchema.index({ studentId: 1, sessionId: 1 });
attendanceSchema.index({ sessionId: 1 });
attendanceSchema.index({ classId: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
