package com.secureattend.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "sessions")
public class Session {
    @Id
    private String id;
    private String classId;
    private String qrToken;
    private String qrCodeImageBase64;
    private String codeword;
    private Instant startTime;
    private Instant endTime;
    private Instant expiresAt;
    private boolean open;
    private SessionStatus status = SessionStatus.SCHEDULED;
    private int professorHeadcount;
    private int expectedAttendeeCount;
    private int actualAttendeeCount;
    
    private String location;
    private Double latitude;
    private Double longitude;
    private String wifiSSID;
    private Double allowedRadiusMeters = 50.0;
    
    private List<String> allowedStudentIds = new ArrayList<>();
    private int maxAttendees;
    
    private boolean requireLocation = true;
    private boolean requireFace = true;
    private boolean requireProfessorVerification = true;
    private boolean requireTAVerification = true;
    
    private boolean enableQrRotation = false;
    private Integer qrRotationIntervalSeconds; 
    private Instant lastQrRotationAt;
    private Instant nextQrRotationAt;
    
    private Instant createdAt = Instant.now();

    public enum SessionStatus {
        SCHEDULED, ACTIVE, CLOSED, CANCELLED, EXPIRED
    }
    
    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }
    
    public boolean isStudentAllowed(String studentId) {
        return allowedStudentIds.isEmpty() || allowedStudentIds.contains(studentId);
    }
    
    public boolean shouldRotateQr() {
        if (!enableQrRotation || nextQrRotationAt == null) {
            return false;
        }
        return Instant.now().isAfter(nextQrRotationAt);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getClassId() { return classId; }
    public void setClassId(String classId) { this.classId = classId; }
    
    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }
    
    public String getQrCodeImageBase64() { return qrCodeImageBase64; }
    public void setQrCodeImageBase64(String img) { this.qrCodeImageBase64 = img; }
    
    public String getCodeword() { return codeword; }
    public void setCodeword(String codeword) { this.codeword = codeword; }
    
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    
    public boolean isOpen() { return open; }
    public void setOpen(boolean open) { this.open = open; }
    
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
    
    public int getProfessorHeadcount() { return professorHeadcount; }
    public void setProfessorHeadcount(int count) { this.professorHeadcount = count; }
    
    public int getExpectedAttendeeCount() { return expectedAttendeeCount; }
    public void setExpectedAttendeeCount(int count) { this.expectedAttendeeCount = count; }
    
    public int getActualAttendeeCount() { return actualAttendeeCount; }
    public void setActualAttendeeCount(int count) { this.actualAttendeeCount = count; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    
    public String getWifiSSID() { return wifiSSID; }
    public void setWifiSSID(String wifiSSID) { this.wifiSSID = wifiSSID; }
    
    public Double getAllowedRadiusMeters() { return allowedRadiusMeters; }
    public void setAllowedRadiusMeters(Double radius) { this.allowedRadiusMeters = radius; }
    
    public List<String> getAllowedStudentIds() { return allowedStudentIds; }
    public void setAllowedStudentIds(List<String> ids) { this.allowedStudentIds = ids; }
    
    public int getMaxAttendees() { return maxAttendees; }
    public void setMaxAttendees(int max) { this.maxAttendees = max; }
    
    public boolean isRequireLocation() { return requireLocation; }
    public void setRequireLocation(boolean require) { this.requireLocation = require; }
    
    public boolean isRequireFace() { return requireFace; }
    public void setRequireFace(boolean require) { this.requireFace = require; }
    
    public boolean isRequireProfessorVerification() { return requireProfessorVerification; }
    public void setRequireProfessorVerification(boolean require) { 
        this.requireProfessorVerification = require; 
    }
    
    public boolean isRequireTAVerification() { return requireTAVerification; }
    public void setRequireTAVerification(boolean require) { this.requireTAVerification = require; }
    
    public boolean isEnableQrRotation() { return enableQrRotation; }
    public void setEnableQrRotation(boolean enable) { this.enableQrRotation = enable; }
    
    public Integer getQrRotationIntervalSeconds() { return qrRotationIntervalSeconds; }
    public void setQrRotationIntervalSeconds(Integer seconds) { this.qrRotationIntervalSeconds = seconds; }
    
    public Instant getLastQrRotationAt() { return lastQrRotationAt; }
    public void setLastQrRotationAt(Instant time) { this.lastQrRotationAt = time; }
    
    public Instant getNextQrRotationAt() { return nextQrRotationAt; }
    public void setNextQrRotationAt(Instant time) { this.nextQrRotationAt = time; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}