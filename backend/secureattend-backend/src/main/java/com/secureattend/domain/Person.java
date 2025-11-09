package com.secureattend.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public abstract class Person {
    @Id
    private String id;
    private String email;
    private String password;
    private String name;
    private Role role;
    private List<String> attendanceRecordIds = new ArrayList<>();
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
    private boolean active = true;
    private String profilePictureBase64; 

    public enum Role {
        STUDENT, PROFESSOR, TA, ADMIN
    }

    public abstract void markAttendance(String sessionId);
    public abstract String getDisplayInfo();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    
    public List<String> getAttendanceRecordIds() { return attendanceRecordIds; }
    public void setAttendanceRecordIds(List<String> attendanceRecordIds) { 
        this.attendanceRecordIds = attendanceRecordIds; 
    }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    
    public String getProfilePictureBase64() { return profilePictureBase64; }
    public void setProfilePictureBase64(String profilePictureBase64) { this.profilePictureBase64 = profilePictureBase64; }
}