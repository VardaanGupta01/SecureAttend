package com.secureattend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.secureattend.domain.Person;
import com.secureattend.repository.PersonRepository;

@Service
public class UserService {
    private final PersonRepository personRepository;

    public UserService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    public List<Person> getAllUsers() { return personRepository.findAll(); }
    public Optional<Person> getById(String id) { return personRepository.findById(id); }
    public Person save(Person p) { return personRepository.save(p); }
}


