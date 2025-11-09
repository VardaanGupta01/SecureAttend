package com.secureattend.service;

import com.secureattend.domain.*;
import com.secureattend.dto.*;
import com.secureattend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private CourseClassRepository courseClassRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;


    public AuthResponse professorSignup(SignupRequest request) {
        Optional<Person> existing = personRepository.findByEmail(request.getEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        Professor professor = new Professor();
        professor.setId(UUID.randomUUID().toString());
        professor.setName(request.getName());
        professor.setEmail(request.getEmail());
        professor.setPassword(passwordEncoder.encode(request.getPassword()));
        professor.setRole(Person.Role.PROFESSOR);
        professor.setDepartment(request.getDepartment());
        professor.setActive(true);

        personRepository.save(professor);
        
        String token = generateToken(professor);
        return new AuthResponse(token, professor.getId(), professor.getName(), 
                                "PROFESSOR", professor.getEmail());
    }

    public AuthResponse professorLogin(LoginRequest request) {
        Person person = personRepository.findByEmail(request.getUsername())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), person.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (person.getRole() != Person.Role.PROFESSOR) {
            throw new RuntimeException("Not authorized as professor");
        }

        String token = generateToken(person);
        return new AuthResponse(token, person.getId(), person.getName(), 
                                "PROFESSOR", person.getEmail());
    }

    public Student enrollStudent(EnrollStudentRequest request) {
        CourseClass courseClass = courseClassRepository.findById(request.getClassId())
            .orElseThrow(() -> new RuntimeException("Class not found"));

        Optional<Person> existing = personRepository.findByStudentNumber(request.getRollNumber());
        Student student;

        if (existing.isPresent()) {
            Person person = existing.get();
            if (!(person instanceof Student)) {
                throw new RuntimeException("Roll number is already used by a non-student user");
            }
            
            student = (Student) person;
            
            if (request.getFaceImageBase64() != null && !request.getFaceImageBase64().isEmpty()) {
                student.setFaceImageBase64(request.getFaceImageBase64());
                personRepository.save(student);
            }
            
            if (courseClass.getStudentIds().contains(student.getId())) {
                return student;
            }
            
        } else {
            student = new Student();
            student.setId(UUID.randomUUID().toString());
            student.setName(request.getName());
            student.setStudentNumber(request.getRollNumber());
            student.setPassword(passwordEncoder.encode(request.getPassword()));
            student.setRole(Person.Role.STUDENT);
            student.setEmail(request.getEmail());
            student.setMajor(request.getMajor());
            student.setYear(request.getYear());
            if (request.getFaceImageBase64() != null && !request.getFaceImageBase64().isEmpty()) {
                student.setFaceImageBase64(request.getFaceImageBase64());
            }
            student.setActive(true);

            personRepository.save(student);
        }

        if (!courseClass.getStudentIds().contains(student.getId())) {
            courseClass.getStudentIds().add(student.getId());
            courseClassRepository.save(courseClass);
        }

        return student;
    }

    public AuthResponse studentLogin(LoginRequest request) {
        Person person = personRepository.findByStudentNumber(request.getUsername())
            .orElseThrow(() -> new RuntimeException("Invalid roll number or password"));

        if (!passwordEncoder.matches(request.getPassword(), person.getPassword())) {
            throw new RuntimeException("Invalid roll number or password");
        }

        if (person.getRole() != Person.Role.STUDENT) {
            throw new RuntimeException("Not authorized as student");
        }

        String token = generateToken(person);
        return new AuthResponse(token, person.getId(), person.getName(), 
                                "STUDENT", person.getEmail());
    }

    public TA createTA(CreateTARequest request) {
        Optional<Person> existing = personRepository.findByTaId(request.getTaId());
        if (existing.isPresent()) {
            throw new RuntimeException("TA ID already exists");
        }

        TA ta = new TA();
        ta.setId(UUID.randomUUID().toString());
        ta.setName(request.getName());
        ta.setTaId(request.getTaId());
        ta.setPassword(passwordEncoder.encode(request.getPassword()));
        ta.setRole(Person.Role.TA);
        ta.setEmail(request.getEmail());
        ta.setDepartment(request.getDepartment());
        ta.setSupervisorProfessorId(request.getSupervisorProfessorId());
        ta.setActive(true);
        
        if (request.getProfilePictureBase64() != null && !request.getProfilePictureBase64().isEmpty()) {
            ta.setProfilePictureBase64(request.getProfilePictureBase64());
        }

        personRepository.save(ta);
        return ta;
    }

    public AuthResponse taLogin(LoginRequest request) {
        Person person = personRepository.findByTaId(request.getUsername())
            .orElseThrow(() -> new RuntimeException("Invalid TA ID or password"));

        if (!passwordEncoder.matches(request.getPassword(), person.getPassword())) {
            throw new RuntimeException("Invalid TA ID or password");
        }

        if (person.getRole() != Person.Role.TA) {
            throw new RuntimeException("Not authorized as TA");
        }

        String token = generateToken(person);
        return new AuthResponse(token, person.getId(), person.getName(), 
                                "TA", person.getEmail());
    }

    private String generateToken(Person person) {
        return "TOKEN_" + person.getId() + "_" + System.currentTimeMillis();
    }

    public Person validateToken(String token) {
        if (token == null || !token.startsWith("TOKEN_")) {
            throw new RuntimeException("Invalid token");
        }

        String[] parts = token.split("_");
        if (parts.length < 3) {
            throw new RuntimeException("Invalid token format");
        }

        String userId = parts[1];
        return personRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}