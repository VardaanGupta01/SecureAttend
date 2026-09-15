import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { error as errorResponse } from '../utils/apiResponse.js';

/**
 * Authentication middleware verifying JWT tokens from HttpOnly cookies or Authorization header.
 * Attaches decoded user payload ({ userId, role, name, email }) to req.user.
 */
export function authenticate(req, res, next) {
  try {
    // Extract token: primary via secure HttpOnly cookie, fallback via Bearer header
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : null);

    if (!token) {
      return res.status(401).json(errorResponse('Authentication token required', 'UNAUTHORIZED'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(errorResponse('Token has expired', 'TOKEN_EXPIRED'));
    }
    return res.status(401).json(errorResponse('Invalid authentication token', 'INVALID_TOKEN'));
  }
}

/**
 * Role-based access control guard.
 * @param  {...string} allowedRoles E.g. 'PROFESSOR', 'TA', 'STUDENT'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('Forbidden: Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}
