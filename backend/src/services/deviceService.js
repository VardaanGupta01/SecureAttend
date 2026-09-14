import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Resolves the physical hardware MAC address of a client IP from the host's ARP table.
 * Since the professor and student are on the same local subnet / Wi-Fi WLAN,
 * the local OS ARP cache records the Layer 2 Ethernet/802.11 MAC address of the connected peer.
 * 
 * @param {string} clientIp Dotted-decimal IPv4 string (e.g., '10.50.100.155')
 * @returns {Promise<string | null>} Hardware MAC address (e.g., '5e:03:c2:59:3a:08') or null
 */
export async function resolveClientMac(clientIp) {
  if (!clientIp || typeof clientIp !== 'string') return null;

  // Clean IPv4-mapped IPv6 prefixes
  const cleanIp = clientIp.replace(/^::ffff:/, '').trim();

  // Loopback address
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return '00:00:00:00:00:00';
  }

  try {
    let stdout = '';
    if (process.platform === 'win32') {
      const res = await execPromise(`arp -a ${cleanIp}`, { timeout: 1500 });
      stdout = res.stdout;
    } else {
      // macOS and Linux
      const res = await execPromise(`arp -n ${cleanIp}`, { timeout: 1500 });
      stdout = res.stdout;
    }

    // Match MAC pattern (e.g. 5e:03:c2:59:3a:08 or 5e-03-c2-59-3a-08)
    const match = stdout.match(/([0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2}[:-][0-9a-fA-F]{1,2})/);
    if (match && match[1]) {
      // Normalize to lowercase colon-separated format
      return match[1].replace(/-/g, ':').toLowerCase();
    }
  } catch (_err) {
    // ARP entry might not be populated or ping hasn't occurred yet
  }

  return null;
}

/**
 * Validates whether a device has already been used for a given session.
 * 
 * @param {object} session Mongoose Session document
 * @param {string} studentId Current student ID
 * @param {string} deviceFingerprint Frontend hardware fingerprint string
 * @param {string | null} deviceMac Resolved Layer 2 MAC address
 * @returns {{ isBlocked: boolean, registeredStudentName?: string, reason?: string }}
 */
export function validateDeviceUsage(session, studentId, deviceFingerprint, deviceMac) {
  if (!session.requireOneDevicePerStudent) {
    return { isBlocked: false };
  }

  const usedFingerprints = session.usedDeviceFingerprints || [];
  const usedMacs = session.usedDeviceMacs || [];
  const deviceStudentMap = session.deviceStudentMap || new Map();

  const getFromMap = (key) => {
    if (!key) return null;
    if (deviceStudentMap instanceof Map) return deviceStudentMap.get(key);
    if (typeof deviceStudentMap === 'object') return deviceStudentMap[key];
    return null;
  };

  const registeredByFingerprint = deviceFingerprint && usedFingerprints.includes(deviceFingerprint)
    ? getFromMap(deviceFingerprint)
    : null;

  const registeredByMac = deviceMac && deviceMac !== '00:00:00:00:00:00' && usedMacs.includes(deviceMac)
    ? getFromMap(deviceMac)
    : null;

  const registeredStudent = registeredByFingerprint || registeredByMac;

  // If already used by this same student, allow re-entry / retry
  if (registeredStudent && registeredStudent.studentId && registeredStudent.studentId !== studentId) {
    return {
      isBlocked: true,
      registeredStudentName: registeredStudent.studentName,
      reason: `Device already used: This device was already used to mark attendance for '${registeredStudent.studentName}'. Proxy attendance by logging into multiple accounts on the same device is strictly prohibited.`,
    };
  }

  return { isBlocked: false };
}
