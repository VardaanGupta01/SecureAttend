package com.secureattend.exception;

public class InvalidVerificationStepException extends SecureAttendException {
    public InvalidVerificationStepException(String currentStep, String attemptedStep) {
        super("Cannot proceed to " + attemptedStep + " from current step: " + currentStep,
              "INVALID_VERIFICATION_STEP");
    }
}