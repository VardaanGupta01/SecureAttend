package com.secureattend.controller;

import com.secureattend.domain.Attendance;
import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Session;
import com.secureattend.domain.Person;
import com.secureattend.dto.ApiResponse;
import com.secureattend.dto.UpdateProfilePictureRequest;
import com.secureattend.service.ClassService;
import com.secureattend.service.EnhancedAttendanceService;
import com.secureattend.service.EnhancedSessionService;
import com.secureattend.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

 
@RestController
@RequestMapping("/api/ta")
@CrossOrigin(origins = "*")
public class EnhancedTAController {
    
    @Autowired
    private EnhancedAttendanceService attendanceService;

    @Autowired
    private ClassService classService;

    @Autowired
    private EnhancedSessionService sessionService;

    @Autowired
    private PersonRepository personRepository;

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<CourseClass>>> getTAClasses(
            @RequestParam String taId) {
        try {
            System.out.println("[getTAClasses] Loading classes for TA: " + taId);
            List<CourseClass> classes = classService.getTAClasses(taId);
            System.out.println("[getTAClasses] Returning " + classes.size() + " classes");
            return ResponseEntity.ok(ApiResponse.success(classes));
        } catch (Exception e) {
            System.err.println("[getTAClasses] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_CLASSES_FAILED"));
        }
    }

    @GetMapping("/classes/{classId}/sessions")
    public ResponseEntity<ApiResponse<List<Session>>> getClassSessions(
            @PathVariable String classId,
            @RequestParam String taId) {
        try {
            System.out.println("[getClassSessions] TA " + taId + " requesting sessions for class: " + classId);
            
            if (!classService.taHasAccessToClass(taId, classId)) {
                System.out.println("[getClassSessions] Access denied for TA: " + taId);
                return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied: You are not assigned to this class", 
                                          "ACCESS_DENIED"));
            }

            List<Session> sessions = sessionService.getAllSessionsForClass(classId);
            System.out.println("[getClassSessions] Returning " + sessions.size() + " sessions");
            return ResponseEntity.ok(ApiResponse.success(sessions));
        } catch (Exception e) {
            System.err.println("[getClassSessions] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_SESSIONS_FAILED"));
        }
    }

    @GetMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<ApiResponse<List<Attendance>>> getSessionAttendance(
            @PathVariable String sessionId,
            @RequestParam String taId) {
        try {
            System.out.println("[getSessionAttendance] TA " + taId + " requesting attendance for session: " + sessionId);
            
            Session session = sessionService.getSessionById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

            if (!classService.taHasAccessToClass(taId, session.getClassId())) {
                System.out.println("[getSessionAttendance] Access denied for TA: " + taId);
                return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied: You are not assigned to this class", 
                                          "ACCESS_DENIED"));
            }

            List<Attendance> attendance = attendanceService.getSessionAttendance(sessionId);
            System.out.println("[getSessionAttendance] Returning " + attendance.size() + " attendance records");
            return ResponseEntity.ok(ApiResponse.success(attendance));
        } catch (Exception e) {
            System.err.println("[getSessionAttendance] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_ATTENDANCE_FAILED"));
        }
    }

    @GetMapping("/sessions/{sessionId}/report")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateSessionReport(
            @PathVariable String sessionId,
            @RequestParam String taId) {
        try {
            System.out.println("[generateSessionReport] Generating report for session: " + sessionId);
            
            Session session = sessionService.getSessionById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

            if (!classService.taHasAccessToClass(taId, session.getClassId())) {
                System.out.println("[generateSessionReport] Access denied for TA: " + taId);
                return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied", "ACCESS_DENIED"));
            }

            List<Attendance> attendance = attendanceService.getSessionAttendance(sessionId);

            long systemVerified = attendance.stream().filter(Attendance::isSystemVerified).count();
            long professorVerified = attendance.stream().filter(Attendance::isProfessorVerified).count();
            long taVerified = attendance.stream().filter(Attendance::isTaVerified).count();
            long flagged = attendance.stream().filter(Attendance::isFlaggedProxy).count();
            long fullyApproved = attendance.stream()
                .filter(a -> a.isSystemVerified() && a.isProfessorVerified() && a.isTaVerified())
                .count();
            long pending = attendance.stream()
                .filter(a -> a.isSystemVerified() && !a.isProfessorVerified())
                .count();
            
            double verificationRate = attendance.isEmpty() ? 0 : 
                (attendance.stream().filter(a -> a.isSystemVerified() && a.isProfessorVerified()).count() * 100.0 / attendance.size());

            Map<String, Object> report = new HashMap<>();
            report.put("sessionId", sessionId);
            report.put("totalAttendance", attendance.size());
            report.put("systemVerified", systemVerified);
            report.put("professorVerified", professorVerified);
            report.put("taVerified", taVerified);
            report.put("flagged", flagged);
            report.put("fullyApproved", fullyApproved);
            report.put("pending", pending);
            report.put("verificationRate", verificationRate);

            System.out.println("[generateSessionReport] Report generated successfully");
            return ResponseEntity.ok(ApiResponse.success(report));
        } catch (Exception e) {
            System.err.println("[generateSessionReport] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "REPORT_GENERATION_FAILED"));
        }
    }

  
    @GetMapping("/students/{studentId}/attendance")
    public ResponseEntity<ApiResponse<List<Attendance>>> getStudentAttendance(
            @PathVariable String studentId,
            @RequestParam String taId) {
        try {
            System.out.println("[getStudentAttendance] TA " + taId + " requesting history for student: " + studentId);
            
            List<CourseClass> taClasses = classService.getTAClasses(taId);
            List<String> classIds = taClasses.stream()
                .map(CourseClass::getId)
                .collect(Collectors.toList());

            System.out.println("[getStudentAttendance] TA has access to " + classIds.size() + " classes");

            List<Attendance> allAttendance = attendanceService.getStudentAttendance(studentId);
            List<Attendance> filteredAttendance = allAttendance.stream()
                .filter(att -> classIds.contains(att.getClassId()))
                .collect(Collectors.toList());

            System.out.println("[getStudentAttendance] Returning " + filteredAttendance.size() + " attendance records");
            return ResponseEntity.ok(ApiResponse.success(filteredAttendance));
        } catch (Exception e) {
            System.err.println("[getStudentAttendance] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_ATTENDANCE_FAILED"));
        }
    }

    @GetMapping("/students/history")
    public ResponseEntity<ApiResponse<List<Attendance>>> getStudentAttendanceByRollNumber(
            @RequestParam String studentRollNumber,
            @RequestParam String taId) {
        try {
            System.out.println("[getStudentAttendanceByRollNumber] TA " + taId + " requesting history for student roll number: " + studentRollNumber);

            com.secureattend.domain.Person student = personRepository.findByStudentNumber(studentRollNumber)
                .orElseThrow(() -> new RuntimeException("Student not found with roll number: " + studentRollNumber));
            
            String studentId = student.getId();
            System.out.println("[getStudentAttendanceByRollNumber] Found student: " + student.getName() + " with ID: " + studentId);

            List<CourseClass> taClasses = classService.getTAClasses(taId);
            List<String> classIds = taClasses.stream()
                .map(CourseClass::getId)
                .collect(Collectors.toList());

            System.out.println("[getStudentAttendanceByRollNumber] TA has access to " + classIds.size() + " classes");

            List<Attendance> allAttendance = attendanceService.getStudentAttendance(studentId);
            List<Attendance> filteredAttendance = allAttendance.stream()
                .filter(att -> classIds.contains(att.getClassId()))
                .collect(Collectors.toList());

            System.out.println("[getStudentAttendanceByRollNumber] Returning " + filteredAttendance.size() + " attendance records");
            return ResponseEntity.ok(ApiResponse.success(filteredAttendance));
        } catch (Exception e) {
            System.err.println("[getStudentAttendanceByRollNumber] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_ATTENDANCE_FAILED"));
        }
    }

    @GetMapping("/attendance/flagged")
    public ResponseEntity<ApiResponse<List<Attendance>>> getFlaggedAttendance(
            @RequestParam String taId) {
        try {
            System.out.println("[getFlaggedAttendance] Loading flagged attendance for TA: " + taId);
            
            List<CourseClass> taClasses = classService.getTAClasses(taId);
            List<String> classIds = taClasses.stream()
                .map(CourseClass::getId)
                .collect(Collectors.toList());

            List<Attendance> allFlagged = attendanceService.getFlaggedAttendance();
            List<Attendance> filteredFlagged = allFlagged.stream()
                .filter(att -> classIds.contains(att.getClassId()))
                .collect(Collectors.toList());

            System.out.println("[getFlaggedAttendance] Returning " + filteredFlagged.size() + " flagged records");
            return ResponseEntity.ok(ApiResponse.success(filteredFlagged));
        } catch (Exception e) {
            System.err.println("[getFlaggedAttendance] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_FLAGGED_FAILED"));
        }
    }

    @GetMapping("/attendance/pending")
    public ResponseEntity<ApiResponse<List<Attendance>>> getPendingVerifications(
            @RequestParam String taId) {
        try {
            System.out.println("[getPendingVerifications] Loading pending verifications for TA: " + taId);
            
            List<CourseClass> taClasses = classService.getTAClasses(taId);
            List<String> classIds = taClasses.stream()
                .map(CourseClass::getId)
                .collect(Collectors.toList());

            List<Attendance> allPending = attendanceService.getPendingTAVerification();
            List<Attendance> filteredPending = allPending.stream()
                .filter(att -> classIds.contains(att.getClassId()))
                .collect(Collectors.toList());

            System.out.println("[getPendingVerifications] Returning " + filteredPending.size() + " pending records");
            return ResponseEntity.ok(ApiResponse.success(filteredPending));
        } catch (Exception e) {
            System.err.println("[getPendingVerifications] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "LOAD_PENDING_FAILED"));
        }
    }

    @PutMapping("/attendance/{attendanceId}/verify")
    public ResponseEntity<ApiResponse<Attendance>> verifyAttendance(
            @PathVariable String attendanceId,
            @RequestParam String taId,
            @RequestParam boolean approved,
            @RequestParam(required = false) String notes) {
        try {
            System.out.println("[verifyAttendance] TA " + taId + " verifying attendance: " + attendanceId + " - " + (approved ? "APPROVED" : "REJECTED"));
            
            Attendance attendance = attendanceService.getAttendanceById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance not found: " + attendanceId));

            if (!classService.taHasAccessToClass(taId, attendance.getClassId())) {
                System.out.println("[verifyAttendance] Access denied for TA: " + taId);
                return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied: You are not assigned to this class", 
                                          "ACCESS_DENIED"));
            }

            Attendance verified = attendanceService.taVerify(attendanceId, approved, notes);
            System.out.println("[verifyAttendance] Attendance verified successfully");
            
            return ResponseEntity.ok(ApiResponse.success(verified,
                approved ? "Final approval granted" : "Attendance rejected"));
        } catch (Exception e) {
            System.err.println("[verifyAttendance] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "VERIFICATION_FAILED"));
        }
    }

 
    @PutMapping("/attendance/{attendanceId}/flag")
    public ResponseEntity<ApiResponse<Attendance>> flagProxy(
            @PathVariable String attendanceId,
            @RequestParam String taId,
            @RequestParam boolean flagged,
            @RequestParam(required = false) String reason) {
        try {
            System.out.println("[flagProxy] TA " + taId + " flagging attendance: " + attendanceId + " - Flagged: " + flagged);
            
            Attendance attendance = attendanceService.getAttendanceById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance not found: " + attendanceId));

            if (!classService.taHasAccessToClass(taId, attendance.getClassId())) {
                System.out.println("[flagProxy] Access denied for TA: " + taId);
                return ResponseEntity.status(403)
                    .body(ApiResponse.error("Access denied", "ACCESS_DENIED"));
            }

            Attendance flaggedAttendance = attendanceService.flagProxy(attendanceId, flagged, reason);
            System.out.println("[flagProxy] Proxy flag updated successfully");
            
            return ResponseEntity.ok(ApiResponse.success(flaggedAttendance, "Proxy flag updated"));
        } catch (Exception e) {
            System.err.println("[flagProxy] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "FLAG_UPDATE_FAILED"));
        }
    }

    @GetMapping("/{taId}")
    public ResponseEntity<ApiResponse<Person>> getTADetails(
            @PathVariable String taId) {
        try {
            Person ta = personRepository.findById(taId)
                .orElseThrow(() -> new RuntimeException("TA not found"));
            return ResponseEntity.ok(ApiResponse.success(ta));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "TA_NOT_FOUND"));
        }
    }
}