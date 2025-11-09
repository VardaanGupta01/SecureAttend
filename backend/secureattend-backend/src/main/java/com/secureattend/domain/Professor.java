package com.secureattend.domain;

public class Professor extends Person {
    private String department;
    private String employeeId;
    private String title;
    private String officeLocation;

    @Override
    public void markAttendance(String sessionId) {}

    @Override
    public String getDisplayInfo() {
        return String.format("%s %s - %s Department", getTitle(), getName(), getDepartment());
    }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getOfficeLocation() { return officeLocation; }
    public void setOfficeLocation(String officeLocation) { this.officeLocation = officeLocation; }
}