import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/secureattend',
  corsOrigins: process.env.CORS_ORIGINS === '*'
    ? '*'
    : (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map((o) => o.trim()),
  geo: {
    defaultRadiusMeters: parseFloat(process.env.GEO_DEFAULT_RADIUS_METERS || '50'),
    defaultLat: parseFloat(process.env.GEO_DEFAULT_LAT || '25.4299'),
    defaultLon: parseFloat(process.env.GEO_DEFAULT_LON || '81.7712'),
  },
  face: {
    minConfidence: parseFloat(process.env.FACE_MIN_CONFIDENCE || '85'),
    livenessRequired: process.env.FACE_LIVENESS_REQUIRED !== 'false',
    apiEnabled: process.env.FACE_API_ENABLED === 'true',
  },
  session: {
    qrExpiryMinutes: parseInt(process.env.SESSION_QR_EXPIRY_MINUTES || '30', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secureattend_jwt_super_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
