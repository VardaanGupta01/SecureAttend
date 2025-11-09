package com.secureattend.controller;

import com.secureattend.domain.CourseClass;
import com.secureattend.dto.ApiResponse;
import com.secureattend.dto.CreateClassRequest;
import com.secureattend.service.ClassService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/professor/classes")
@CrossOrigin(origins = "*")
public class ClassController {

    @Autowired
    private ClassService classService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseClass>> createClass(
            @RequestParam String professorId,
            @Valid @RequestBody CreateClassRequest request) {
        try {
            CourseClass courseClass = classService.createClass(professorId, request);
            return ResponseEntity.ok(ApiResponse.success(courseClass, "Class created successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "CLASS_CREATION_FAILED"));
        }
    }

}