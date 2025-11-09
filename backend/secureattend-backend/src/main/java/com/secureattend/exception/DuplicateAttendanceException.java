package com.secureattend.exception;

public class DuplicateAttendanceException extends SecureAttendException {
    public DuplicateAttendanceException(String studentId, String sessionId) {
        super("Student " + studentId + " has already marked attendance for session " + sessionId,
              "DUPLICATE_ATTENDANCE");
    }
}