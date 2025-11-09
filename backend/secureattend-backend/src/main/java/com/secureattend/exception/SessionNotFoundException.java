package com.secureattend.exception;

public class SessionNotFoundException extends SecureAttendException {
    public SessionNotFoundException(String sessionId) {
        super("Session not found: " + sessionId, "SESSION_NOT_FOUND");
    }
}