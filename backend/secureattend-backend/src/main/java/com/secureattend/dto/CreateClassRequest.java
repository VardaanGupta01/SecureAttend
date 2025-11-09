package com.secureattend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;


public class CreateClassRequest {
    
    @NotBlank(message = "Class code is required")
    private String code;

    @NotBlank(message = "Class title is required")
    private String title;

    private String description;

    @NotBlank(message = "Semester is required")
    private String semester;

    private Integer credits;

    private String schedule;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    private String wifiSSID;

    public CreateClassRequest() {
    }

    public CreateClassRequest(String code, String title, String description, String semester, 
                            Integer credits, String schedule, String location, 
                            Double latitude, Double longitude, String wifiSSID) {
        this.code = code;
        this.title = title;
        this.description = description;
        this.semester = semester;
        this.credits = credits;
        this.schedule = schedule;
        this.location = location;
        this.latitude = latitude;
        this.longitude = longitude;
        this.wifiSSID = wifiSSID;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public String getSchedule() {
        return schedule;
    }

    public void setSchedule(String schedule) {
        this.schedule = schedule;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
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

    @Override
    public String toString() {
        return "CreateClassRequest{" +
                "code='" + code + '\'' +
                ", title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", semester='" + semester + '\'' +
                ", credits=" + credits +
                ", schedule='" + schedule + '\'' +
                ", location='" + location + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", wifiSSID='" + wifiSSID + '\'' +
                '}';
    }
}