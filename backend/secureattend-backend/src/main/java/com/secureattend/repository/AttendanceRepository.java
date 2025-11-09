package com.secureattend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.secureattend.domain.Attendance;

@Repository
public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findBySessionId(String sessionId);

    List<Attendance> findByStudentId(String studentId);

    Optional<Attendance> findByStudentIdAndSessionId(String studentId, String sessionId);

    List<Attendance> findByFlaggedProxyTrue();

    List<Attendance> findBySystemVerifiedTrueAndProfessorVerifiedFalse();
}
