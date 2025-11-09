package com.secureattend.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "attendance")
public class Attendance {
    @Id
    private String id;
    private String studentId;
    private String studentName;
    private String studentRollNumber;
    private String sessionId;
    private String classId;
    
    private VerificationStep currentStep = VerificationStep.INITIATED;
    private List<String> verificationLayersPassed = new ArrayList<>();
    private Map<String, VerificationDetails> verificationDetails = new HashMap<>();
    
    private boolean qrVerified = false;
    private boolean locationVerified = false;
    private boolean faceVerified = false;
    private boolean systemVerified = false;
    private boolean professorVerified = false;
    private boolean taVerified = false;
    
    private boolean flaggedProxy = false;
    private String proxyReason;
    private ProxySeverity proxySeverity = ProxySeverity.NONE;
    
    private Double studentLatitude;
    private Double studentLongitude;
    private String studentWifiSSID;
    private Double distanceFromClassroom;
    
    private String faceImageBase64;
    private Double faceMatchScore;
    private boolean livenessDetected;
    
    private Instant checkInTime = Instant.now();
    private Instant qrVerifiedAt;
    private Instant locationVerifiedAt;
    private Instant faceVerifiedAt;
    private Instant professorVerifiedAt;
    private Instant taVerifiedAt;
    
    private String deviceInfo;
    private String ipAddress;
    private String notes;
    private String professorNotes;
    private String taNotes;
    
    private AttendanceStatus finalStatus = AttendanceStatus.PENDING;
    
    public enum VerificationStep {
        INITIATED,
        QR_VERIFIED,
        LOCATION_VERIFIED,
        FACE_VERIFIED,
        AWAITING_PROFESSOR,
        AWAITING_TA,
        COMPLETED,
        REJECTED
    }
    
    public enum AttendanceStatus {
        PENDING,
        VERIFIED,
        FLAGGED,
        REJECTED,
        APPROVED
    }
    
    public enum ProxySeverity {
        NONE, LOW, MEDIUM, HIGH, CRITICAL
    }
    
    public static class VerificationDetails {
        private boolean passed;
        private String message;
        private Instant timestamp;
        private Map<String, Object> metadata = new HashMap<>();

        public boolean isPassed() { return passed; }
        public void setPassed(boolean passed) { this.passed = passed; }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        
        public Instant getTimestamp() { return timestamp; }
        public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
        
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    }
    
    public boolean canProceedToLocation() {
        return currentStep == VerificationStep.QR_VERIFIED && qrVerified;
    }
    
    public boolean canProceedToFace() {
        return currentStep == VerificationStep.LOCATION_VERIFIED && locationVerified;
    }
    
    public boolean canProceedToProfessorReview() {
        return currentStep == VerificationStep.FACE_VERIFIED && faceVerified;
    }
    
    public boolean isFullyVerified() {
        return qrVerified && locationVerified && faceVerified && 
               professorVerified && taVerified;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    
    public String getStudentRollNumber() { return studentRollNumber; }
    public void setStudentRollNumber(String studentRollNumber) { this.studentRollNumber = studentRollNumber; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getClassId() { return classId; }
    public void setClassId(String classId) { this.classId = classId; }
    
    public VerificationStep getCurrentStep() { return currentStep; }
    public void setCurrentStep(VerificationStep step) { this.currentStep = step; }
    
    public List<String> getVerificationLayersPassed() { return verificationLayersPassed; }
    public void setVerificationLayersPassed(List<String> layers) { 
        this.verificationLayersPassed = layers; 
    }
    
    public Map<String, VerificationDetails> getVerificationDetails() { return verificationDetails; }
    public void setVerificationDetails(Map<String, VerificationDetails> details) { 
        this.verificationDetails = details; 
    }
    
    public boolean isQrVerified() { return qrVerified; }
    public void setQrVerified(boolean verified) { this.qrVerified = verified; }
    
    public boolean isLocationVerified() { return locationVerified; }
    public void setLocationVerified(boolean verified) { this.locationVerified = verified; }
    
    public boolean isFaceVerified() { return faceVerified; }
    public void setFaceVerified(boolean verified) { this.faceVerified = verified; }
    
    public boolean isSystemVerified() { return systemVerified; }
    public void setSystemVerified(boolean verified) { this.systemVerified = verified; }
    
    public boolean isProfessorVerified() { return professorVerified; }
    public void setProfessorVerified(boolean verified) { this.professorVerified = verified; }
    
    public boolean isTaVerified() { return taVerified; }
    public void setTaVerified(boolean verified) { this.taVerified = verified; }
    
    public boolean isFlaggedProxy() { return flaggedProxy; }
    public void setFlaggedProxy(boolean flagged) { this.flaggedProxy = flagged; }
    
    public String getProxyReason() { return proxyReason; }
    public void setProxyReason(String reason) { this.proxyReason = reason; }
    
    public ProxySeverity getProxySeverity() { return proxySeverity; }
    public void setProxySeverity(ProxySeverity severity) { this.proxySeverity = severity; }
    
    public Double getStudentLatitude() { return studentLatitude; }
    public void setStudentLatitude(Double lat) { this.studentLatitude = lat; }
    
    public Double getStudentLongitude() { return studentLongitude; }
    public void setStudentLongitude(Double lon) { this.studentLongitude = lon; }
    
    public String getStudentWifiSSID() { return studentWifiSSID; }
    public void setStudentWifiSSID(String ssid) { this.studentWifiSSID = ssid; }
    
    public Double getDistanceFromClassroom() { return distanceFromClassroom; }
    public void setDistanceFromClassroom(Double distance) { this.distanceFromClassroom = distance; }
    
    public String getFaceImageBase64() { return faceImageBase64; }
    public void setFaceImageBase64(String image) { this.faceImageBase64 = image; }
    
    public Double getFaceMatchScore() { return faceMatchScore; }
    public void setFaceMatchScore(Double score) { this.faceMatchScore = score; }
    
    public boolean isLivenessDetected() { return livenessDetected; }
    public void setLivenessDetected(Boolean detected) { this.livenessDetected = detected; }
    
    public Instant getCheckInTime() { return checkInTime; }
    public void setCheckInTime(Instant time) { this.checkInTime = time; }
    
    public Instant getQrVerifiedAt() { return qrVerifiedAt; }
    public void setQrVerifiedAt(Instant time) { this.qrVerifiedAt = time; }
    
    public Instant getLocationVerifiedAt() { return locationVerifiedAt; }
    public void setLocationVerifiedAt(Instant time) { this.locationVerifiedAt = time; }
    
    public Instant getFaceVerifiedAt() { return faceVerifiedAt; }
    public void setFaceVerifiedAt(Instant time) { this.faceVerifiedAt = time; }
    
    public Instant getProfessorVerifiedAt() { return professorVerifiedAt; }
    public void setProfessorVerifiedAt(Instant time) { this.professorVerifiedAt = time; }
    
    public Instant getTaVerifiedAt() { return taVerifiedAt; }
    public void setTaVerifiedAt(Instant time) { this.taVerifiedAt = time; }
    
    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String info) { this.deviceInfo = info; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ip) { this.ipAddress = ip; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    
    public String getProfessorNotes() { return professorNotes; }
    public void setProfessorNotes(String notes) { this.professorNotes = notes; }
    
    public String getTaNotes() { return taNotes; }
    public void setTaNotes(String notes) { this.taNotes = notes; }
    
    public AttendanceStatus getFinalStatus() { return finalStatus; }
    public void setFinalStatus(AttendanceStatus status) { this.finalStatus = status; }
}