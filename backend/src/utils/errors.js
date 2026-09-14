export class AppError extends Error {
  constructor(message, errorCode, statusCode = 400) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

export class SessionNotFoundException extends AppError {
  constructor(sessionId) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', 404);
  }
}

export class SessionClosedException extends AppError {
  constructor(sessionId) {
    super(`Session is closed or expired: ${sessionId}`, 'SESSION_CLOSED', 403);
  }
}

export class StudentNotEnrolledException extends AppError {
  constructor(studentId, classId) {
    super(`Student ${studentId} is not enrolled in class ${classId}`, 'STUDENT_NOT_ENROLLED', 403);
  }
}

export class InvalidQRCodeException extends AppError {
  constructor(input) {
    super(`Invalid QR code or codeword: ${input}`, 'INVALID_QR_CODE', 400);
  }
}

export class LocationVerificationFailedException extends AppError {
  constructor(message) {
    super(message, 'LOCATION_VERIFICATION_FAILED', 400);
  }
}

export class FaceVerificationFailedException extends AppError {
  constructor(message) {
    super(message, 'FACE_VERIFICATION_FAILED', 400);
  }
}

export class DuplicateAttendanceException extends AppError {
  constructor(studentId, sessionId) {
    super(`Duplicate attendance for student ${studentId} in session ${sessionId}`, 'DUPLICATE_ATTENDANCE', 409);
  }
}

export class InvalidVerificationStepException extends AppError {
  constructor(currentStep, expectedStep) {
    super(`Invalid verification step: ${currentStep}, expected ${expectedStep}`, 'INVALID_VERIFICATION_STEP', 400);
  }
}
