package com.secureattend.controller;

import jakarta.validation.Valid;

import com.secureattend.domain.Attendance;
import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Person;
import com.secureattend.dto.*;
import com.secureattend.repository.CourseClassRepository;
import com.secureattend.repository.PersonRepository;
import com.secureattend.service.EnhancedAttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "*")
public class EnhancedStudentController {

    @Autowired
    private EnhancedAttendanceService attendanceService;

    @Autowired
    private CourseClassRepository courseClassRepository;

    @Autowired
    private PersonRepository personRepository;

    
    @PostMapping("/attendance/initiate")
    public ResponseEntity<ApiResponse<Attendance>> initiateAttendance(
            @Valid @RequestBody InitiateAttendanceRequest request) {

        Attendance attendance = attendanceService.initiateAttendance(request);
        return ResponseEntity.ok(ApiResponse.success(attendance,
                "QR verification successful. Proceed to location verification."));
    }

    
    @PostMapping("/attendance/verify-location")
    public ResponseEntity<ApiResponse<Attendance>> verifyLocation(
            @Valid @RequestBody LocationVerificationRequest request) {

        Attendance attendance = attendanceService.verifyLocation(request);
        return ResponseEntity.ok(ApiResponse.success(attendance,
                "Location verified. Proceed to face verification."));
    }

    
    @PostMapping("/attendance/verify-face")
    public ResponseEntity<ApiResponse<Attendance>> verifyFace(
            @Valid @RequestBody FaceVerificationRequest request) {

        Attendance attendance = attendanceService.verifyFace(request);
        return ResponseEntity.ok(ApiResponse.success(attendance,
                "Face verified. Awaiting professor verification."));
    }

    
    @GetMapping("/{studentId}/classes")
    public ResponseEntity<ApiResponse<List<CourseClass>>> getStudentClasses(
            @PathVariable String studentId) {

        List<CourseClass> classes = courseClassRepository.findByStudentIdsContaining(studentId);
        return ResponseEntity.ok(ApiResponse.success(classes));
    }

    
    @GetMapping("/{studentId}/attendance")
    public ResponseEntity<ApiResponse<List<Attendance>>> getStudentAttendance(
            @PathVariable String studentId) {

        List<Attendance> attendance = attendanceService.getStudentAttendance(studentId);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    
    @GetMapping("/attendance/{attendanceId}")
    public ResponseEntity<ApiResponse<Attendance>> getAttendanceById(
            @PathVariable String attendanceId) {

        Optional<Attendance> attendance = attendanceService.getAttendanceById(attendanceId);
        return attendance
                .map(att -> ResponseEntity.ok(ApiResponse.success(att)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{studentId}")
    public ResponseEntity<ApiResponse<Person>> getStudentDetails(
            @PathVariable String studentId) {
        try {
            Person student = personRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
            return ResponseEntity.ok(ApiResponse.success(student));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "STUDENT_NOT_FOUND"));
        }
    }

    @DeleteMapping("/{studentId}/attendance/all")
    public ResponseEntity<ApiResponse<Object>> clearStudentAttendance(
            @PathVariable String studentId) {
        try {
            Person student = personRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
            
            attendanceService.deleteAllStudentAttendance(studentId);
            return ResponseEntity.ok(ApiResponse.success(null, "Attendance history cleared successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "CLEAR_ATTENDANCE_FAILED"));
        }
    }
}