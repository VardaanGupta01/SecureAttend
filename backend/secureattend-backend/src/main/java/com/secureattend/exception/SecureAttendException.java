package com.secureattend.exception;

public class SecureAttendException extends RuntimeException {
    private final String errorCode;
    
    public SecureAttendException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
}