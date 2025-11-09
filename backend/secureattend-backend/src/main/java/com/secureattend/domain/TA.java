package com.secureattend.domain;

public class TA extends Person {
    private String supervisorProfessorId;
    private String department;
    private String taId;

    @Override
    public void markAttendance(String sessionId) {}

    @Override
    public String getDisplayInfo() {
        return String.format("TA %s - %s Department", getName(), getDepartment());
    }

    public String getSupervisorProfessorId() { return supervisorProfessorId; }
    public void setSupervisorProfessorId(String id) { this.supervisorProfessorId = id; }
    
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    
    public String getTaId() { return taId; }
    public void setTaId(String taId) { this.taId = taId; }
}