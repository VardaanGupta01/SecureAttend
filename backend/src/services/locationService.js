import { config } from '../config/index.js';

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

export function verifyLocation(studentLat, studentLon, studentWifi, session) {
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

  if (session.wifiSSID) {
    if (!studentWifi) {
      return { success: false, message: 'WiFi SSID not provided', errorCode: 'MISSING_WIFI_SSID', metadata: { distance } };
    }
    if (studentWifi !== session.wifiSSID) {
      return {
        success: false,
        message: `Wrong WiFi network: '${studentWifi}' (expected: '${session.wifiSSID}')`,
        errorCode: 'WRONG_WIFI_NETWORK',
        metadata: { distance, studentWifi, expectedWifi: session.wifiSSID },
      };
    }
  }

  return {
    success: true,
    message: `Location verified: ${distance.toFixed(1)} meters from classroom`,
    metadata: { distance, wifiMatched: studentWifi === session.wifiSSID },
  };
}
