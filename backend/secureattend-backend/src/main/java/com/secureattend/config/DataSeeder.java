package com.secureattend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Person;
import com.secureattend.domain.Professor;
import com.secureattend.domain.Student;
import com.secureattend.domain.TA;
import com.secureattend.repository.CourseClassRepository;
import com.secureattend.repository.PersonRepository;

@Component
public class DataSeeder implements CommandLineRunner {
    private final PersonRepository personRepository;
    private final CourseClassRepository courseClassRepository;

    public DataSeeder(PersonRepository personRepository, CourseClassRepository courseClassRepository) {
        this.personRepository = personRepository;
        this.courseClassRepository = courseClassRepository;
    }

    @Override
    public void run(String... args) throws Exception {
      
    }
}