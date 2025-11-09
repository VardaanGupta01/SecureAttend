package com.secureattend.exception;

public class SessionClosedException extends SecureAttendException {
    public SessionClosedException(String sessionId) {
        super("Session is closed or expired: " + sessionId, "SESSION_CLOSED");
    }
}