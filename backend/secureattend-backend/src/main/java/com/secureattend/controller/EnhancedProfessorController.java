package com.secureattend.controller;

import jakarta.validation.Valid;
import java.util.Optional;

import com.secureattend.domain.Attendance;
import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Person;
import com.secureattend.domain.Session;
import com.secureattend.domain.TA;
import com.secureattend.dto.ApiResponse;
import com.secureattend.dto.CreateSessionRequest;
import com.secureattend.dto.UpdateSessionRequest;
import com.secureattend.dto.CreateClassRequest;
import com.secureattend.dto.UpdateProfilePictureRequest;
import com.secureattend.repository.CourseClassRepository;
import com.secureattend.repository.PersonRepository;
import com.secureattend.service.ClassService;
import com.secureattend.service.EnhancedAttendanceService;
import com.secureattend.service.EnhancedSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/professor")
@CrossOrigin(origins = "*")
public class EnhancedProfessorController {

    @Autowired
    private EnhancedSessionService sessionService;

    @Autowired
    private EnhancedAttendanceService attendanceService;

    @Autowired
    private CourseClassRepository courseClassRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private ClassService classService;

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<CourseClass>>> getProfessorClasses(
            @RequestParam String professorId) {

        List<CourseClass> classes = classService.getProfessorClasses(professorId);
        return ResponseEntity.ok(ApiResponse.success(classes));
    }

