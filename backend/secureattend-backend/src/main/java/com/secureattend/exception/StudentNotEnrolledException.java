package com.secureattend.exception;

public class StudentNotEnrolledException extends SecureAttendException {
    public StudentNotEnrolledException(String studentId, String classId) {
        super("Student " + studentId + " is not enrolled in class " + classId, 
              "STUDENT_NOT_ENROLLED");
    }
}