package com.secureattend.dto;

import jakarta.validation.constraints.NotBlank;

public class FaceVerificationRequest {
    @NotBlank(message = "Attendance ID is required")
    private String attendanceId;

    @NotBlank(message = "Face image is required")
    private String faceImageBase64;

    private Boolean livenessDetected;

    public String getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(String attendanceId) {
        this.attendanceId = attendanceId;
    }

    public String getFaceImageBase64() {
        return faceImageBase64;
    }

    public void setFaceImageBase64(String image) {
        this.faceImageBase64 = image;
    }

    public Boolean getLivenessDetected() {
        return livenessDetected;
    }

    public void setLivenessDetected(Boolean detected) {
        this.livenessDetected = detected;
    }
}