import { Attendance } from '../models/Attendance.js';
import { Session } from '../models/Session.js';
import { CourseClass } from '../models/CourseClass.js';
import { User } from '../models/User.js';
import { verifyLocation as checkLocation } from './locationService.js';
import { verifyFace as checkFace } from './faceService.js';
import { resolveClientMac, validateDeviceUsage } from './deviceService.js';
import {
  SessionNotFoundException,
  SessionClosedException,
  StudentNotEnrolledException,
  InvalidQRCodeException,
  LocationVerificationFailedException,
  FaceVerificationFailedException,
  DuplicateAttendanceException,
  InvalidVerificationStepException,
} from '../utils/errors.js';

function verifyQROrCodeword(input, session) {
  if (!input || !input.trim()) return false;
  const normalized = input.trim().toUpperCase();
  return normalized === session.qrToken || normalized === session.codeword;
}

function checkSystemVerification(attendance, session) {
  const allVerified =
    attendance.qrVerified &&
    (attendance.locationVerified || !session.requireLocation) &&
    (attendance.faceVerified || !session.requireFace);

  if (!allVerified) return;

  attendance.systemVerified = true;

  if (!session.requireProfessorVerification) {
    attendance.professorVerified = true;
    attendance.verificationLayersPassed.push('PROFESSOR_SKIPPED');

    if (!session.requireTAVerification) {
      attendance.taVerified = true;
      attendance.verificationLayersPassed.push('TA_SKIPPED');
      attendance.currentStep = 'COMPLETED';
      attendance.finalStatus = 'APPROVED';
    } else {
      attendance.currentStep = 'AWAITING_TA';
    }
  } else {
    attendance.currentStep = 'AWAITING_PROFESSOR';
  }
}

export async function initiateAttendance(request) {
  const session = await Session.findById(request.sessionId);
  if (!session) throw new SessionNotFoundException(request.sessionId);

  if (!session.open) throw new SessionClosedException(request.sessionId);

  if (session.isExpired()) {
    session.open = false;
    session.status = 'EXPIRED';
    await session.save();
    throw new SessionClosedException(request.sessionId);
  }

  const student = await User.findById(request.studentId);
  if (!student || student.role !== 'STUDENT') {
    throw new Error(`Student not found: ${request.studentId}`);
  }

  const courseClass = await CourseClass.findById(session.classId);
  if (!courseClass) throw new Error(`Class not found: ${session.classId}`);

  if (!courseClass.studentIds.includes(student._id)) {
    throw new StudentNotEnrolledException(student._id, courseClass._id);
  }

  const existing = await Attendance.findOne({ studentId: student._id, sessionId: session._id });
  if (existing) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (existing.currentStep !== 'COMPLETED' && existing.checkInTime > fiveMinAgo) {
      return existing.toJSON();
    }
    throw new DuplicateAttendanceException(student._id, session._id);
  }

  if (!verifyQROrCodeword(request.qrCodeOrCodeword, session)) {
    throw new InvalidQRCodeException(request.qrCodeOrCodeword);
  }

  // --- ONE DEVICE, ONE ATTENDANCE VALIDATION ---
  const deviceFingerprint = request.deviceFingerprint || null;
  const clientIp = request.ipAddress || '127.0.0.1';
  const deviceMac = await resolveClientMac(clientIp);

  if (session.requireOneDevicePerStudent) {
    const deviceCheck = validateDeviceUsage(session, student._id, deviceFingerprint, deviceMac);
    if (deviceCheck.isBlocked) {
      throw new Error(deviceCheck.reason);
    }

    // Register device to session
    if (deviceFingerprint && !session.usedDeviceFingerprints.includes(deviceFingerprint)) {
      session.usedDeviceFingerprints.push(deviceFingerprint);
      session.deviceStudentMap.set(deviceFingerprint, { studentId: student._id, studentName: student.name });
    }
    if (deviceMac && deviceMac !== '00:00:00:00:00:00' && !session.usedDeviceMacs.includes(deviceMac)) {
      session.usedDeviceMacs.push(deviceMac);
      session.deviceStudentMap.set(deviceMac, { studentId: student._id, studentName: student.name });
    }
    await session.save();
  }

  const now = new Date();
  const attendance = new Attendance({
    studentId: student._id,
    studentName: student.name,
    sessionId: session._id,
    classId: session.classId,
    deviceInfo: request.deviceInfo,
    deviceFingerprint,
    deviceMacAddress: deviceMac,
    ipAddress: clientIp,
    checkInTime: now,
    qrVerified: true,
    qrVerifiedAt: now,
    currentStep: 'QR_VERIFIED',
    verificationLayersPassed: ['QR_CODE'],
    verificationDetails: new Map([
      ['QR_CODE', { passed: true, message: 'QR code verified successfully', timestamp: now, metadata: { deviceFingerprint, deviceMac } }],
    ]),
  });

  if (!session.requireLocation) {
    attendance.locationVerified = true;
    attendance.verificationLayersPassed.push('LOCATION_SKIPPED');
    attendance.currentStep = 'LOCATION_VERIFIED';
  }

  const saved = await attendance.save();
  console.log(`✓ Attendance initiated for student: ${student.name}`);
  return saved.toJSON();
}

