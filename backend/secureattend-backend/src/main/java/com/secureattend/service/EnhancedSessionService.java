package com.secureattend.service;

import com.google.zxing.WriterException;
import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Session;
import com.secureattend.dto.CreateSessionRequest;
import com.secureattend.dto.UpdateSessionRequest;
import com.secureattend.factory.CodeFactory;
import com.secureattend.repository.CourseClassRepository;
import com.secureattend.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class EnhancedSessionService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private CourseClassRepository courseClassRepository;

    @Autowired
    private CodeFactory codeFactory;

    @Autowired
    private QRCodeGenerationService qrCodeGenerationService;

    @Value("${secureattend.session.qr-expiry-minutes:30}")
    private Integer qrExpiryMinutes;

    @Value("${secureattend.session.auto-close-hours:3}")
    private Integer autoCloseHours;

    public Session createSession(CreateSessionRequest request) {
        System.out.println("[createSession] Start - Request for classId: " + request.getClassId());

        CourseClass courseClass = courseClassRepository.findById(request.getClassId())
            .orElseThrow(() -> {
                System.out.println("[createSession] Class not found: " + request.getClassId());
                return new RuntimeException("Class not found: " + request.getClassId());
            });

        System.out.println("[createSession] Found class: " + courseClass.getId());

        Session session = new Session();
        session.setClassId(request.getClassId());

        String qrToken = codeFactory.generateQrToken();
        String codeword = codeFactory.generateCodeword();
        System.out.println("[createSession] Generated tokens -> QR: " + qrToken + ", Codeword: " + codeword);

        session.setQrToken(qrToken);
        session.setCodeword(codeword);

        try {
            System.out.println("[createSession] Generating QR code image...");
            String qrCodeImage = qrCodeGenerationService.generateQRCodeImage(qrToken, 300, 300);
            session.setQrCodeImageBase64(qrCodeImage);
            System.out.println("[createSession] QR code generated successfully.");
        } catch (WriterException | IOException e) {
            System.out.println("[createSession] Failed to generate QR code image: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("[createSession] Setting location and configuration...");
        session.setLocation(courseClass.getLocation());
        session.setLatitude(request.getLatitude());
        session.setLongitude(request.getLongitude());
        session.setWifiSSID(request.getWifiSSID());
        session.setAllowedRadiusMeters(request.getAllowedRadiusMeters());

        session.setRequireLocation(request.getRequireLocation());
        session.setRequireFace(request.getRequireFace());
        session.setRequireProfessorVerification(request.getRequireProfessorVerification());
        session.setRequireTAVerification(request.getRequireTAVerification());

        Instant now = Instant.now();
        session.setStartTime(now);
        session.setExpiresAt(now.plus(qrExpiryMinutes, ChronoUnit.MINUTES));
        session.setEndTime(now.plus(request.getDurationMinutes(), ChronoUnit.MINUTES));

        System.out.println("[createSession] Setting enrolled students...");
        if (courseClass.getStudentIds() != null) {
            session.setAllowedStudentIds(courseClass.getStudentIds());
            session.setMaxAttendees(courseClass.getStudentIds().size());
            session.setExpectedAttendeeCount(courseClass.getStudentIds().size());
            System.out.println("[createSession] Student count: " + courseClass.getStudentIds().size());
        } else {
            System.out.println("[createSession] courseClass.getStudentIds() is NULL!");
        }

        session.setOpen(true);
        session.setStatus(Session.SessionStatus.ACTIVE);

        Session saved = sessionRepository.save(session);
        System.out.println("[createSession] Session saved: " + saved.getId() +
                           " | QR: " + qrToken + " | Codeword: " + codeword);

        return saved;
    }

    public Session closeSession(String sessionId) {
        System.out.println("[closeSession] Closing session: " + sessionId);
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> {
                System.out.println("[closeSession] Session not found: " + sessionId);
                return new RuntimeException("Session not found: " + sessionId);
            });

        session.setOpen(false);
        session.setStatus(Session.SessionStatus.CLOSED);
        session.setEndTime(Instant.now());

        Session saved = sessionRepository.save(session);
        System.out.println("[closeSession] Session closed and saved: " + sessionId);
        return saved;
    }

    public Session updateHeadcount(String sessionId, int headcount) {
        System.out.println("[updateHeadcount] Updating headcount for session: " + sessionId);
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> {
                System.out.println("[updateHeadcount] Session not found: " + sessionId);
                return new RuntimeException("Session not found: " + sessionId);
            });

        session.setProfessorHeadcount(headcount);
        session.setActualAttendeeCount(headcount);

        Session saved = sessionRepository.save(session);
        System.out.println("[updateHeadcount] Headcount updated to " + headcount + " for session " + sessionId);
        return saved;
    }

    public List<Session> getOpenSessionsForClass(String classId) {
        System.out.println("[getOpenSessionsForClass] Fetching open sessions for classId: " + classId);
        List<Session> sessions = null;
        try {
            sessions = sessionRepository.findByClassIdAndOpen(classId, true);
            System.out.println("[getOpenSessionsForClass] Found " +
                               (sessions != null ? sessions.size() : 0) + " open sessions for classId: " + classId);
        } catch (Exception e) {
            System.out.println("[getOpenSessionsForClass] Error fetching open sessions for classId: " + classId);
            e.printStackTrace();
        }
        return sessions;
    }

    public List<Session> getAllSessionsForClass(String classId) {
        System.out.println("[getAllSessionsForClass] Fetching all sessions for classId: " + classId);
        return sessionRepository.findByClassId(classId);
    }

    public Optional<Session> getSessionById(String sessionId) {
        System.out.println("[getSessionById] Fetching session by ID: " + sessionId);
        return sessionRepository.findById(sessionId);
    }

    public Session activateSession(String sessionId) {
        System.out.println("[activateSession] Activating session: " + sessionId);
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        session.setOpen(true);
        session.setStatus(Session.SessionStatus.ACTIVE);
        session.setStartTime(Instant.now());

        Session saved = sessionRepository.save(session);
        System.out.println("[activateSession] Session activated: " + sessionId);
        return saved;
    }

    public void autoExpireSessions() {
        System.out.println("[autoExpireSessions] Checking for expired sessions...");
        List<Session> activeSessions = sessionRepository.findByStatus(Session.SessionStatus.ACTIVE);
        System.out.println("[autoExpireSessions] Active sessions count: " + activeSessions.size());

        for (Session session : activeSessions) {
            if (session.isExpired()) {
                session.setOpen(false);
                session.setStatus(Session.SessionStatus.EXPIRED);
                sessionRepository.save(session);
                System.out.println("[autoExpireSessions] Auto-expired session: " + session.getId());
            }
        }
    }

    public Session rotateQrCode(String sessionId) {
    System.out.println("[rotateQrCode] Rotating QR code for sessionId: " + sessionId);

    Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

    String newQrToken = codeFactory.generateQrToken();
    String newCodeword = codeFactory.generateCodeword();

    try {
        String newQrCodeImage = qrCodeGenerationService.generateQRCodeImage(newQrToken, 300, 300);
        session.setQrCodeImageBase64(newQrCodeImage);
    } catch (Exception e) {
        System.out.println("[rotateQrCode] Failed to regenerate QR code image: " + e.getMessage());
        e.printStackTrace();
    }

    session.setQrToken(newQrToken);
    session.setCodeword(newCodeword);

    Session updatedSession = sessionRepository.save(session);
    System.out.println("[rotateQrCode] QR rotated successfully for session: " + updatedSession.getId());
    return updatedSession;
}

    public Session updateSession(String sessionId, UpdateSessionRequest request) {
        System.out.println("[updateSession] Updating session: " + sessionId);
        
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> {
                System.out.println("[updateSession] Session not found: " + sessionId);
                return new RuntimeException("Session not found: " + sessionId);
            });

        if (request.getLatitude() != null) {
            session.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            session.setLongitude(request.getLongitude());
        }
        if (request.getWifiSSID() != null) {
            session.setWifiSSID(request.getWifiSSID());
        }
        if (request.getAllowedRadiusMeters() != null) {
            session.setAllowedRadiusMeters(request.getAllowedRadiusMeters());
        }

        if (request.getDurationMinutes() != null) {
            Instant startTime = session.getStartTime() != null ? session.getStartTime() : Instant.now();
            session.setEndTime(startTime.plus(request.getDurationMinutes(), ChronoUnit.MINUTES));
        }

        if (request.getRequireLocation() != null) {
            session.setRequireLocation(request.getRequireLocation());
        }
        if (request.getRequireFace() != null) {
            session.setRequireFace(request.getRequireFace());
        }
        if (request.getRequireProfessorVerification() != null) {
            session.setRequireProfessorVerification(request.getRequireProfessorVerification());
        }
        if (request.getRequireTAVerification() != null) {
            session.setRequireTAVerification(request.getRequireTAVerification());
        }

        Session saved = sessionRepository.save(session);
        System.out.println("[updateSession] Session updated successfully: " + sessionId);
        return saved;
    }

    public void deleteSession(String sessionId) {
        System.out.println("[deleteSession] Deleting session: " + sessionId);
        
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> {
                System.out.println("[deleteSession] Session not found: " + sessionId);
                return new RuntimeException("Session not found: " + sessionId);
            });

        sessionRepository.delete(session);
        System.out.println("[deleteSession] Session deleted successfully: " + sessionId);
}

}
