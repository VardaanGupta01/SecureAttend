package com.secureattend.dto;

public class AuthResponse {
    private String token;
    private String userId;
    private String name;
    private String role;
    private String email;

    public AuthResponse(String token, String userId, String name, String role, String email) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.role = role;
        this.email = email;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

