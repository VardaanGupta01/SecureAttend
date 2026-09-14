import { config } from '../config/index.js';
import { generateCodeword, generateQrToken } from '../utils/codeFactory.js';
import { generateQRCodeImage } from '../utils/qrService.js';
import { CourseClass } from '../models/CourseClass.js';
import { Session } from '../models/Session.js';
import { getActiveInterfaceDetails } from '../utils/networkUtils.js';

export async function createSession(request) {
  const courseClass = await CourseClass.findById(request.classId);
  if (!courseClass) throw new Error(`Class not found: ${request.classId}`);

  const qrToken = generateQrToken();
  const codeword = generateCodeword();

  let qrCodeImageBase64;
  try {
    qrCodeImageBase64 = await generateQRCodeImage(qrToken, 300, 300);
  } catch (e) {
    console.error('Failed to generate QR code:', e.message);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.session.qrExpiryMinutes * 60 * 1000);
  const endTime = new Date(now.getTime() + (request.durationMinutes || 120) * 60 * 1000);

  const requireWifi = request.requireWifi ?? Boolean(request.wifiSSID);
  const requireSubnetCheck = request.requireSubnetCheck ?? (requireWifi ? true : false);

  let networkId = request.networkId;
  let subnetMask = request.subnetMask || '255.255.255.0';

  if (requireSubnetCheck && !networkId) {
    const activeNet = getActiveInterfaceDetails();
    if (activeNet) {
      networkId = activeNet.networkId;
      subnetMask = activeNet.netmask;
    }
  }

  const session = new Session({
    classId: request.classId,
    qrToken,
    codeword,
    qrCodeImageBase64,
    location: courseClass.location,
    latitude: request.latitude,
    longitude: request.longitude,
    wifiSSID: request.wifiSSID,
    subnetMask,
    networkId,
    allowedRadiusMeters: request.allowedRadiusMeters ?? 50,
    requireLocation: request.requireLocation ?? true,
    requireWifi,
    requireSubnetCheck,
    requireOneDevicePerStudent: request.requireOneDevicePerStudent ?? true,
    requireFace: false,
    requireProfessorVerification: request.requireProfessorVerification ?? true,
    requireTAVerification: request.requireTAVerification ?? true,
    startTime: now,
    expiresAt,
    endTime,
    allowedStudentIds: courseClass.studentIds || [],
    maxAttendees: courseClass.studentIds?.length || 0,
    expectedAttendeeCount: courseClass.studentIds?.length || 0,
    open: true,
    status: 'ACTIVE',
  });

  return (await session.save()).toJSON();
}

export async function closeSession(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  session.open = false;
  session.status = 'CLOSED';
  session.endTime = new Date();
  return (await session.save()).toJSON();
}

export async function updateHeadcount(sessionId, headcount) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  session.professorHeadcount = headcount;
  session.actualAttendeeCount = headcount;
  return (await session.save()).toJSON();
}

export async function getOpenSessionsForClass(classId) {
  return (await Session.find({ classId, open: true })).map((s) => s.toJSON());
}

export async function getAllSessionsForClass(classId) {
  return (await Session.find({ classId })).map((s) => s.toJSON());
}

export async function getSessionById(sessionId) {
  const session = await Session.findById(sessionId);
  return session ? session.toJSON() : null;
}

export async function activateSession(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  session.open = true;
  session.status = 'ACTIVE';
  session.startTime = new Date();
  return (await session.save()).toJSON();
}

export async function autoExpireSessions() {
  const activeSessions = await Session.find({ status: 'ACTIVE' });
  for (const session of activeSessions) {
    if (session.isExpired()) {
      session.open = false;
      session.status = 'EXPIRED';
      await session.save();
    }
  }
}

export async function rotateQrCode(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const newQrToken = generateQrToken();
  const newCodeword = generateCodeword();

  try {
    session.qrCodeImageBase64 = await generateQRCodeImage(newQrToken, 300, 300);
  } catch (e) {
    console.error('Failed to regenerate QR:', e.message);
  }

  session.qrToken = newQrToken;
  session.codeword = newCodeword;
  return (await session.save()).toJSON();
}

export async function updateSession(sessionId, request) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  if (request.latitude != null) session.latitude = request.latitude;
  if (request.longitude != null) session.longitude = request.longitude;
  if (request.wifiSSID != null) session.wifiSSID = request.wifiSSID;
  if (request.allowedRadiusMeters != null) session.allowedRadiusMeters = request.allowedRadiusMeters;
  if (request.durationMinutes != null) {
    const startTime = session.startTime || new Date();
    session.endTime = new Date(startTime.getTime() + request.durationMinutes * 60 * 1000);
  }
  if (request.requireLocation != null) session.requireLocation = request.requireLocation;
  if (request.requireWifi != null) session.requireWifi = request.requireWifi;
  if (request.requireSubnetCheck != null) session.requireSubnetCheck = request.requireSubnetCheck;
  if (request.requireOneDevicePerStudent != null) session.requireOneDevicePerStudent = request.requireOneDevicePerStudent;
  if (request.networkId != null) session.networkId = request.networkId;
  if (request.subnetMask != null) session.subnetMask = request.subnetMask;
  if (request.requireFace != null) session.requireFace = request.requireFace;
  if (request.requireProfessorVerification != null) session.requireProfessorVerification = request.requireProfessorVerification;
  if (request.requireTAVerification != null) session.requireTAVerification = request.requireTAVerification;

  return (await session.save()).toJSON();
}

export async function deleteSession(sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  await Session.findByIdAndDelete(sessionId);
}
