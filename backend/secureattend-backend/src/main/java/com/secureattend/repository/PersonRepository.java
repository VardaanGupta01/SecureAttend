package com.secureattend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import com.secureattend.domain.Person;
import java.util.Optional;

@Repository
public interface PersonRepository extends MongoRepository<Person, String> {
    Optional<Person> findByEmail(String email);
    
    @Query("{ 'studentNumber': ?0 }")
    Optional<Person> findByStudentNumber(String studentNumber);
    
    @Query("{ 'taId': ?0 }")
    Optional<Person> findByTaId(String taId);
}
