package com.secureattend.service;

import com.secureattend.domain.*;
import com.secureattend.dto.*;
import com.secureattend.exception.*;
import com.secureattend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class EnhancedAttendanceService {
    
    @Autowired
    private AttendanceRepository attendanceRepository;
    
    @Autowired
    private SessionRepository sessionRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private CourseClassRepository courseClassRepository;
    
    @Autowired
    private LocationVerificationService locationVerificationService;
    
    @Autowired
    private FaceRecognitionService faceRecognitionService;

    public Attendance initiateAttendance(InitiateAttendanceRequest request) {
        Session session = sessionRepository.findById(request.getSessionId())
            .orElseThrow(() -> new SessionNotFoundException(request.getSessionId()));
        
        if (!session.isOpen()) {
            throw new SessionClosedException(request.getSessionId());
        }
        
        if (session.isExpired()) {
            session.setStatus(Session.SessionStatus.EXPIRED);
            session.setOpen(false);
            sessionRepository.save(session);
            throw new SessionClosedException(request.getSessionId());
        }
        
        Student student = personRepository.findById(request.getStudentId())
            .filter(p -> p instanceof Student)
            .map(p -> (Student) p)
            .orElseThrow(() -> new RuntimeException("Student not found: " + request.getStudentId()));
        
        CourseClass courseClass = courseClassRepository.findById(session.getClassId())
            .orElseThrow(() -> new RuntimeException("Class not found: " + session.getClassId()));
        
        if (!courseClass.getStudentIds().contains(student.getId())) {
            throw new StudentNotEnrolledException(student.getId(), courseClass.getId());
        }
        
        Optional<Attendance> existingAttendance = attendanceRepository
            .findByStudentIdAndSessionId(student.getId(), session.getId());
        
        if (existingAttendance.isPresent()) {
            Attendance existing = existingAttendance.get();
            if (existing.getCurrentStep() != Attendance.VerificationStep.COMPLETED &&
                existing.getCheckInTime().plusSeconds(300).isAfter(Instant.now())) {
                return existing;
            }
            throw new DuplicateAttendanceException(student.getId(), session.getId());
        }
        
        boolean qrValid = verifyQROrCodeword(request.getQrCodeOrCodeword(), session);
        if (!qrValid) {
            throw new InvalidQRCodeException(request.getQrCodeOrCodeword());
        }
        
        Attendance attendance = new Attendance();
        attendance.setStudentId(student.getId());
        attendance.setStudentName(student.getName());
        attendance.setSessionId(session.getId());
        attendance.setClassId(session.getClassId());
        attendance.setDeviceInfo(request.getDeviceInfo());
        attendance.setIpAddress(request.getIpAddress());
        attendance.setCheckInTime(Instant.now());
        
        attendance.setQrVerified(true);
        attendance.setQrVerifiedAt(Instant.now());
        attendance.setCurrentStep(Attendance.VerificationStep.QR_VERIFIED);
        attendance.getVerificationLayersPassed().add("QR_CODE");
        
        Attendance.VerificationDetails qrDetails = new Attendance.VerificationDetails();
        qrDetails.setPassed(true);
        qrDetails.setMessage("QR code verified successfully");
        qrDetails.setTimestamp(Instant.now());
        attendance.getVerificationDetails().put("QR_CODE", qrDetails);
        
        if (!session.isRequireLocation()) {
            attendance.setLocationVerified(true);
            attendance.getVerificationLayersPassed().add("LOCATION_SKIPPED");
            attendance.setCurrentStep(Attendance.VerificationStep.LOCATION_VERIFIED);
        }
        
        Attendance saved = attendanceRepository.save(attendance);
        System.out.println("✓ Attendance initiated for student: " + student.getName());
        
        return saved;
    }


    public Attendance verifyLocation(LocationVerificationRequest request) {
        Attendance attendance = attendanceRepository.findById(request.getAttendanceId())
            .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        
        Session session = sessionRepository.findById(attendance.getSessionId())
            .orElseThrow(() -> new SessionNotFoundException(attendance.getSessionId()));
        
        if (!session.isRequireLocation()) {
            attendance.setLocationVerified(true);
            attendance.setCurrentStep(Attendance.VerificationStep.LOCATION_VERIFIED);
            attendance.getVerificationLayersPassed().add("LOCATION_SKIPPED");
            
            if (!session.isRequireFace()) {
                attendance.setFaceVerified(true);
                attendance.setCurrentStep(Attendance.VerificationStep.FACE_VERIFIED);
                attendance.getVerificationLayersPassed().add("FACE_SKIPPED");
                checkSystemVerification(attendance, session);
            }
            
            return attendanceRepository.save(attendance);
        }
        
        if (!attendance.canProceedToLocation()) {
            throw new InvalidVerificationStepException(
                attendance.getCurrentStep().name(), 
                "LOCATION_VERIFICATION"
            );
        }
        
        VerificationResult result = locationVerificationService.verifyLocation(
            request.getLatitude(),
            request.getLongitude(),
            request.getWifiSSID(),
            session
        );
        
        attendance.setStudentLatitude(request.getLatitude());
        attendance.setStudentLongitude(request.getLongitude());
        attendance.setStudentWifiSSID(request.getWifiSSID());
        attendance.setLocationVerifiedAt(Instant.now());
        
        if (result.isSuccess()) {
            attendance.setLocationVerified(true);
            attendance.setCurrentStep(Attendance.VerificationStep.LOCATION_VERIFIED);
            attendance.getVerificationLayersPassed().add("LOCATION");
            
            if (result.getMetadata().containsKey("distance")) {
                attendance.setDistanceFromClassroom((Double) result.getMetadata().get("distance"));
            }
            
            if (!session.isRequireFace()) {
                attendance.setFaceVerified(true);
                attendance.setCurrentStep(Attendance.VerificationStep.FACE_VERIFIED);
                attendance.getVerificationLayersPassed().add("FACE_SKIPPED");
                checkSystemVerification(attendance, session);
            }
        } else {
            attendance.setLocationVerified(false);
            attendance.setFlaggedProxy(true);
            attendance.setProxyReason(result.getMessage());
            attendance.setProxySeverity(Attendance.ProxySeverity.HIGH);
        }
        
        Attendance.VerificationDetails locationDetails = new Attendance.VerificationDetails();
        locationDetails.setPassed(result.isSuccess());
        locationDetails.setMessage(result.getMessage());
        locationDetails.setTimestamp(Instant.now());
        locationDetails.setMetadata(result.getMetadata());
        attendance.getVerificationDetails().put("LOCATION", locationDetails);
        
        Attendance saved = attendanceRepository.save(attendance);
        
        if (!result.isSuccess()) {
            throw new LocationVerificationFailedException(result.getMessage());
        }
        
        System.out.println("✓ Location verified for student: " + attendance.getStudentName());
        return saved;
    }

    
    public Attendance verifyFace(FaceVerificationRequest request) {
        Attendance attendance = attendanceRepository.findById(request.getAttendanceId())
            .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        
        Session session = sessionRepository.findById(attendance.getSessionId())
            .orElseThrow(() -> new SessionNotFoundException(attendance.getSessionId()));
        
        if (!session.isRequireFace()) {
            attendance.setFaceVerified(true);
            attendance.setCurrentStep(Attendance.VerificationStep.FACE_VERIFIED);
            attendance.getVerificationLayersPassed().add("FACE_SKIPPED");
            checkSystemVerification(attendance, session);
            return attendanceRepository.save(attendance);
        }
        
        if (!attendance.canProceedToFace()) {
            throw new InvalidVerificationStepException(
                attendance.getCurrentStep().name(),
                "FACE_VERIFICATION"
            );
        }
        
        Student student = personRepository.findById(attendance.getStudentId())
            .filter(p -> p instanceof Student)
            .map(p -> (Student) p)
            .orElseThrow(() -> new RuntimeException("Student not found"));
        
        VerificationResult result = faceRecognitionService.verifyFace(
            student,
            request.getFaceImageBase64(),
            request.getLivenessDetected()
        );
        
        attendance.setFaceImageBase64(request.getFaceImageBase64());
        attendance.setLivenessDetected(request.getLivenessDetected());
        attendance.setFaceVerifiedAt(Instant.now());
        
        if (result.isSuccess()) {
            attendance.setFaceVerified(true);
            attendance.setCurrentStep(Attendance.VerificationStep.FACE_VERIFIED);
            attendance.getVerificationLayersPassed().add("FACE_RECOGNITION");
            
            if (result.getMetadata().containsKey("confidence")) {
                attendance.setFaceMatchScore((Double) result.getMetadata().get("confidence"));
            }
            
            checkSystemVerification(attendance, session);
        } else {
            attendance.setFaceVerified(false);
            attendance.setFlaggedProxy(true);
            attendance.setProxyReason(result.getMessage());
            attendance.setProxySeverity(Attendance.ProxySeverity.CRITICAL);
        }
        
        Attendance.VerificationDetails faceDetails = new Attendance.VerificationDetails();
        faceDetails.setPassed(result.isSuccess());
        faceDetails.setMessage(result.getMessage());
        faceDetails.setTimestamp(Instant.now());
        faceDetails.setMetadata(result.getMetadata());
        attendance.getVerificationDetails().put("FACE_RECOGNITION", faceDetails);
        
        Attendance saved = attendanceRepository.save(attendance);
        
        if (!result.isSuccess()) {
            throw new FaceVerificationFailedException(result.getMessage());
        }
        
        System.out.println("✓ Face verified for student: " + attendance.getStudentName());
        return saved;
    }

    private void checkSystemVerification(Attendance attendance, Session session) {
        boolean allVerified = attendance.isQrVerified() &&
            (attendance.isLocationVerified() || !session.isRequireLocation()) &&
            (attendance.isFaceVerified() || !session.isRequireFace());
        
        if (allVerified) {
            attendance.setSystemVerified(true);
            
            if (!session.isRequireProfessorVerification()) {
                attendance.setProfessorVerified(true);
                attendance.getVerificationLayersPassed().add("PROFESSOR_SKIPPED");
                
                if (!session.isRequireTAVerification()) {
                    attendance.setTaVerified(true);
                    attendance.getVerificationLayersPassed().add("TA_SKIPPED");
                    attendance.setCurrentStep(Attendance.VerificationStep.COMPLETED);
                    attendance.setFinalStatus(Attendance.AttendanceStatus.APPROVED);
                } else {
                    attendance.setCurrentStep(Attendance.VerificationStep.AWAITING_TA);
                }
            } else {
                attendance.setCurrentStep(Attendance.VerificationStep.AWAITING_PROFESSOR);
            }
        }
    }

    public Attendance professorVerify(String attendanceId, boolean approved, String notes) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
            .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        
        Session session = sessionRepository.findById(attendance.getSessionId())
            .orElseThrow(() -> new SessionNotFoundException(attendance.getSessionId()));
        
        attendance.setProfessorVerified(approved);
        attendance.setProfessorVerifiedAt(Instant.now());
        attendance.setProfessorNotes(notes);
        
        if (approved) {
            if (session.isRequireTAVerification()) {
                attendance.setCurrentStep(Attendance.VerificationStep.AWAITING_TA);
            } else {
                attendance.setTaVerified(true);
                attendance.getVerificationLayersPassed().add("TA_SKIPPED");
                attendance.setCurrentStep(Attendance.VerificationStep.COMPLETED);
                attendance.setFinalStatus(Attendance.AttendanceStatus.APPROVED);
            }
        } else {
            attendance.setCurrentStep(Attendance.VerificationStep.REJECTED);
            attendance.setFinalStatus(Attendance.AttendanceStatus.REJECTED);
        }
        
        System.out.println("✓ Professor verification: " + (approved ? "APPROVED" : "REJECTED") + 
                         " for student: " + attendance.getStudentName());
        
        return attendanceRepository.save(attendance);
    }

    public Attendance taVerify(String attendanceId, boolean approved, String notes) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
            .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        
        if (!attendance.isProfessorVerified()) {
            throw new RuntimeException("Professor verification required before TA verification");
        }
        
        attendance.setTaVerified(approved);
        attendance.setTaVerifiedAt(Instant.now());
        attendance.setTaNotes(notes);
        
        if (approved) {
            attendance.setCurrentStep(Attendance.VerificationStep.COMPLETED);
            attendance.setFinalStatus(Attendance.AttendanceStatus.APPROVED);
        } else {
            attendance.setCurrentStep(Attendance.VerificationStep.REJECTED);
            attendance.setFinalStatus(Attendance.AttendanceStatus.REJECTED);
        }
        
        System.out.println("✓ TA verification: " + (approved ? "APPROVED" : "REJECTED") + 
                         " for student: " + attendance.getStudentName());
        
        return attendanceRepository.save(attendance);
    }

    private boolean verifyQROrCodeword(String input, Session session) {
        if (input == null || input.trim().isEmpty()) {
            return false;
        }
        
        String normalized = input.trim().toUpperCase();
        return normalized.equals(session.getQrToken()) || 
               normalized.equals(session.getCodeword());
    }

    public List<Attendance> getSessionAttendance(String sessionId) {
        List<Attendance> attendanceList = attendanceRepository.findBySessionId(sessionId);
        if (attendanceList.isEmpty()) {
            return attendanceList;
        }

        List<String> studentIds = attendanceList.stream()
            .map(Attendance::getStudentId)
            .distinct()
            .collect(Collectors.toList());

        Map<String, String> studentRollNumberMap = personRepository.findAllById(studentIds).stream()
            .filter(person -> person instanceof Student)
            .map(person -> (Student) person)
            .collect(Collectors.toMap(Person::getId, Student::getStudentNumber, (existing, replacement) -> existing));

        attendanceList.forEach(attendance -> {
            String rollNumber = studentRollNumberMap.get(attendance.getStudentId());
            if (rollNumber != null) {
                attendance.setStudentRollNumber(rollNumber);
            }
        });

        return attendanceList;
    }

    public List<Attendance> getStudentAttendance(String studentId) {
        return attendanceRepository.findByStudentId(studentId);
    }

    public Optional<Attendance> getAttendanceById(String attendanceId) {
        return attendanceRepository.findById(attendanceId);
    }

    public void deleteAllStudentAttendance(String studentId) {
        System.out.println("[deleteAllStudentAttendance] Deleting all attendance records for student: " + studentId);
        List<Attendance> attendanceRecords = attendanceRepository.findByStudentId(studentId);
        System.out.println("[deleteAllStudentAttendance] Found " + attendanceRecords.size() + " records to delete");
        attendanceRepository.deleteAll(attendanceRecords);
        System.out.println("[deleteAllStudentAttendance] Successfully deleted all attendance records for student: " + studentId);
    }

    public List<Attendance> getFlaggedAttendance() {
        return attendanceRepository.findByFlaggedProxyTrue();
    }

    public List<Attendance> getPendingProfessorVerification(String sessionId) {
        return attendanceRepository.findBySessionId(sessionId).stream()
            .filter(a -> a.isSystemVerified() && !a.isProfessorVerified())
            .toList();
    }

    public List<Attendance> getPendingTAVerification() {
        return attendanceRepository.findBySystemVerifiedTrueAndProfessorVerifiedFalse();
    }

    public Attendance flagProxy(String attendanceId, boolean flagged, String reason) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
            .orElseThrow(() -> new RuntimeException("Attendance not found"));
        
        attendance.setFlaggedProxy(flagged);
        attendance.setProxyReason(reason);
        
        if (flagged) {
            attendance.setProxySeverity(Attendance.ProxySeverity.MEDIUM);
        } else {
            attendance.setProxySeverity(Attendance.ProxySeverity.NONE);
        }
        
        return attendanceRepository.save(attendance);
    }
}