export async function verifyLocation(request) {
  const attendance = await Attendance.findById(request.attendanceId);
  if (!attendance) throw new Error('Attendance record not found');

  const session = await Session.findById(attendance.sessionId);
  if (!session) throw new SessionNotFoundException(attendance.sessionId);

  if (!session.requireLocation) {
    attendance.locationVerified = true;
    attendance.currentStep = 'LOCATION_VERIFIED';
    attendance.verificationLayersPassed.push('LOCATION_SKIPPED');

    if (!session.requireFace) {
      attendance.faceVerified = true;
      attendance.currentStep = 'FACE_VERIFIED';
      attendance.verificationLayersPassed.push('FACE_SKIPPED');
      checkSystemVerification(attendance, session);
    }

    return (await attendance.save()).toJSON();
  }

  if (attendance.currentStep !== 'QR_VERIFIED' || !attendance.qrVerified) {
    throw new InvalidVerificationStepException(attendance.currentStep, 'LOCATION_VERIFICATION');
  }

  const result = checkLocation(
    request.latitude,
    request.longitude,
    request.wifiSSID,
    session,
    request.networkId,
    request.studentIp || attendance.ipAddress
  );

  attendance.studentLatitude = request.latitude;
  attendance.studentLongitude = request.longitude;
  attendance.studentWifiSSID = request.wifiSSID;
  if (request.networkId) attendance.studentNetworkId = request.networkId;
  attendance.locationVerifiedAt = new Date();

  if (result.success) {
    attendance.locationVerified = true;
    attendance.currentStep = 'LOCATION_VERIFIED';
    attendance.verificationLayersPassed.push('LOCATION');
    if (result.metadata.distance != null) {
      attendance.distanceFromClassroom = result.metadata.distance;
    }

    if (!session.requireFace) {
      attendance.faceVerified = true;
      attendance.currentStep = 'FACE_VERIFIED';
      attendance.verificationLayersPassed.push('FACE_SKIPPED');
      checkSystemVerification(attendance, session);
    }
  } else {
    attendance.locationVerified = false;
    attendance.flaggedProxy = true;
    attendance.proxyReason = result.message;
    attendance.proxySeverity = 'HIGH';
  }

  attendance.verificationDetails.set('LOCATION', {
    passed: result.success,
    message: result.message,
    timestamp: new Date(),
    metadata: result.metadata,
  });

  const saved = await attendance.save();
  if (!result.success) throw new LocationVerificationFailedException(result.message);

  console.log(`✓ Location verified for student: ${attendance.studentName}`);
  return saved.toJSON();
}

