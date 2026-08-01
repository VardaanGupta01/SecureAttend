import { config } from '../config/index.js';

function mockFaceRecognition() {
  if (Math.random() < 0.8) {
    return 85 + Math.random() * 13;
  }
  return 70 + Math.random() * 15;
}

export function verifyFace(student, faceImageBase64, livenessDetected) {
  if (!faceImageBase64) {
    return { success: false, message: 'Face image not provided', errorCode: 'MISSING_FACE_IMAGE', metadata: {} };
  }

  if (!student.faceImageBase64) {
    return {
      success: false,
      message: 'No reference photo found for student. Please upload your photo first.',
      errorCode: 'NO_REFERENCE_PHOTO',
      metadata: {},
    };
  }

  if (config.face.livenessRequired && !livenessDetected) {
    return {
      success: false,
      message: "Liveness detection failed. Please ensure you're using a live camera.",
      errorCode: 'LIVENESS_CHECK_FAILED',
      metadata: {},
    };
  }

  const confidence = mockFaceRecognition();
  const threshold = config.face.minConfidence;

  if (confidence >= threshold) {
    return {
      success: true,
      message: `Face verified with ${confidence.toFixed(1)}% confidence`,
      metadata: { confidence, livenessDetected, threshold },
    };
  }

  return {
    success: false,
    message: `Face match confidence too low: ${confidence.toFixed(1)}% (minimum: ${threshold}%)`,
    errorCode: 'LOW_FACE_CONFIDENCE',
    metadata: { confidence, threshold, livenessDetected },
  };
}