    @GetMapping("/classes/{classId}")
    public ResponseEntity<ApiResponse<CourseClass>> getClassDetails(
            @PathVariable String classId) {
        try {
            CourseClass courseClass = classService.getClassById(classId);
            return ResponseEntity.ok(ApiResponse.success(courseClass));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "CLASS_NOT_FOUND"));
        }
    }

    @PutMapping("/classes/{classId}")
    public ResponseEntity<ApiResponse<CourseClass>> updateClass(
            @PathVariable String classId,
            @RequestParam String professorId,
            @Valid @RequestBody CreateClassRequest request) {
        try {
            CourseClass updatedClass = classService.updateClass(classId, professorId, request);
            return ResponseEntity.ok(ApiResponse.success(updatedClass, "Class updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "CLASS_UPDATE_FAILED"));
        }
    }

    @DeleteMapping("/classes/{classId}")
    public ResponseEntity<ApiResponse<Object>> deleteClass(
            @PathVariable String classId,
            @RequestParam String professorId) {
        try {
            classService.deleteClass(classId, professorId);
            return ResponseEntity.ok(ApiResponse.success(null, "Class deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "CLASS_DELETION_FAILED"));
        }
    }

    
    @GetMapping("/classes/{classId}/students")
    public ResponseEntity<ApiResponse<List<Person>>> getClassStudents(@PathVariable String classId) {
        try {
            System.out.println("[getClassStudents] Loading students for classId: " + classId);

            CourseClass courseClass = courseClassRepository.findById(classId)
                    .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

            System.out.println("[getClassStudents] Found class with " +
                    (courseClass.getStudentIds() != null ? courseClass.getStudentIds().size() : 0) +
                    " enrolled student IDs");

            List<Person> students = new ArrayList<>();
            if (courseClass.getStudentIds() != null && !courseClass.getStudentIds().isEmpty()) {
                for (String studentId : courseClass.getStudentIds()) {
                    System.out.println("[getClassStudents] Looking up student: " + studentId);
                    Optional<Person> personOpt = personRepository.findById(studentId);
                    if (personOpt.isPresent()) {
                        students.add(personOpt.get());
                        System.out.println("[getClassStudents] Found student: " + personOpt.get().getName());
                    } else {
                        System.out.println("[getClassStudents] Student not found in database: " + studentId);
                    }
                }
            }

            System.out.println("[getClassStudents] Returning " + students.size() + " students");
            return ResponseEntity.ok(ApiResponse.success(students));
        } 
        catch (Exception e) {
            System.err.println("[getClassStudents] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage(), "LOAD_STUDENTS_FAILED"));
        }
    }

    
    @GetMapping("/tas")
    public ResponseEntity<ApiResponse<List<TA>>> getProfessorTAs(@RequestParam String professorId) {
        try {
            System.out.println("[getProfessorTAs] Loading TAs for professorId: " + professorId);

            List<Person> allUsers = personRepository.findAll();
            System.out.println("[getProfessorTAs] Total users in database: " + allUsers.size());

            List<TA> tas = allUsers.stream()
                    .filter(person -> {
                        boolean isTA = person instanceof TA;
                        if (isTA) {
                            System.out.println("[getProfessorTAs] Found TA: " + person.getName());
                        }
                        return isTA;
                    })
                    .map(person -> (TA) person)
                    .filter(ta -> {
                        boolean matches = professorId.equals(ta.getSupervisorProfessorId());
                        System.out.println("[getProfessorTAs] TA " + ta.getName() +
                                " supervisor: " + ta.getSupervisorProfessorId() +
                                " matches: " + matches);
                        return matches;
                    })
                    .collect(Collectors.toList());

            System.out.println("[getProfessorTAs] Returning " + tas.size() + " TAs");
            return ResponseEntity.ok(ApiResponse.success(tas));
        } catch (Exception e) {
            System.err.println("[getProfessorTAs] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage(), "LOAD_TAS_FAILED"));
        }
    }

    @PutMapping("/classes/{classId}/assign-tas")
    public ResponseEntity<ApiResponse<CourseClass>> assignTAsToClass(
            @PathVariable String classId,
            @RequestParam String professorId,
            @RequestBody List<String> taIds) {
        try {
            System.out.println("[assignTAsToClass] Professor " + professorId + " assigning TAs to class: " + classId);
            CourseClass updatedClass = classService.assignTAsToClass(classId, professorId, taIds);
            System.out.println("[assignTAsToClass] TAs assigned successfully");
            return ResponseEntity.ok(ApiResponse.success(updatedClass, "TAs assigned successfully"));
        } catch (Exception e) {
            System.err.println("[assignTAsToClass] Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage(), "ASSIGN_TAS_FAILED"));
        }
    }

    @DeleteMapping("/classes/{classId}/students/{studentId}")
    public ResponseEntity<ApiResponse<Object>> unenrollStudent(
            @PathVariable String classId,
            @PathVariable String studentId,
            @RequestParam String professorId) {
        try {
            classService.unenrollStudent(classId, studentId, professorId);
            return ResponseEntity.ok(ApiResponse.success(null, "Student unenrolled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "UNENROLL_STUDENT_FAILED"));
        }
    }

    @DeleteMapping("/classes/{classId}/tas/{taId}")
    public ResponseEntity<ApiResponse<Object>> unenrollTA(
            @PathVariable String classId,
            @PathVariable String taId,
            @RequestParam String professorId) {
        try {
            classService.unenrollTA(classId, taId, professorId);
            return ResponseEntity.ok(ApiResponse.success(null, "TA unenrolled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "UNENROLL_TA_FAILED"));
        }
    }
    
    @PostMapping("/classes/{classId}/sessions")
    public ResponseEntity<ApiResponse<Session>> createSessionForClass(
            @PathVariable String classId,
            @Valid @RequestBody CreateSessionRequest request) {

        System.out.println("[createSessionForClass] Start - classId: " + classId);

        request.setClassId(classId);
        Session session = sessionService.createSession(request);

        System.out.println("[createSessionForClass] Session created: " + session.getId());

        return ResponseEntity.ok(ApiResponse.success(session, "Session created successfully"));
    }

    
    @GetMapping("/classes/{classId}/sessions")
    public ResponseEntity<ApiResponse<List<Session>>> getAllSessions(
            @PathVariable String classId) {

        List<Session> sessions = sessionService.getAllSessionsForClass(classId);
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    
    @GetMapping("/classes/{classId}/sessions/open")
    public ResponseEntity<ApiResponse<List<Session>>> getOpenSessions(@PathVariable String classId) {
        try {
            List<Session> sessions = sessionService.getOpenSessionsForClass(classId);
            if (sessions == null) {
                sessions = new ArrayList<>();
            }
            return ResponseEntity.ok(ApiResponse.success(sessions));
        } catch (Exception e) {
            System.out.println("Error fetching open sessions: " + e.getMessage());
            return ResponseEntity.ok(ApiResponse.success(new ArrayList<>()));
        }
    }

    
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Session>> getSession(@PathVariable String sessionId) {
        return sessionService.getSessionById(sessionId)
                .map(session -> ResponseEntity.ok(ApiResponse.success(session)))
                .orElse(ResponseEntity.notFound().build());
    }

    
    @PutMapping("/sessions/{sessionId}/activate")
    public ResponseEntity<ApiResponse<Session>> activateSession(@PathVariable String sessionId) {
        Session session = sessionService.activateSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(session, "Session activated"));
    }

    @PutMapping("/sessions/{sessionId}/close")
    public ResponseEntity<ApiResponse<Session>> closeSession(@PathVariable String sessionId) {
        Session session = sessionService.closeSession(sessionId);
        return ResponseEntity.ok(ApiResponse.success(session, "Session closed"));
    }

    
    
    @PutMapping("/sessions/{sessionId}/rotate-qr")
    public ResponseEntity<ApiResponse<Session>> rotateQrCode(@PathVariable String sessionId) {
        try {
            Session session = sessionService.rotateQrCode(sessionId);
            return ResponseEntity.ok(ApiResponse.success(session, "QR code rotated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage(), "QR_ROTATION_FAILED"));
        }
    }

    @GetMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<ApiResponse<List<Attendance>>> getSessionAttendance(
            @PathVariable String sessionId) {

        List<Attendance> attendance = attendanceService.getSessionAttendance(sessionId);
        return ResponseEntity.ok(ApiResponse.success(attendance));
    }

    @GetMapping("/sessions/{sessionId}/attendance/pending")
    public ResponseEntity<ApiResponse<List<Attendance>>> getPendingVerifications(
            @PathVariable String sessionId) {

        List<Attendance> pending = attendanceService.getPendingProfessorVerification(sessionId);
        return ResponseEntity.ok(ApiResponse.success(pending));
    }

    
    @PutMapping("/sessions/{sessionId}/headcount")
    public ResponseEntity<ApiResponse<Session>> updateHeadcount(
            @PathVariable String sessionId,
            @RequestParam int headcount) {

        Session session = sessionService.updateHeadcount(sessionId, headcount);
        return ResponseEntity.ok(ApiResponse.success(session, "Headcount updated"));
    }

    @PutMapping("/attendance/{attendanceId}/verify")
    public ResponseEntity<ApiResponse<Attendance>> verifyAttendance(
            @PathVariable String attendanceId,
            @RequestParam boolean approved,
            @RequestParam(required = false) String notes) {

        Attendance attendance = attendanceService.professorVerify(attendanceId, approved, notes);
        return ResponseEntity.ok(ApiResponse.success(attendance,
                approved ? "Attendance approved" : "Attendance rejected"));
    }

    @PutMapping("/attendance/{attendanceId}/flag")
    public ResponseEntity<ApiResponse<Attendance>> flagProxy(
            @PathVariable String attendanceId,
            @RequestParam boolean flagged,
            @RequestParam(required = false) String reason) {

        Attendance attendance = attendanceService.flagProxy(attendanceId, flagged, reason);
        return ResponseEntity.ok(ApiResponse.success(attendance, "Proxy flag updated"));
    }

    @GetMapping("/attendance/flagged")
    public ResponseEntity<ApiResponse<List<Attendance>>> getFlaggedAttendance() {
        List<Attendance> flagged = attendanceService.getFlaggedAttendance();
        return ResponseEntity.ok(ApiResponse.success(flagged));
    }

    @PutMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Session>> updateSession(
            @PathVariable String sessionId,
            @Valid @RequestBody UpdateSessionRequest request) {
        try {
            Session updatedSession = sessionService.updateSession(sessionId, request);
            return ResponseEntity.ok(ApiResponse.success(updatedSession, "Session updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "SESSION_UPDATE_FAILED"));
        }
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Object>> deleteSession(
            @PathVariable String sessionId) {
        try {
            sessionService.deleteSession(sessionId);
            return ResponseEntity.ok(ApiResponse.success(null, "Session deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "SESSION_DELETE_FAILED"));
        }
    }

    @GetMapping("/{professorId}")
    public ResponseEntity<ApiResponse<Person>> getProfessorDetails(
            @PathVariable String professorId) {
        try {
            Person professor = personRepository.findById(professorId)
                .orElseThrow(() -> new RuntimeException("Professor not found"));
            return ResponseEntity.ok(ApiResponse.success(professor));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "PROFESSOR_NOT_FOUND"));
        }
    }

    @PutMapping("/profile/picture")
    public ResponseEntity<ApiResponse<Person>> updateProfilePicture(
            @RequestParam String userId,
            @RequestBody UpdateProfilePictureRequest request) {
        try {
            Person person = personRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            person.setProfilePictureBase64(request.getProfilePictureBase64());
            person.setUpdatedAt(java.time.Instant.now());
            Person updated = personRepository.save(person);
            return ResponseEntity.ok(ApiResponse.success(updated, "Profile picture updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "PROFILE_UPDATE_FAILED"));
        }
    }
}