export async function verifyFace(request) {
  const attendance = await Attendance.findById(request.attendanceId);
  if (!attendance) throw new Error('Attendance record not found');

  const session = await Session.findById(attendance.sessionId);
  if (!session) throw new SessionNotFoundException(attendance.sessionId);

  if (!session.requireFace) {
    attendance.faceVerified = true;
    attendance.currentStep = 'FACE_VERIFIED';
    attendance.verificationLayersPassed.push('FACE_SKIPPED');
    checkSystemVerification(attendance, session);
    return (await attendance.save()).toJSON();
  }

  if (attendance.currentStep !== 'LOCATION_VERIFIED' || !attendance.locationVerified) {
    throw new InvalidVerificationStepException(attendance.currentStep, 'FACE_VERIFICATION');
  }

  const student = await User.findById(attendance.studentId);
  if (!student) throw new Error('Student not found');

  const result = checkFace(student, request.faceImageBase64, request.livenessDetected);

  attendance.faceImageBase64 = request.faceImageBase64;
  attendance.livenessDetected = request.livenessDetected;
  attendance.faceVerifiedAt = new Date();

  if (result.success) {
    attendance.faceVerified = true;
    attendance.currentStep = 'FACE_VERIFIED';
    attendance.verificationLayersPassed.push('FACE_RECOGNITION');
    if (result.metadata.confidence != null) {
      attendance.faceMatchScore = result.metadata.confidence;
    }
    checkSystemVerification(attendance, session);
  } else {
    attendance.faceVerified = false;
    attendance.flaggedProxy = true;
    attendance.proxyReason = result.message;
    attendance.proxySeverity = 'CRITICAL';
  }

  attendance.verificationDetails.set('FACE_RECOGNITION', {
    passed: result.success,
    message: result.message,
    timestamp: new Date(),
    metadata: result.metadata,
  });

  const saved = await attendance.save();
  if (!result.success) throw new FaceVerificationFailedException(result.message);

  console.log(`✓ Face verified for student: ${attendance.studentName}`);
  return saved.toJSON();
}

export async function professorVerify(attendanceId, approved, notes) {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new Error('Attendance record not found');

  const session = await Session.findById(attendance.sessionId);
  if (!session) throw new SessionNotFoundException(attendance.sessionId);

  attendance.professorVerified = approved;
  attendance.professorVerifiedAt = new Date();
  attendance.professorNotes = notes;

  if (approved) {
    if (session.requireTAVerification) {
      attendance.currentStep = 'AWAITING_TA';
    } else {
      attendance.taVerified = true;
      attendance.verificationLayersPassed.push('TA_SKIPPED');
      attendance.currentStep = 'COMPLETED';
      attendance.finalStatus = 'APPROVED';
    }
  } else {
    attendance.currentStep = 'REJECTED';
    attendance.finalStatus = 'REJECTED';
  }

  return (await attendance.save()).toJSON();
}

export async function taVerify(attendanceId, approved, notes) {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new Error('Attendance record not found');

  if (!attendance.professorVerified) {
    throw new Error('Professor verification required before TA verification');
  }

  attendance.taVerified = approved;
  attendance.taVerifiedAt = new Date();
  attendance.taNotes = notes;

  if (approved) {
    attendance.currentStep = 'COMPLETED';
    attendance.finalStatus = 'APPROVED';
  } else {
    attendance.currentStep = 'REJECTED';
    attendance.finalStatus = 'REJECTED';
  }

  return (await attendance.save()).toJSON();
}

export async function getSessionAttendance(sessionId) {
  const attendanceList = await Attendance.find({ sessionId });
  if (!attendanceList.length) return [];

  const studentIds = [...new Set(attendanceList.map((a) => a.studentId))];
  const students = await User.find({ _id: { $in: studentIds }, role: 'STUDENT' });
  const rollMap = Object.fromEntries(students.map((s) => [s._id, s.studentNumber]));

  return attendanceList.map((a) => {
    const json = a.toJSON();
    if (rollMap[a.studentId]) json.studentRollNumber = rollMap[a.studentId];
    return json;
  });
}

export async function getStudentAttendance(studentId) {
  return (await Attendance.find({ studentId })).map((a) => a.toJSON());
}

export async function getAttendanceById(attendanceId) {
  const attendance = await Attendance.findById(attendanceId);
  return attendance ? attendance.toJSON() : null;
}

export async function deleteAllStudentAttendance(studentId) {
  await Attendance.deleteMany({ studentId });
}

export async function getFlaggedAttendance() {
  return (await Attendance.find({ flaggedProxy: true })).map((a) => a.toJSON());
}

export async function getPendingProfessorVerification(sessionId) {
  const list = await Attendance.find({ sessionId });
  return list.filter((a) => a.systemVerified && !a.professorVerified).map((a) => a.toJSON());
}

export async function getPendingTAVerification() {
  const list = await Attendance.find({ systemVerified: true, professorVerified: true, taVerified: false });
  return list.map((a) => a.toJSON());
}

export async function flagProxy(attendanceId, flagged, reason) {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new Error('Attendance not found');

  attendance.flaggedProxy = flagged;
  attendance.proxyReason = reason;
  attendance.proxySeverity = flagged ? 'MEDIUM' : 'NONE';

  return (await attendance.save()).toJSON();
}
