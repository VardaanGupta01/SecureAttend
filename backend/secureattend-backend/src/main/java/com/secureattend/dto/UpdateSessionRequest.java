package com.secureattend.dto;

public class UpdateSessionRequest {
    private Double latitude;
    private Double longitude;
    private String wifiSSID;
    private Double allowedRadiusMeters;
    private Integer durationMinutes;
    private Boolean requireLocation;
    private Boolean requireFace;
    private Boolean requireProfessorVerification;
    private Boolean requireTAVerification;

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

    public void setAllowedRadiusMeters(Double allowedRadiusMeters) {
        this.allowedRadiusMeters = allowedRadiusMeters;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Boolean getRequireLocation() {
        return requireLocation;
    }

    public void setRequireLocation(Boolean requireLocation) {
        this.requireLocation = requireLocation;
    }

    public Boolean getRequireFace() {
        return requireFace;
    }

    public void setRequireFace(Boolean requireFace) {
        this.requireFace = requireFace;
    }

    public Boolean getRequireProfessorVerification() {
        return requireProfessorVerification;
    }

    public void setRequireProfessorVerification(Boolean requireProfessorVerification) {
        this.requireProfessorVerification = requireProfessorVerification;
    }

    public Boolean getRequireTAVerification() {
        return requireTAVerification;
    }

    public void setRequireTAVerification(Boolean requireTAVerification) {
        this.requireTAVerification = requireTAVerification;
    }
}

