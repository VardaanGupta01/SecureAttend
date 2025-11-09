package com.secureattend.service;

import com.secureattend.domain.CourseClass;
import com.secureattend.domain.Person;
import com.secureattend.domain.Professor;
import com.secureattend.domain.Session;
import com.secureattend.domain.TA;
import com.secureattend.dto.CreateClassRequest;
import com.secureattend.repository.CourseClassRepository;
import com.secureattend.repository.PersonRepository;
import com.secureattend.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ClassService {

    @Autowired
    private CourseClassRepository courseClassRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private SessionRepository sessionRepository;

    public CourseClass createClass(String professorId, CreateClassRequest request) {
        System.out.println("[createClass] Creating class for professor: " + professorId);
        
        Person person = personRepository.findById(professorId)
            .orElseThrow(() -> new RuntimeException("Professor not found: " + professorId));
        
        if (!(person instanceof Professor)) {
            throw new RuntimeException("User is not a professor: " + professorId);
        }

        if (request.getCode() != null) {
            courseClassRepository.findByCodeAndProfessorId(request.getCode(), professorId)
                .ifPresent(c -> {
                    throw new RuntimeException("Class with code " + request.getCode() + " already exists for this professor");
                });
        }

        CourseClass courseClass = new CourseClass();
        courseClass.setId(UUID.randomUUID().toString());
        courseClass.setCode(request.getCode());
        courseClass.setTitle(request.getTitle());
        courseClass.setDescription(request.getDescription());
        courseClass.setProfessorId(professorId);
        courseClass.setSemester(request.getSemester());
        courseClass.setCredits(request.getCredits());
        courseClass.setSchedule(request.getSchedule());
        courseClass.setLocation(request.getLocation());
        courseClass.setLatitude(request.getLatitude());
        courseClass.setLongitude(request.getLongitude());
        courseClass.setWifiSSID(request.getWifiSSID());
        courseClass.setCreatedAt(Instant.now());
        courseClass.setActive(true);

        CourseClass saved = courseClassRepository.save(courseClass);
        System.out.println("[createClass] Class created: " + saved.getId() + " - " + saved.getCode());
        
        return saved;
    }


    public List<CourseClass> getProfessorClasses(String professorId) {
        System.out.println("[getProfessorClasses] Loading classes for professor: " + professorId);
        List<CourseClass> classes = courseClassRepository.findByProfessorIdAndActiveTrue(professorId);
        System.out.println("[getProfessorClasses] Found " + classes.size() + " active classes");
        return classes;
    }

    public CourseClass updateClass(String classId, String professorId, CreateClassRequest request) {
        System.out.println("[updateClass] Updating class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (!courseClass.getProfessorId().equals(professorId)) {
            throw new RuntimeException("Unauthorized: You can only update your own classes");
        }

        if (request.getCode() != null) {
            courseClass.setCode(request.getCode());
        }
        if (request.getTitle() != null) {
            courseClass.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            courseClass.setDescription(request.getDescription());
        }
        if (request.getSemester() != null) {
            courseClass.setSemester(request.getSemester());
        }
        if (request.getCredits() != null) {
            courseClass.setCredits(request.getCredits());
        }
        if (request.getSchedule() != null) {
            courseClass.setSchedule(request.getSchedule());
        }
        if (request.getLocation() != null) {
            courseClass.setLocation(request.getLocation());
        }
        if (request.getLatitude() != null) {
            courseClass.setLatitude(request.getLatitude());
        }
        if (request.getLongitude() != null) {
            courseClass.setLongitude(request.getLongitude());
        }
        if (request.getWifiSSID() != null) {
            courseClass.setWifiSSID(request.getWifiSSID());
        }

        CourseClass updated = courseClassRepository.save(courseClass);
        System.out.println("[updateClass] Class updated: " + classId);
        
        return updated;
    }

    public void deleteClass(String classId, String professorId) {
        System.out.println("[deleteClass] Deleting class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (!courseClass.getProfessorId().equals(professorId)) {
            throw new RuntimeException("Unauthorized: You can only delete your own classes");
        }

        List<Session> sessions = sessionRepository.findByClassId(classId);
        System.out.println("[deleteClass] Found " + sessions.size() + " sessions to delete");
        for (Session session : sessions) {
            sessionRepository.delete(session);
            System.out.println("[deleteClass] Deleted session: " + session.getId());
        }

        courseClassRepository.delete(courseClass);
        
        System.out.println("[deleteClass] Class deleted successfully: " + classId);
    }

   
    public CourseClass getClassById(String classId) {
        System.out.println("[getClassById] Loading class: " + classId);
        return courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));
    }

    public CourseClass assignTAsToClass(String classId, String professorId, List<String> taIds) {
        System.out.println("[assignTAsToClass] Assigning " + taIds.size() + " TAs to class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (!courseClass.getProfessorId().equals(professorId)) {
            throw new RuntimeException("Unauthorized: You can only assign TAs to your own classes");
        }

        for (String taId : taIds) {
            Person person = personRepository.findById(taId)
                .orElseThrow(() -> new RuntimeException("TA not found: " + taId));
            
            if (!(person instanceof TA)) {
                throw new RuntimeException("User is not a TA: " + taId);
            }

            TA ta = (TA) person;
            if (!professorId.equals(ta.getSupervisorProfessorId())) {
                throw new RuntimeException("TA does not belong to this professor: " + taId);
            }
            
            System.out.println("[assignTAsToClass] Verified TA: " + ta.getName());
        }

        courseClass.setTaIds(taIds);
        CourseClass updated = courseClassRepository.save(courseClass);
        
        System.out.println("[assignTAsToClass] TAs assigned successfully to class: " + classId);
        
        return updated;
    }

    public List<CourseClass> getTAClasses(String taId) {
        System.out.println("[getTAClasses] Loading classes for TA: " + taId);
        List<CourseClass> classes = courseClassRepository.findByTaIdsContaining(taId);
        System.out.println("[getTAClasses] Found " + classes.size() + " classes for TA");
        return classes;
    }

    public boolean taHasAccessToClass(String taId, String classId) {
        System.out.println("[taHasAccessToClass] Checking access for TA: " + taId + " to class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId).orElse(null);
        if (courseClass == null) {
            System.out.println("[taHasAccessToClass] Class not found: " + classId);
            return false;
        }
        
        boolean hasAccess = courseClass.getTaIds() != null && courseClass.getTaIds().contains(taId);
        System.out.println((hasAccess ? "true" : "wrong") + " [taHasAccessToClass] TA " + taId + 
                         (hasAccess ? " has" : " does not have") + " access to class " + classId);
        
        return hasAccess;
    }

    public boolean professorOwnsClass(String professorId, String classId) {
        System.out.println("[professorOwnsClass] Checking ownership for professor: " + professorId);
        
        CourseClass courseClass = courseClassRepository.findById(classId).orElse(null);
        if (courseClass == null) {
            System.out.println("[professorOwnsClass] Class not found: " + classId);
            return false;
        }
        
        boolean owns = professorId.equals(courseClass.getProfessorId());
        System.out.println((owns ? "true" : "wrong") + " [professorOwnsClass] Professor " + professorId + 
                         (owns ? " owns" : " does not own") + " class " + classId);
        
        return owns;
    }

    public void unenrollStudent(String classId, String studentId, String professorId) {
        System.out.println("[unenrollStudent] Unenrolling student: " + studentId + " from class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (!courseClass.getProfessorId().equals(professorId)) {
            throw new RuntimeException("Unauthorized: You can only unenroll students from your own classes");
        }

        if (courseClass.getStudentIds() != null && courseClass.getStudentIds().contains(studentId)) {
            courseClass.getStudentIds().remove(studentId);
            courseClassRepository.save(courseClass);
            System.out.println("[unenrollStudent] Student unenrolled successfully");
        } else {
            throw new RuntimeException("Student is not enrolled in this class");
        }
    }

    public void unenrollTA(String classId, String taId, String professorId) {
        System.out.println("[unenrollTA] Unenrolling TA: " + taId + " from class: " + classId);
        
        CourseClass courseClass = courseClassRepository.findById(classId)
            .orElseThrow(() -> new RuntimeException("Class not found: " + classId));

        if (!courseClass.getProfessorId().equals(professorId)) {
            throw new RuntimeException("Unauthorized: You can only unenroll TAs from your own classes");
        }

        if (courseClass.getTaIds() != null && courseClass.getTaIds().contains(taId)) {
            courseClass.getTaIds().remove(taId);
            courseClassRepository.save(courseClass);
            System.out.println("[unenrollTA] TA unenrolled successfully");
        } else {
            throw new RuntimeException("TA is not assigned to this class");
        }
    }
}