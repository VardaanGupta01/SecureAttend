package com.secureattend.exception;

public class LocationVerificationFailedException extends SecureAttendException {
    public LocationVerificationFailedException(String reason) {
        super("Location verification failed: " + reason, "LOCATION_VERIFICATION_FAILED");
    }
}