import { AppError } from '../utils/errors.js';
import { error } from '../utils/apiResponse.js';

export function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(error(err.message, err.errorCode));
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';
  return res.status(statusCode).json(
    error(statusCode === 500 ? `An unexpected error occurred: ${message}` : message, err.errorCode || 'INTERNAL_SERVER_ERROR')
  );
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
