package com.secureattend.exception;

public class FaceVerificationFailedException extends SecureAttendException {
    public FaceVerificationFailedException(String reason) {
        super("Face verification failed: " + reason, "FACE_VERIFICATION_FAILED");
    }
}