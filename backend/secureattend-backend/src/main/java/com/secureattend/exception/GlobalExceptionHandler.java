package com.secureattend.exception;

import com.secureattend.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleSessionNotFound(SessionNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(SessionClosedException.class)
    public ResponseEntity<ApiResponse<Object>> handleSessionClosed(SessionClosedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(StudentNotEnrolledException.class)
    public ResponseEntity<ApiResponse<Object>> handleStudentNotEnrolled(StudentNotEnrolledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(InvalidQRCodeException.class)
    public ResponseEntity<ApiResponse<Object>> handleInvalidQRCode(InvalidQRCodeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(LocationVerificationFailedException.class)
    public ResponseEntity<ApiResponse<Object>> handleLocationVerificationFailed(
            LocationVerificationFailedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(FaceVerificationFailedException.class)
    public ResponseEntity<ApiResponse<Object>> handleFaceVerificationFailed(
            FaceVerificationFailedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(DuplicateAttendanceException.class)
    public ResponseEntity<ApiResponse<Object>> handleDuplicateAttendance(DuplicateAttendanceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(InvalidVerificationStepException.class)
    public ResponseEntity<ApiResponse<Object>> handleInvalidVerificationStep(
            InvalidVerificationStepException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("An unexpected error occurred: " + ex.getMessage(), 
                                   "INTERNAL_SERVER_ERROR"));
    }
}