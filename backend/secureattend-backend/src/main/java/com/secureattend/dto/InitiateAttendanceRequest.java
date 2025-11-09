package com.secureattend.dto;

import jakarta.validation.constraints.NotBlank;

public class InitiateAttendanceRequest {
    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotBlank(message = "Session ID is required")
    private String sessionId;

    @NotBlank(message = "QR code or codeword is required")
    private String qrCodeOrCodeword;

    private String deviceInfo;
    private String ipAddress;

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getQrCodeOrCodeword() {
        return qrCodeOrCodeword;
    }

    public void setQrCodeOrCodeword(String code) {
        this.qrCodeOrCodeword = code;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
}