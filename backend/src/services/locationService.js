import { config } from '../config/index.js';
import { calculateNetworkId } from '../utils/networkUtils.js';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const latDistance = ((lat2 - lat1) * Math.PI) / 180;
  const lonDistance = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(lonDistance / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function verifyLocation(studentLat, studentLon, studentWifi, session, studentNetworkId = null, studentIp = null) {
  if (!session.requireLocation) {
    return { success: true, message: 'Location verification not required', metadata: { skipped: true } };
  }

  if (studentLat == null || studentLon == null) {
    return { success: false, message: 'GPS coordinates not provided', errorCode: 'MISSING_GPS_COORDINATES', metadata: {} };
  }

  if (session.latitude == null || session.longitude == null) {
    return { success: false, message: 'Session location not configured', errorCode: 'SESSION_LOCATION_NOT_SET', metadata: {} };
  }

  const distance = calculateDistance(studentLat, studentLon, session.latitude, session.longitude);
  const allowedRadius = session.allowedRadiusMeters ?? config.geo.defaultRadiusMeters;

  if (distance > allowedRadius) {
    return {
      success: false,
      message: `Too far from classroom: ${distance.toFixed(1)} meters (max: ${allowedRadius} meters)`,
      errorCode: 'LOCATION_TOO_FAR',
      metadata: { distance, allowed: allowedRadius },
    };
  }

  // 1. Wi-Fi SSID Verification
  if (session.requireWifi || session.wifiSSID) {
    if (!studentWifi || !studentWifi.trim()) {
      return { success: false, message: 'Classroom Wi-Fi network not detected. Connect to classroom Wi-Fi.', errorCode: 'MISSING_WIFI_SSID', metadata: { distance } };
    }
    if (session.wifiSSID && studentWifi.trim().toLowerCase() !== session.wifiSSID.trim().toLowerCase()) {
      return {
        success: false,
        message: `Wrong WiFi network: '${studentWifi}' (expected: '${session.wifiSSID}')`,
        errorCode: 'WRONG_WIFI_NETWORK',
        metadata: { distance, studentWifi, expectedWifi: session.wifiSSID },
      };
    }
  }

  // 2. Subnet Mask & Network ID (CIDR) Verification (Anti-Rogue AP / Anti-Hotspot Spoofing)
  if (session.requireSubnetCheck && session.networkId) {
    let computedNetworkId = studentNetworkId;
    if (!computedNetworkId && studentIp) {
      computedNetworkId = calculateNetworkId(studentIp, session.subnetMask || '255.255.255.0').cidr;
    }

    if (computedNetworkId) {
      const requiredNet = session.networkId.trim();
      const studentNet = computedNetworkId.trim();
      const isSubnetMatch = studentNet === requiredNet || studentNet.split('/')[0] === requiredNet.split('/')[0];
      if (!isSubnetMatch) {
        return {
          success: false,
          message: `Rogue AP / Subnet Mismatch: Connected to subnet '${studentNet}' instead of classroom subnet '${requiredNet}'. Access point spoofing prevented.`,
          errorCode: 'SUBNET_MISMATCH_ROGUE_AP',
          metadata: { distance, studentNetworkId: studentNet, expectedNetworkId: requiredNet },
        };
      }
    }
  }

  return {
    success: true,
    message: `Location & Network verified: ${distance.toFixed(1)} meters from classroom`,
    metadata: {
      distance,
      wifiMatched: session.wifiSSID ? studentWifi.trim().toLowerCase() === session.wifiSSID.trim().toLowerCase() : true,
      subnetMatched: Boolean(session.requireSubnetCheck && session.networkId),
    },
  };
}
