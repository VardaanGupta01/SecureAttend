package com.secureattend.dto;

import java.util.HashMap;
import java.util.Map;

public class VerificationResult {
    private boolean success;
    private String message;
    private String errorCode;
    private Map<String, Object> metadata = new HashMap<>();

    public VerificationResult(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public VerificationResult(boolean success, String message, String errorCode) {
        this.success = success;
        this.message = message;
        this.errorCode = errorCode;
    }

    public static VerificationResult success(String message) {
        return new VerificationResult(true, message);
    }

    public static VerificationResult failure(String message) {
        return new VerificationResult(false, message, "VERIFICATION_FAILED");
    }

    public static VerificationResult failure(String message, String errorCode) {
        return new VerificationResult(false, message, errorCode);
    }

    public VerificationResult addMetadata(String key, Object value) {
        this.metadata.put(key, value);
        return this;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}