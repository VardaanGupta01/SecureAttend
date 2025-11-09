package com.secureattend.domain;

public class Student extends Person {
    private String studentNumber;
    private String major;
    private Integer year;
    private String faceImageUrl;
    private String faceImageBase64;
    private Double cumulativeAttendanceRate;

    @Override
    public void markAttendance(String sessionId) {
        getAttendanceRecordIds().add(sessionId);
    }

    @Override
    public String getDisplayInfo() {
        return String.format("%s (%s) - %s, Year %d", 
            getName(), getStudentNumber(), getMajor(), getYear());
    }

    public String getStudentNumber() { return studentNumber; }
    public void setStudentNumber(String studentNumber) { this.studentNumber = studentNumber; }
    
    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }
    
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    
    public String getFaceImageUrl() { return faceImageUrl; }
    public void setFaceImageUrl(String faceImageUrl) { this.faceImageUrl = faceImageUrl; }
    
    public String getFaceImageBase64() { return faceImageBase64; }
    public void setFaceImageBase64(String faceImageBase64) { this.faceImageBase64 = faceImageBase64; }
    
    public Double getCumulativeAttendanceRate() { return cumulativeAttendanceRate; }
    public void setCumulativeAttendanceRate(Double rate) { this.cumulativeAttendanceRate = rate; }
}