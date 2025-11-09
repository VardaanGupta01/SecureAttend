package com.secureattend.dto;

import jakarta.validation.constraints.NotNull;

public class CreateSessionRequest {
    private String classId;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    private String wifiSSID;
    private Double allowedRadiusMeters = 50.0;
    private Integer durationMinutes = 120;
    private Boolean requireLocation = true;
    private Boolean requireFace = true;
    private Boolean requireProfessorVerification = true;
    private Boolean requireTAVerification = true;

    public String getClassId() {
        return classId;
    }

    public void setClassId(String classId) {
        this.classId = classId;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getWifiSSID() {
        return wifiSSID;
    }

    public void setWifiSSID(String wifiSSID) {
        this.wifiSSID = wifiSSID;
    }

    public Double getAllowedRadiusMeters() {
        return allowedRadiusMeters;
    }

    public void setAllowedRadiusMeters(Double radius) {
        this.allowedRadiusMeters = radius;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer duration) {
        this.durationMinutes = duration;
    }

    public Boolean getRequireLocation() {
        return requireLocation;
    }

    public void setRequireLocation(Boolean require) {
        this.requireLocation = require;
    }

    public Boolean getRequireFace() {
        return requireFace;
    }

    public void setRequireFace(Boolean require) {
        this.requireFace = require;
    }

    public Boolean getRequireProfessorVerification() {
        return requireProfessorVerification;
    }

    public void setRequireProfessorVerification(Boolean require) {
        this.requireProfessorVerification = require;
    }

    public Boolean getRequireTAVerification() {
        return requireTAVerification;
    }

    public void setRequireTAVerification(Boolean require) {
        this.requireTAVerification = require;
    }
}