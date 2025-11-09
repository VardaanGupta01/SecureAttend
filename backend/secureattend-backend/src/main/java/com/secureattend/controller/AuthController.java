package com.secureattend.controller;

import com.secureattend.domain.Student;
import com.secureattend.domain.TA;
import com.secureattend.dto.*;
import com.secureattend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/professor/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> professorSignup(
            @Valid @RequestBody SignupRequest request) {
        try {
            AuthResponse response = authService.professorSignup(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Professor registered successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "SIGNUP_FAILED"));
        }
    }

    @PostMapping("/professor/login")
    public ResponseEntity<ApiResponse<AuthResponse>> professorLogin(
            @Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.professorLogin(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOGIN_FAILED"));
        }
    }

    @PostMapping("/professor/enroll-student")
    public ResponseEntity<ApiResponse<Student>> enrollStudent(
            @Valid @RequestBody EnrollStudentRequest request) {
        try {
            Student student = authService.enrollStudent(request);
            return ResponseEntity.ok(ApiResponse.success(student, "Student enrolled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "ENROLLMENT_FAILED"));
        }
    }

    @PostMapping("/student/login")
    public ResponseEntity<ApiResponse<AuthResponse>> studentLogin(
            @Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.studentLogin(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOGIN_FAILED"));
        }
    }

    @PostMapping("/professor/create-ta")
    public ResponseEntity<ApiResponse<TA>> createTA(
            @Valid @RequestBody CreateTARequest request) {
        try {
            TA ta = authService.createTA(request);
            return ResponseEntity.ok(ApiResponse.success(ta, "TA created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "TA_CREATION_FAILED"));
        }
    }

    @PostMapping("/ta/login")
    public ResponseEntity<ApiResponse<AuthResponse>> taLogin(
            @Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.taLogin(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOGIN_FAILED"));
        }
    }
}