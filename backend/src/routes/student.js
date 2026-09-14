import { Router } from 'express';
import { exec } from 'child_process';
import util from 'util';
import { success } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as attendanceService from '../services/attendanceService.js';
import { CourseClass } from '../models/CourseClass.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';

import { fileURLToPath } from 'url';
import path from 'path';
import { getActiveInterfaceDetails, calculateNetworkId } from '../utils/networkUtils.js';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function detectSystemWifiSSID() {
  try {
    if (process.platform === 'darwin') {
      // 1. Direct active network lookup via python helper (supports modern macOS & personal hotspots)
      try {
        const scriptPath = path.join(__dirname, '../utils/getWifiDarwin.py');
        const { stdout } = await execPromise(`python3 "${scriptPath}"`, { timeout: 2000 });
        if (stdout && stdout.trim()) {
          return stdout.trim();
        }
      } catch (_) {}

      // 2. Fallback to networksetup
      try {
        const { stdout } = await execPromise('/usr/sbin/networksetup -getairportnetwork en0', { timeout: 1500 });
        const match = stdout.match(/Current Wi-Fi Network:\s*(.+)$/m);
        if (match && match[1] && !match[1].includes('<redacted>')) {
          return match[1].trim();
        }
      } catch (_) {}

      // 3. Fallback to ipconfig getsummary
      try {
        const { stdout } = await execPromise('ipconfig getsummary en0', { timeout: 1500 });
        const match = stdout.match(/^\s*SSID\s*:\s*(.+)$/m);
        if (match && match[1] && !match[1].includes('<redacted>')) {
          return match[1].trim();
        }
      } catch (_) {}
    } else if (process.platform === 'win32') {
      const { stdout } = await execPromise('netsh wlan show interfaces', { timeout: 1500 });
      const match = stdout.match(/^\s*SSID\s*:\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (process.platform === 'linux') {
      const { stdout } = await execPromise('iwgetid -r', { timeout: 1500 });
      if (stdout && stdout.trim()) {
        return stdout.trim();
      }
    }
  } catch (_err) {
    // Non-fatal if host system command is unsupported or unavailable
  }
  return null;
}

const router = Router();

router.get(
  '/detect-network',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.query;
    let requiredSSID = null;
    let requiredNetworkId = null;
    let requiredSubnetMask = '255.255.255.0';
    let wifiRequired = false;
    let subnetRequired = false;

    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session) {
        if (session.wifiSSID) requiredSSID = session.wifiSSID;
        if (session.networkId) requiredNetworkId = session.networkId;
        if (session.subnetMask) requiredSubnetMask = session.subnetMask;
        wifiRequired = Boolean(session.requireWifi || session.wifiSSID);
        subnetRequired = Boolean(session.requireSubnetCheck && session.networkId);
      }
    }

    const systemSsid = await detectSystemWifiSSID();
    const activeInterface = getActiveInterfaceDetails();
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection?.remoteAddress || '127.0.0.1');
    const clientIp = rawIp.replace(/^::ffff:/, '');

    // Compute student's Network ID using client IP (or active interface IP if loopback)
    const effectiveIp = (clientIp === '127.0.0.1' || clientIp === '::1') && activeInterface ? activeInterface.ip : clientIp;
    const effectiveSubnetMask = requiredSubnetMask || (activeInterface ? activeInterface.netmask : '255.255.255.0');
    const clientNetInfo = calculateNetworkId(effectiveIp, effectiveSubnetMask);

    const detectedSSID = systemSsid || '';
    const isSsidMatch = requiredSSID
      ? detectedSSID.trim().toLowerCase() === requiredSSID.trim().toLowerCase()
      : true;

    // Subnet matching: verify client Network ID against session required Network ID
    const isSubnetMatch = requiredNetworkId
      ? clientNetInfo.cidr === requiredNetworkId || clientNetInfo.networkAddress === requiredNetworkId.split('/')[0]
      : true;

    res.json(
      success({
        detectedSSID,
        requiredSSID,
        wifiRequired,
        subnetRequired,
        clientIp: effectiveIp,
        subnetMask: effectiveSubnetMask,
        networkId: clientNetInfo.cidr,
        requiredNetworkId,
        requiredSubnetMask,
        isAutoDetected: Boolean(systemSsid),
        isSsidMatch,
        isSubnetMatch,
        isMatch: isSsidMatch && isSubnetMatch,
      })
    );
  })
);

router.post(
  '/attendance/initiate',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.initiateAttendance(req.body);
    res.json(success(attendance, 'QR verification successful. Proceed to location verification.'));
  })
);

router.post(
  '/attendance/verify-location',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.verifyLocation(req.body);
    res.json(success(attendance, 'Location verified. Proceed to face verification.'));
  })
);

router.post(
  '/attendance/verify-face',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.verifyFace(req.body);
    res.json(success(attendance, 'Face verified. Awaiting professor verification.'));
  })
);

router.get(
  '/attendance/:attendanceId',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getAttendanceById(req.params.attendanceId);
    if (!attendance) return res.status(404).send();
    res.json(success(attendance));
  })
);

router.get(
  '/:studentId/classes',
  asyncHandler(async (req, res) => {
    const classes = await CourseClass.find({ studentIds: req.params.studentId });
    res.json(success(classes.map((c) => c.toJSON())));
  })
);

router.get(
  '/:studentId/attendance',
  asyncHandler(async (req, res) => {
    const attendance = await attendanceService.getStudentAttendance(req.params.studentId);
    res.json(success(attendance));
  })
);

router.get(
  '/:studentId',
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.studentId);
    if (!student) throw new Error('Student not found');
    res.json(success(student.toJSON()));
  })
);

router.delete(
  '/:studentId/attendance/all',
  asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.studentId);
    if (!student) throw new Error('Student not found');
    await attendanceService.deleteAllStudentAttendance(req.params.studentId);
    res.json(success(null, 'Attendance history cleared successfully'));
  })
);

export default router;
