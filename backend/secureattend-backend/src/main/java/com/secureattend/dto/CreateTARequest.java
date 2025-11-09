package com.secureattend.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateTARequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "TA ID is required")
    private String taId;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Supervisor professor ID is required")
    private String supervisorProfessorId;

    private String email;
    private String department;
    private String profilePictureBase64;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getTaId() { return taId; }
    public void setTaId(String taId) { this.taId = taId; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getSupervisorProfessorId() { return supervisorProfessorId; }
    public void setSupervisorProfessorId(String id) { this.supervisorProfessorId = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    
    public String getProfilePictureBase64() { return profilePictureBase64; }
    public void setProfilePictureBase64(String profilePictureBase64) { this.profilePictureBase64 = profilePictureBase64; }
}