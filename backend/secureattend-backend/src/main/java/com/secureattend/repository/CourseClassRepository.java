package com.secureattend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.secureattend.domain.CourseClass;


@Repository
public interface CourseClassRepository extends MongoRepository<CourseClass, String> {
    
    Optional<CourseClass> findByCode(String code);

    List<CourseClass> findByStudentIdsContaining(String studentId);

    List<CourseClass> findByProfessorId(String professorId);

    List<CourseClass> findByTaIdsContaining(String taId);
    
    Optional<CourseClass> findByCodeAndProfessorId(String code, String professorId);

    List<CourseClass> findByProfessorIdAndActiveTrue(String professorId);
    
    List<CourseClass> findByActiveTrue();
    
    List<CourseClass> findByProfessorIdAndSemester(String professorId, String semester);
    
    long countByProfessorId(String professorId);

    long countByProfessorIdAndActiveTrue(String professorId);
}