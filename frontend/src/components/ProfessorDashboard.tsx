import React, { useEffect, useState } from "react";
import {
  Users, Plus, QrCode, Clock, MapPin, Wifi, CheckCircle, XCircle,
  RotateCw, UserPlus, Pencil, Trash2, BookOpen, GraduationCap,
  AlertCircle, Eye, Settings, Calendar, TrendingUp, Edit, Camera, User
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import { profileAPI } from '../services/api';
import './ProfessorDashboard.css';

const API_BASE = 'https://secure-attend-backend.onrender.com/api';

const apiClient = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });

const getUser = () => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

interface ClassItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  semester?: string;
  credits?: number;
  schedule?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  wifiSSID?: string;
  taIds?: string[];
}

interface SessionItem {
  id: string;
  qrToken?: string;
  codeword?: string;
  status?: string;
  open?: boolean;
  endTime?: string;
  startTime?: string;
  professorHeadcount?: number;
  requireProfessorVerification?: boolean;
  requireLocation?: boolean;
  requireFace?: boolean;
  requireTAVerification?: boolean;
  latitude?: number;
  longitude?: number;
  wifiSSID?: string;
  allowedRadiusMeters?: number;
  durationMinutes?: number;
}

interface Attendance {
  id: string;
  studentId?: string;
  studentName?: string;
  studentRollNumber?: string;
  currentStep?: string;
  systemVerified?: boolean;
  professorVerified?: boolean;
  flaggedProxy?: boolean;
  studentProfilePic?: string;
}

interface Student {
  id: string;
  studentNumber?: string;
  name?: string;
  email?: string;
  major?: string;
  faceImageBase64?: string;
}

interface TA {
  id: string;
  taId?: string;
  name?: string;
  email?: string;
  department?: string;
  profilePictureBase64?: string;
}

const ProfessorDashboard: React.FC = () => {
  const user = getUser();
  const professorId = user?.userId;

  const [activeTab, setActiveTab] = useState<'sessions'|'students'|'tas'>('sessions');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [taList, setTAList] = useState<TA[]>([]);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showCreateTAModal, setShowCreateTAModal] = useState(false);
  const [showAssignTAModal, setShowAssignTAModal] = useState(false);
  const [showTADetailsModal, setShowTADetailsModal] = useState(false);
  const [viewingClassTAs, setViewingClassTAs] = useState<ClassItem | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string }|null>(null);
  const [headcount, setHeadcount] = useState<number>(0);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [classForm, setClassForm] = useState<any>({
    code: '', title: '', description: '', semester: '', credits: 3, schedule: '', location: '',
    latitude: 40.7128, longitude: -74.0060, wifiSSID: 'Campus-WiFi'
  });

  const [editClassForm, setEditClassForm] = useState<any>({
    code: '', title: '', description: '', semester: '', credits: 3, schedule: '', location: '',
    latitude: 40.7128, longitude: -74.0060, wifiSSID: 'Campus-WiFi'
  });

  const [sessionForm, setSessionForm] = useState<any>({
    latitude: 40.7128, longitude: -74.0060, wifiSSID: "Campus-WiFi",
    allowedRadiusMeters: 50, durationMinutes: 120, requireLocation: true,
    requireFace: true, requireProfessorVerification: true, requireTAVerification: false
  });

  const [editSessionForm, setEditSessionForm] = useState<any>({
    latitude: 40.7128, longitude: -74.0060, wifiSSID: "Campus-WiFi",
    allowedRadiusMeters: 50, durationMinutes: 120, requireLocation: true,
    requireFace: true, requireProfessorVerification: true, requireTAVerification: false
  });

  const [enrollForm, setEnrollForm] = useState<any>({
    name: '', rollNumber: '', password: '', email: '', major: '', year: 1, photo: null, photoPreview: null
  });

  const [taForm, setTaForm] = useState<any>({
    name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null
  });

  const [assignTAForm, setAssignTAForm] = useState<{ selectedTAs: string[] }>({ selectedTAs: [] });

  useEffect(() => {
    if (professorId) {
      loadClasses();
      loadTAList();
      loadProfessorProfile();
    }
  }, [professorId]);

  const loadProfessorProfile = async () => {
    if (!professorId) return;
    try {
      const response = await apiClient.get(`/professor/${professorId}`);
      const profData = response.data?.data || response.data;
      if (profData && profData.profilePictureBase64) {
        setProfilePreview(profData.profilePictureBase64);
      }
    } catch (error) {
      console.error('Failed to load professor profile:', error);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadSessions(selectedClass.id);
      loadEnrolledStudents(selectedClass.id);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedSession) return;
    loadAttendance(selectedSession.id);
    const t = setInterval(() => { loadAttendance(selectedSession.id); }, 5000);
    return () => clearInterval(t);
  }, [selectedSession]);

  const loadClasses = async () => {
    if (!professorId) return;
    try {
      const res = await apiClient.get(`/professor/classes?professorId=${professorId}`);
      const classesData = res.data?.data ?? res.data ?? [];
      setClasses(Array.isArray(classesData) ? classesData : []);
      if (classesData.length > 0 && !selectedClass) setSelectedClass(classesData[0]);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load classes' });
    }
  };

  const createClass = async () => {
    if (!professorId) return;
    try {
      await apiClient.post(`/professor/classes?professorId=${professorId}`, classForm);
      setMessage({ type: 'success', text: 'Class created successfully' });
      setShowCreateClassModal(false);
      setClassForm({ code: '', title: '', description: '', semester: '', credits: 3, schedule:'', location:'', latitude:40.7128, longitude:-74.0060, wifiSSID:'Campus-WiFi' });
      loadClasses();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Class creation failed' });
    }
  };

  const loadClassDetails = async (classId: string) => {
    try {
      const res = await apiClient.get(`/professor/classes/${classId}`);
      const classData = res.data?.data ?? res.data;
      if (classData) {
        setEditingClass(classData);
        setEditClassForm({
          code: classData.code ?? '',
          title: classData.title ?? '',
          description: classData.description ?? '',
          semester: classData.semester ?? '',
          credits: classData.credits ?? 3,
          schedule: classData.schedule ?? '',
          location: classData.location ?? '',
          latitude: classData.latitude ?? 40.7128,
          longitude: classData.longitude ?? -74.0060,
          wifiSSID: classData.wifiSSID ?? 'Campus-WiFi'
        });
      }
    } catch (err) {
      console.error('Failed to load class details:', err);
      setMessage({ type: 'error', text: 'Failed to load class details' });
    }
  };

  const openEditClassModal = async (classItem: ClassItem) => {
    setEditingClass(classItem);
    await loadClassDetails(classItem.id);
    setShowEditClassModal(true);
  };

  const updateClass = async () => {
    if (!editingClass || !professorId) return;
    try {
      const res = await apiClient.put(`/professor/classes/${editingClass.id}?professorId=${professorId}`, editClassForm);
      const updatedClass = res.data?.data ?? res.data;
      if (updatedClass) {
        setClasses(prev => prev.map(c => c.id === editingClass.id ? updatedClass : c));
        if (selectedClass?.id === editingClass.id) {
          setSelectedClass(updatedClass);
        }
        setMessage({ type: 'success', text: 'Class updated successfully' });
        setShowEditClassModal(false);
        setEditingClass(null);
        loadClasses();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update class' });
    }
  };

  const deleteClass = async (classId: string) => {
    if (!professorId) {
      setMessage({ type: 'error', text: 'Professor ID not found' });
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this class? This will also delete all associated sessions. This action cannot be undone.')) {
      return;
    }
    
    console.log('[deleteClass] Attempting to delete class:', classId, 'for professor:', professorId);
    
    const classToDelete = classes.find(c => c.id === classId);
    setClasses(prev => prev.filter(c => c.id !== classId));
    
    if (selectedClass?.id === classId) {
      setSelectedClass(null);
      setSessions([]);
      setSelectedSession(null);
    }
    
    try {
      const response = await apiClient.delete(`/professor/classes/${classId}?professorId=${professorId}`);
      console.log('[deleteClass] Delete successful:', response.data);
      setMessage({ type: 'success', text: 'Class deleted successfully' });
    } catch (err: any) {
      console.error('[deleteClass] Delete failed:', err);
      console.error('[deleteClass] Error response:', err?.response?.data);
      console.error('[deleteClass] Full error:', err);
      if (classToDelete) {
        setClasses(prev => [...prev, classToDelete].sort((a, b) => (a.code || '').localeCompare(b.code || '')));
        if (selectedClass === null && classToDelete.id === classId) {
          setSelectedClass(classToDelete);
        }
      }
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete class';
      setMessage({ type: 'error', text: errorMessage });
      console.error('[deleteClass] Error details:', errorMessage);
    }
  };

  const loadSessions = async (classId: string) => {
    try {
      const res = await apiClient.get(`/professor/classes/${classId}/sessions/open`);
      const sessionsData = res.data?.data ?? res.data ?? [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error(err);
      setSessions([]);
    }
  };

  const createSession = async () => {
    if (!selectedClass) { setMessage({type:'error', text:'Select a class'}); return; }
    try {
      const res = await apiClient.post(`/professor/classes/${selectedClass.id}/sessions`, sessionForm);
      const newSession = res.data?.data ?? res.data ?? null;
      if (newSession) setSessions(prev => [...prev, newSession]);
      setMessage({ type: 'success', text: 'Session created successfully' });
      setShowCreateSessionModal(false);
      setSelectedSession(newSession);
      setShowQRModal(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to create session' });
    }
  };

  const loadAttendance = async (sessionId: string) => {
    try {
      const res = await apiClient.get(`/professor/sessions/${sessionId}/attendance`);
      const d = res.data?.data ?? res.data ?? [];
      const attendanceList = Array.isArray(d) ? d : [];
      
      const attendanceWithPics = await Promise.all(
        attendanceList.map(async (att: Attendance) => {
          if (att.studentId) {
            try {
              const studentRes = await apiClient.get(`/student/${att.studentId}`);
              const studentData = studentRes.data?.data || studentRes.data;
              if (studentData && studentData.faceImageBase64) {
                return { ...att, studentProfilePic: studentData.faceImageBase64 };
              }
            } catch (err) {
              console.error(`Failed to load student profile for ${att.studentId}:`, err);
            }
          }
          return att;
        })
      );
      
      setAttendance(attendanceWithPics);
    } catch (err) {
      console.error(err);
      setAttendance([]);
    }
  };

  const updateHeadcount = async (sessionId: string) => {
    try {
      const res = await apiClient.put(`/professor/sessions/${sessionId}/headcount?headcount=${headcount}`);
      const updatedSession = res.data?.data ?? res.data;
      
      if (selectedSession && selectedSession.id === sessionId && updatedSession) {
        setSelectedSession(updatedSession);
      }
      
      setSessions(prev => prev.map(s => s.id === sessionId ? (updatedSession || { ...s, professorHeadcount: headcount }) : s));
      
      setMessage({ type: 'success', text: 'Headcount updated' });
      if (selectedClass) loadSessions(selectedClass.id);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update headcount' });
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    try {
      await apiClient.delete(`/professor/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      setMessage({ type: 'success', text: 'Session deleted successfully' });
      if (selectedClass) {
        loadSessions(selectedClass.id);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to delete session' });
    }
  };

  const verifyAttendance = async (attendanceId: string, approved: boolean) => {
    try {
      await apiClient.put(`/professor/attendance/${attendanceId}/verify?approved=${approved}&notes=${approved ? 'Verified' : 'Rejected'}`);
      if (selectedSession) loadAttendance(selectedSession.id);
      setMessage({ type: 'success', text: approved ? 'Attendance approved' : 'Attendance rejected' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to verify attendance' });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Photo size must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEnrollForm({ ...enrollForm, photo: base64String, photoPreview: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Photo size must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);
        setProfilePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfilePicture = async () => {
    if (!professorId || !profilePicture) return;
    try {
      await profileAPI.updateProfilePicture(professorId, 'PROFESSOR', profilePicture);
      setMessage({ type: 'success', text: 'Profile picture updated successfully' });
      setShowProfileModal(false);
      setProfilePicture(null);
      await loadProfessorProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile picture' });
    }
  };

  const enrollStudent = async () => {
    if (!selectedClass) { setMessage({type:'error', text:'Select a class'}); return; }
    try {
      const enrollmentData: any = {
        name: enrollForm.name,
        rollNumber: enrollForm.rollNumber,
        password: enrollForm.password,
        email: enrollForm.email,
        major: enrollForm.major,
        year: enrollForm.year,
        classId: selectedClass.id
      };
      
      if (enrollForm.photo) {
        enrollmentData.faceImageBase64 = enrollForm.photo;
      }
      
      await apiClient.post('/auth/professor/enroll-student', enrollmentData);
      setMessage({ type: 'success', text: 'Student enrolled successfully' });
      setShowEnrollModal(false);
      setEnrollForm({ name:'', rollNumber:'', password:'', email:'', major:'', year:1, photo: null, photoPreview: null });
      loadEnrolledStudents(selectedClass.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Enrollment failed' });
    }
  };

  const loadEnrolledStudents = async (classId: string) => {
    try {
      const res = await apiClient.get(`/professor/classes/${classId}/students`);
      const studentsData = res.data?.data ?? res.data ?? [];
      const studentsList = Array.isArray(studentsData) ? studentsData : [];
      
      const studentsWithPics = await Promise.all(
        studentsList.map(async (student: Student) => {
          try {
            const studentRes = await apiClient.get(`/student/${student.id}`);
            const studentDetail = studentRes.data?.data || studentRes.data;
            if (studentDetail && studentDetail.faceImageBase64) {
              return { ...student, faceImageBase64: studentDetail.faceImageBase64 };
            }
          } catch (err) {
            console.error(`Failed to load student profile for ${student.id}:`, err);
          }
          return student;
        })
      );
      
      setEnrolledStudents(studentsWithPics);
    } catch (err) {
      console.error(err);
      setEnrolledStudents([]);
    }
  };

  const unenrollStudent = async (studentId: string) => {
    if (!selectedClass || !professorId) return;
    if (!window.confirm('Are you sure you want to unenroll this student from the class?')) {
      return;
    }
    try {
      await apiClient.delete(`/professor/classes/${selectedClass.id}/students/${studentId}?professorId=${professorId}`);
      setMessage({ type: 'success', text: 'Student unenrolled successfully' });
      loadEnrolledStudents(selectedClass.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to unenroll student' });
    }
  };

  const unenrollTA = async (taId: string) => {
    if (!selectedClass || !professorId) return;
    if (!window.confirm('Are you sure you want to remove this TA from the class?')) {
      return;
    }
    try {
      await apiClient.delete(`/professor/classes/${selectedClass.id}/tas/${taId}?professorId=${professorId}`);
      setMessage({ type: 'success', text: 'TA removed from class successfully' });
      loadClasses();
      if (selectedClass) {
        loadEnrolledStudents(selectedClass.id);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to remove TA' });
    }
  };

  const createTA = async () => {
    try {
      const taData: any = {
        name: taForm.name,
        taId: taForm.taId,
        password: taForm.password,
        email: taForm.email,
        department: taForm.department,
        supervisorProfessorId: professorId
      };
      
      if (taForm.photo) {
        taData.profilePictureBase64 = taForm.photo;
      }
      
      await apiClient.post('/auth/professor/create-ta', taData);
      setMessage({ type: 'success', text: 'TA created successfully' });
      setShowCreateTAModal(false);
      setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
      loadTAList();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'TA creation failed' });
    }
  };

  const loadTAList = async () => {
    try {
      const res = await apiClient.get(`/professor/tas?professorId=${professorId}`);
      const tasData = res.data?.data ?? res.data ?? [];
      const tasList = Array.isArray(tasData) ? tasData : [];
      
      const tasWithPics = await Promise.all(
        tasList.map(async (ta: TA) => {
          try {
            const taRes = await apiClient.get(`/ta/${ta.id}`);
            const taDetail = taRes.data?.data || taRes.data;
            if (taDetail && taDetail.profilePictureBase64) {
              return { ...ta, profilePictureBase64: taDetail.profilePictureBase64 };
            }
          } catch (err) {
            console.error(`Failed to load TA profile for ${ta.id}:`, err);
          }
          return ta;
        })
      );
      
      setTAList(tasWithPics);
    } catch (err) {
      console.error(err);
      setTAList([]);
    }
  };

  const assignTAsToClass = async () => {
    if (!selectedClass) return;
    try {
      await apiClient.put(`/professor/classes/${selectedClass.id}/assign-tas?professorId=${professorId}`, assignTAForm.selectedTAs);
      setMessage({ type: 'success', text: 'TAs assigned' });
      setShowAssignTAModal(false);
      setAssignTAForm({ selectedTAs: [] });
      loadClasses();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to assign TAs' });
    }
  };

  const getClassTAs = (classItem: ClassItem): TA[] => {
    if (!classItem.taIds || classItem.taIds.length === 0) return [];
    return taList.filter(ta => classItem.taIds?.includes(ta.id));
  };

  const openTADetailsModal = (classItem: ClassItem) => {
    setViewingClassTAs(classItem);
    setShowTADetailsModal(true);
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const res = await apiClient.get(`/professor/sessions/${sessionId}`);
      const sessionData = res.data?.data ?? res.data;
      if (sessionData) {
        setEditingSession(sessionData);
        
        let durationMinutes = sessionData.durationMinutes ?? 120;
        if (sessionData.startTime && sessionData.endTime && !sessionData.durationMinutes) {
          const start = new Date(sessionData.startTime).getTime();
          const end = new Date(sessionData.endTime).getTime();
          durationMinutes = Math.round((end - start) / (1000 * 60)); 
        }
        
        setEditSessionForm({
          latitude: sessionData.latitude ?? 40.7128,
          longitude: sessionData.longitude ?? -74.0060,
          wifiSSID: sessionData.wifiSSID ?? "Campus-WiFi",
          allowedRadiusMeters: sessionData.allowedRadiusMeters ?? 50,
          durationMinutes: durationMinutes,
          requireLocation: sessionData.requireLocation ?? true,
          requireFace: sessionData.requireFace ?? true,
          requireProfessorVerification: sessionData.requireProfessorVerification ?? true,
          requireTAVerification: sessionData.requireTAVerification ?? false
        });
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
      setMessage({ type: 'error', text: 'Failed to load session details' });
    }
  };

  const openEditSessionModal = async (session: SessionItem) => {
    setEditingSession(session);
    await loadSessionDetails(session.id);
    setShowEditSessionModal(true);
  };

  const updateSession = async () => {
    if (!editingSession) return;
    try {
      const res = await apiClient.put(`/professor/sessions/${editingSession.id}`, editSessionForm);
      const updatedSession = res.data?.data ?? res.data;
      if (updatedSession) {
        setSessions(prev => prev.map(s => s.id === editingSession.id ? updatedSession : s));
        if (selectedSession?.id === editingSession.id) {
          setSelectedSession(updatedSession);
        }
        setMessage({ type: 'success', text: 'Session updated successfully' });
        setShowEditSessionModal(false);
        setEditingSession(null);
        if (selectedClass) {
          loadSessions(selectedClass.id);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update session' });
    }
  };

  const getSessionStatus = (session: SessionItem) => {
    const now = Date.now();
    const end = session.endTime ? new Date(session.endTime).getTime() : 0;
    if (session.status === 'EXPIRED' || (end && now > end)) return { label: 'Expired', badgeClass: 'badge-red' };
    if (session.status === 'CLOSED') return { label: 'Closed', badgeClass: 'badge-gray' };
    if (session.open && session.status === 'ACTIVE') return { label: 'Active', badgeClass: 'badge-green' };
    return { label: 'Scheduled', badgeClass: 'badge-blue' };
  };

  const getRemainingTime = (session: SessionItem) => {
    if (!session.endTime) return 'N/A';
    const remaining = new Date(session.endTime).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const pendingApprovals = attendance.filter(a => a.systemVerified && !a.professorVerified && !a.flaggedProxy);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="pa-root">
      <div className="pa-container">
        <header className="pa-header">
          <div className="pa-header-left">
            <div className="pa-logo">
              <div className="pa-logo-icon"><GraduationCap /></div>
              <div>
                <h1 className="pa-title">Professor Dashboard</h1>
                <div className="pa-sub">Welcome back, {user?.name ?? 'Professor'}</div>
              </div>
            </div>
          </div>

          <div className="pa-header-right">
            <button 
              className="btn icon subtle" 
              onClick={() => setShowProfileModal(true)}
              title="Update Profile Picture"
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                padding: 0,
                overflow: 'hidden',
                border: '2px solid rgba(102, 126, 234, 0.2)'
              }}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User style={{ width: '24px', height: '24px' }} />
              )}
            </button>
            <button className="btn primary" onClick={() => setShowCreateClassModal(true)}>
              <Plus className="ico" /> Create Class
            </button>
            <button className="btn ghost" onClick={() => setShowCreateTAModal(true)}>
              <UserPlus className="ico" /> Add TA
            </button>
          </div>
        </header>

        {message && (
          <div className={`pa-alert ${message.type === 'success' ? 'pa-alert-success' : 'pa-alert-error'}`}>
            {message.type === 'success' ? <CheckCircle /> : <AlertCircle />} 
            <div className="pa-alert-text">{message.text}</div>
            <button className="pa-alert-close" onClick={() => setMessage(null)}><XCircle /></button>
          </div>
        )}

        <div className="pa-card">
          <nav className="pa-tabs">
            <button className={`pa-tab ${activeTab==='sessions' ? 'active':''}`} onClick={() => setActiveTab('sessions')}>
              <BookOpen /> Classes & Sessions
            </button>
            <button className={`pa-tab ${activeTab==='students' ? 'active':''}`} onClick={() => setActiveTab('students')}>
              <Users /> Students ({enrolledStudents.length})
            </button>
            <button className={`pa-tab ${activeTab==='tas' ? 'active':''}`} onClick={() => setActiveTab('tas')}>
              <GraduationCap /> Teaching Assistants ({taList.length})
            </button>
          </nav>

          <div className="pa-content">
            {activeTab === 'sessions' && (
              <div className="pa-grid">
                <aside className="pa-col pa-col-left">
                  <div className="pa-section-title"><BookOpen /> My Classes</div>
                  {classes.length === 0 ? (
                    <div className="empty">No classes yet</div>
                  ) : (
                    <div className="class-list">
                      {classes.map(cls => (
                        <div
                          key={cls.id}
                          className={`class-card ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                        >
                          <div
                            className="class-card-content"
                            onClick={() => setSelectedClass(cls)}
                          >
                            <div className="cc-code">{cls.code}</div>
                            <div className="cc-title">{cls.title}</div>
                          </div>
                          <div className="class-card-actions" onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn icon subtle" 
                              onClick={() => openTADetailsModal(cls)}
                              title="View TA Details"
                            >
                              <GraduationCap />
                            </button>
                            <button 
                              className="btn icon subtle" 
                              onClick={() => openEditClassModal(cls)}
                              title="Edit Class"
                            >
                              <Edit />
                            </button>
                            <button 
                              className="btn icon danger" 
                              onClick={() => deleteClass(cls.id)}
                              title="Delete Class"
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>

                <main className="pa-col pa-col-center">
                  {selectedClass ? (
                    <>
                      <div className="pa-row pa-actions">
                        <div className="pa-section-title"><Calendar /> Sessions</div>
                        <div className="pa-action-buttons">
                          <button className="btn subtle" onClick={() => { setAssignTAForm({selectedTAs: selectedClass.taIds || []}); setShowAssignTAModal(true); }}>
                            <Settings /> Manage TAs
                          </button>
                          <button className="btn primary" onClick={() => setShowCreateSessionModal(true)}><Plus /> New Session</button>
                        </div>
                      </div>

                      <div className="class-info">
                        <div className="ci-code">{selectedClass.code} - {selectedClass.title}</div>
                        <div className="ci-location"><MapPin /> {selectedClass.location || 'Location not set'}</div>
                      </div>

                      {sessions.length === 0 ? (
                        <div className="empty">No active sessions</div>
                      ) : (
                        <div className="session-list">
                          {sessions.map(session => {
                            const st = getSessionStatus(session);
                            const remaining = getRemainingTime(session);
                            return (
                              <div key={session.id} className="session-card">
                                <div className="session-header">
                                  <div>
                                    <div className="session-title">Session #{session.id?.slice(-6)}</div>
                                    <div className="session-time"><Clock /> {remaining}</div>
                                  </div>
                                  <div className={`badge ${st.badgeClass}`}>{st.label}</div>
                                </div>

                                <div className="session-codeword">
                                  <div className="cw-label">Codeword</div>
                                  <div className="cw-value">{session.codeword}</div>
                                </div>

                                <div className="session-actions">
                                  <button className="btn subtle" onClick={() => { setSelectedSession(session); loadAttendance(session.id); }}>
                                    <Eye /> View Attendance
                                  </button>
                                  <button className="btn subtle" onClick={() => openEditSessionModal(session)}>
                                    <Edit /> Edit Session
                                  </button>
                                  <button className="btn primary" onClick={() => { setSelectedSession(session); setShowQRModal(true); }}>
                                    <QrCode /> QR Code
                                  </button>
                                  <button className="btn danger" onClick={() => deleteSession(session.id)}>
                                    <Trash2 /> Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty large">Select a class to view sessions</div>
                  )}
                </main>

                <aside className="pa-col pa-col-right">
                  <div className="pa-section-title"><TrendingUp /> Live Attendance</div>

                  {!selectedSession ? (
                    <div className="empty large">Select a session</div>
                  ) : (
                    <div className="attendance-panel">
                      <div className="stats-grid">
                        <div className="stat-card stat-blue">
                          <div className="stat-label">Current Count</div>
                          <div className="stat-value">{attendance.length}</div>
                        </div>
                        <div className="stat-card stat-purple">
                          <div className="stat-label">Headcount</div>
                          <div className="stat-value">{selectedSession.professorHeadcount || 0}</div>
                        </div>
                      </div>

                      <div className="headcount-row">
                        <input type="number" value={headcount} onChange={(e) => setHeadcount(parseInt(e.target.value || '0'))} placeholder="Update headcount" />
                        <button className="btn primary" onClick={() => updateHeadcount(selectedSession.id)}>Update</button>
                      </div>

                      {pendingApprovals.length > 0 && (
                        <div className="pending">
                          <div className="pending-header"><AlertCircle /> Pending Approvals ({pendingApprovals.length})</div>
                          <div className="pending-list">
                            {pendingApprovals.map(p => (
                              <div key={p.id} className="pending-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {p.studentProfilePic ? (
                                  <img 
                                    src={p.studentProfilePic} 
                                    alt={p.studentName} 
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      borderRadius: '50%', 
                                      objectFit: 'cover',
                                      border: '2px solid rgba(102, 126, 234, 0.2)'
                                    }} 
                                  />
                                ) : (
                                  <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#667eea',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                  }}>
                                    {p.studentName?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <div className="pi-name">{p.studentName}</div>
                                  <div className="pi-roll">{p.studentRollNumber || 'N/A'}</div>
                                </div>
                                <div className="pi-actions">
                                  <button className="btn small success" onClick={() => verifyAttendance(p.id, true)}><CheckCircle /></button>
                                  <button className="btn small danger" onClick={() => verifyAttendance(p.id, false)}><XCircle /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="list-attendance">
                        {attendance.map(a => (
                          <div key={a.id} className={`attendance-item ${a.professorVerified ? 'verified' : ''}`}>
                            <div>
                              <div className="ai-name">{a.studentName}</div>
                              <div className="ai-roll">{a.studentRollNumber || 'N/A'}</div>
                              <div className="ai-step">{a.currentStep}</div>
                            </div>
                            {selectedSession.requireProfessorVerification && (
                              <button className={`btn icon ${a.professorVerified ? 'success' : ''}`} onClick={() => verifyAttendance(a.id, !a.professorVerified)}>
                                {a.professorVerified ? <CheckCircle /> : <XCircle />}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="pa-section">
                <div className="pa-section-top">
                  <h3><Users /> Enrolled Students</h3>
                  <div>
                    <button className="btn primary" onClick={() => setShowEnrollModal(true)} disabled={!selectedClass}><UserPlus /> Enroll Student</button>
                  </div>
                </div>

                {!selectedClass ? <div className="empty large">Select a class to view students</div> : (
                  enrolledStudents.length === 0 ? <div className="empty">No students enrolled</div> : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr><th>Photo</th><th>Roll Number</th><th>Name</th><th>Email</th><th>Major</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                          {enrolledStudents.map(s => (
                            <tr key={s.id}>
                              <td>
                                {s.faceImageBase64 ? (
                                  <img 
                                    src={s.faceImageBase64} 
                                    alt={s.name} 
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      borderRadius: '50%', 
                                      objectFit: 'cover',
                                      border: '2px solid rgba(102, 126, 234, 0.2)'
                                    }} 
                                  />
                                ) : (
                                  <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#667eea',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                  }}>
                                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </td>
                              <td>{s.studentNumber || 'N/A'}</td>
                              <td>{s.name || 'N/A'}</td>
                              <td>{s.email || 'N/A'}</td>
                              <td>{s.major || 'N/A'}</td>
                              <td>
                                <button 
                                  className="btn icon danger small" 
                                  onClick={() => unenrollStudent(s.id)}
                                  title="Unenroll Student"
                                >
                                  <XCircle />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === 'tas' && (
              <div className="pa-section">
                <h3><GraduationCap /> Teaching Assistants</h3>
                {taList.length === 0 ? <div className="empty">No TAs created</div> : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Photo</th><th>TA ID</th><th>Name</th><th>Email</th><th>Department</th></tr></thead>
                      <tbody>
                        {taList.map(ta => (
                          <tr key={ta.id}>
                            <td>
                              {ta.profilePictureBase64 ? (
                                <img 
                                  src={ta.profilePictureBase64} 
                                  alt={ta.name} 
                                  style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover',
                                    border: '2px solid rgba(102, 126, 234, 0.2)'
                                  }} 
                                />
                              ) : (
                                <div style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '50%', 
                                  background: 'rgba(102, 126, 234, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#667eea',
                                  fontSize: '16px',
                                  fontWeight: 'bold'
                                }}>
                                  {ta.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                            </td>
                            <td>{ta.taId || 'N/A'}</td>
                            <td>{ta.name || 'N/A'}</td>
                            <td>{ta.email || 'N/A'}</td>
                            <td>{ta.department || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {showQRModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><QrCode /> Session QR Code</h4>
              <button className="icon-btn" onClick={() => setShowQRModal(false)}><XCircle /></button>
            </div>
            <div className="modal-body modal-center">
              <div className="qr-wrap"><QRCodeCanvas value={selectedSession.qrToken ?? ''} size={260} /></div>
              <div className="qr-info">
                <div><strong>Session ID:</strong> {selectedSession.id}</div>
                <div><strong>Codeword:</strong> <code>{selectedSession.codeword}</code></div>
                <div><strong>Status:</strong> {getSessionStatus(selectedSession).label}</div>
                <div><strong>Time Remaining:</strong> {getRemainingTime(selectedSession)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateClassModal && (
        <div className="modal-overlay" onClick={() => setShowCreateClassModal(false)}>
          <div className="modal large" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4><BookOpen /> Create New Class</h4>
              <button className="icon-btn" onClick={() => setShowCreateClassModal(false)}><XCircle /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>Class Code<input value={classForm.code} onChange={e=>setClassForm({...classForm, code: e.target.value})} /></label>
                <label>Credits<input type="number" value={classForm.credits} onChange={e=>setClassForm({...classForm, credits: parseInt(e.target.value||'0')})} /></label>
              </div>
              <label>Title<input value={classForm.title} onChange={e=>setClassForm({...classForm, title: e.target.value})} /></label>
              <label>Description<textarea value={classForm.description} onChange={e=>setClassForm({...classForm, description: e.target.value})} /></label>
              <div className="grid-2">
                <label>Semester<input value={classForm.semester} onChange={e=>setClassForm({...classForm, semester: e.target.value})} /></label>
                <label>Schedule<input value={classForm.schedule} onChange={e=>setClassForm({...classForm, schedule: e.target.value})} /></label>
              </div>
              <label>Location<input value={classForm.location} onChange={e=>setClassForm({...classForm, location: e.target.value})} /></label>
              <div className="grid-2">
                <label>Latitude<input type="number" step="0.000001" value={classForm.latitude} onChange={e=>setClassForm({...classForm, latitude: parseFloat(e.target.value||'0')})} /></label>
                <label>Longitude<input type="number" step="0.000001" value={classForm.longitude} onChange={e=>setClassForm({...classForm, longitude: parseFloat(e.target.value||'0')})} /></label>
              </div>
              <label>WiFi SSID<input value={classForm.wifiSSID} onChange={e=>setClassForm({...classForm, wifiSSID: e.target.value})} /></label>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowCreateClassModal(false)}>Cancel</button>
              <button className="btn primary" onClick={createClass}>Create Class</button>
            </div>
          </div>
        </div>
      )}

      {showEditClassModal && editingClass && (
        <div className="modal-overlay" onClick={() => { setShowEditClassModal(false); setEditingClass(null); }}>
          <div className="modal large" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4><Edit /> Edit Class Details</h4>
              <button className="icon-btn" onClick={()=>{ setShowEditClassModal(false); setEditingClass(null); }}><XCircle/></button>
            </div>
            <div className="modal-body">
              {editingClass && (
                <>
                  <div className="class-info-box" style={{padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px'}}>
                    <div><strong>Class ID:</strong> {editingClass.id?.slice(-8)}</div>
                    <div><strong>Current Code:</strong> {editingClass.code}</div>
                    <div><strong>Current Title:</strong> {editingClass.title}</div>
                  </div>
                  <div className="grid-2">
                    <label>Class Code<input value={editClassForm.code} onChange={e=>setEditClassForm({...editClassForm, code: e.target.value})} /></label>
                    <label>Credits<input type="number" value={editClassForm.credits} onChange={e=>setEditClassForm({...editClassForm, credits: parseInt(e.target.value||'0')})} /></label>
                  </div>
                  <label>Title<input value={editClassForm.title} onChange={e=>setEditClassForm({...editClassForm, title: e.target.value})} /></label>
                  <label>Description<textarea value={editClassForm.description} onChange={e=>setEditClassForm({...editClassForm, description: e.target.value})} /></label>
                  <div className="grid-2">
                    <label>Semester<input value={editClassForm.semester} onChange={e=>setEditClassForm({...editClassForm, semester: e.target.value})} /></label>
                    <label>Schedule<input value={editClassForm.schedule} onChange={e=>setEditClassForm({...editClassForm, schedule: e.target.value})} /></label>
                  </div>
                  <label>Location<input value={editClassForm.location} onChange={e=>setEditClassForm({...editClassForm, location: e.target.value})} /></label>
                  <div className="grid-2">
                    <label>Latitude<input type="number" step="0.000001" value={editClassForm.latitude} onChange={e=>setEditClassForm({...editClassForm, latitude: parseFloat(e.target.value||'0')})} /></label>
                    <label>Longitude<input type="number" step="0.000001" value={editClassForm.longitude} onChange={e=>setEditClassForm({...editClassForm, longitude: parseFloat(e.target.value||'0')})} /></label>
                  </div>
                  <label>WiFi SSID<input value={editClassForm.wifiSSID} onChange={e=>setEditClassForm({...editClassForm, wifiSSID: e.target.value})} /></label>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn danger" onClick={() => {
                if (editingClass && window.confirm('Are you sure you want to delete this class? This will also delete all associated sessions. This action cannot be undone.')) {
                  deleteClass(editingClass.id);
                  setShowEditClassModal(false);
                  setEditingClass(null);
                }
              }}>
                <Trash2 /> Delete Class
              </button>
              <div style={{flex: 1}}></div>
              <button className="btn ghost" onClick={()=>{ setShowEditClassModal(false); setEditingClass(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateClass}>Update Class</button>
            </div>
          </div>
        </div>
      )}

      {showCreateSessionModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowCreateSessionModal(false)}>
          <div className="modal large" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h4><Calendar /> Create Session for {selectedClass.code}</h4><button className="icon-btn" onClick={()=>setShowCreateSessionModal(false)}><XCircle/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <label>Latitude<input type="number" step="0.000001" value={sessionForm.latitude} onChange={e=>setSessionForm({...sessionForm, latitude: parseFloat(e.target.value||'0')})} /></label>
                <label>Longitude<input type="number" step="0.000001" value={sessionForm.longitude} onChange={e=>setSessionForm({...sessionForm, longitude: parseFloat(e.target.value||'0')})} /></label>
              </div>
              <label>WiFi SSID<input value={sessionForm.wifiSSID} onChange={e=>setSessionForm({...sessionForm, wifiSSID: e.target.value})} /></label>
              <div className="grid-2">
                <label>Radius (meters)<input type="number" value={sessionForm.allowedRadiusMeters} onChange={e=>setSessionForm({...sessionForm, allowedRadiusMeters: parseFloat(e.target.value||'0')})} /></label>
                <label>Duration (minutes)<input type="number" value={sessionForm.durationMinutes} onChange={e=>setSessionForm({...sessionForm, durationMinutes: parseInt(e.target.value||'0')})} /></label>
              </div>
              <div className="checkbox-grid">
                <label><input type="checkbox" checked={sessionForm.requireLocation} onChange={e=>setSessionForm({...sessionForm, requireLocation: e.target.checked})} /> Require Location</label>
                <label><input type="checkbox" checked={sessionForm.requireFace} onChange={e=>setSessionForm({...sessionForm, requireFace: e.target.checked})} /> Require Face Verification</label>
                <label><input type="checkbox" checked={sessionForm.requireProfessorVerification} onChange={e=>setSessionForm({...sessionForm, requireProfessorVerification: e.target.checked})} /> Require Professor Verification</label>
                <label><input type="checkbox" checked={sessionForm.requireTAVerification} onChange={e=>setSessionForm({...sessionForm, requireTAVerification: e.target.checked})} /> Require TA Verification</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={()=>setShowCreateSessionModal(false)}>Cancel</button>
              <button className="btn primary" onClick={createSession}>Create Session</button>
            </div>
          </div>
        </div>
      )}

      {showEditSessionModal && editingSession && (
        <div className="modal-overlay" onClick={() => { setShowEditSessionModal(false); setEditingSession(null); }}>
          <div className="modal large" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4><Edit /> Edit Session Settings</h4>
              <button className="icon-btn" onClick={()=>{ setShowEditSessionModal(false); setEditingSession(null); }}><XCircle/></button>
            </div>
            <div className="modal-body">
              {editingSession && (
                <>
                  <div className="session-info-box" style={{padding: '12px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px'}}>
                    <div><strong>Session ID:</strong> {editingSession.id?.slice(-8)}</div>
                    <div><strong>Status:</strong> {editingSession.status || 'N/A'}</div>
                    <div><strong>Codeword:</strong> <code>{editingSession.codeword}</code></div>
                    {editingSession.startTime && <div><strong>Started:</strong> {new Date(editingSession.startTime).toLocaleString()}</div>}
                    {editingSession.endTime && <div><strong>Ends:</strong> {new Date(editingSession.endTime).toLocaleString()}</div>}
                  </div>
                  <div className="grid-2">
                    <label>Latitude<input type="number" step="0.000001" value={editSessionForm.latitude} onChange={e=>setEditSessionForm({...editSessionForm, latitude: parseFloat(e.target.value||'0')})} /></label>
                    <label>Longitude<input type="number" step="0.000001" value={editSessionForm.longitude} onChange={e=>setEditSessionForm({...editSessionForm, longitude: parseFloat(e.target.value||'0')})} /></label>
                  </div>
                  <label>WiFi SSID<input value={editSessionForm.wifiSSID} onChange={e=>setEditSessionForm({...editSessionForm, wifiSSID: e.target.value})} /></label>
                  <div className="grid-2">
                    <label>Radius (meters)<input type="number" value={editSessionForm.allowedRadiusMeters} onChange={e=>setEditSessionForm({...editSessionForm, allowedRadiusMeters: parseFloat(e.target.value||'0')})} /></label>
                    <label>Duration (minutes)<input type="number" value={editSessionForm.durationMinutes} onChange={e=>setEditSessionForm({...editSessionForm, durationMinutes: parseInt(e.target.value||'0')})} /></label>
                  </div>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" checked={editSessionForm.requireLocation} onChange={e=>setEditSessionForm({...editSessionForm, requireLocation: e.target.checked})} /> Require Location</label>
                    <label><input type="checkbox" checked={editSessionForm.requireFace} onChange={e=>setEditSessionForm({...editSessionForm, requireFace: e.target.checked})} /> Require Face Verification</label>
                    <label><input type="checkbox" checked={editSessionForm.requireProfessorVerification} onChange={e=>setEditSessionForm({...editSessionForm, requireProfessorVerification: e.target.checked})} /> Require Professor Verification</label>
                    <label><input type="checkbox" checked={editSessionForm.requireTAVerification} onChange={e=>setEditSessionForm({...editSessionForm, requireTAVerification: e.target.checked})} /> Require TA Verification</label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn danger" onClick={() => {
                if (editingSession && window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                  deleteSession(editingSession.id);
                  setShowEditSessionModal(false);
                  setEditingSession(null);
                }
              }}>
                <Trash2 /> Delete Session
              </button>
              <div style={{flex: 1}}></div>
              <button className="btn ghost" onClick={()=>{ setShowEditSessionModal(false); setEditingSession(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateSession}>Update Session</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && selectedClass && (
        <div className="modal-overlay" onClick={()=>setShowEnrollModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h4><UserPlus /> Enroll Student to {selectedClass.code}</h4><button className="icon-btn" onClick={()=>setShowEnrollModal(false)}><XCircle/></button></div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#0f172a' }}>
                  Student Photo (Optional)
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  border: '2px dashed rgba(102, 126, 234, 0.3)',
                  borderRadius: '12px',
                  background: enrollForm.photoPreview ? 'transparent' : 'rgba(102, 126, 234, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('photo-upload')?.click()}
                onMouseEnter={(e) => { if (!enrollForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)'; }}
                onMouseLeave={(e) => { if (!enrollForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.02)'; }}
                >
                  {enrollForm.photoPreview ? (
                    <>
                      <img 
                        src={enrollForm.photoPreview} 
                        alt="Preview" 
                        style={{ 
                          width: '120px', 
                          height: '120px', 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '3px solid rgba(102, 126, 234, 0.2)',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                        }} 
                      />
                      <button 
                        type="button"
                        className="btn subtle small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnrollForm({ ...enrollForm, photo: null, photoPreview: null });
                        }}
                        style={{ marginTop: '8px' }}
                      >
                        <XCircle style={{ width: '14px', height: '14px' }} /> Remove Photo
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera style={{ width: '48px', height: '48px', color: '#667eea', opacity: 0.6 }} />
                      <div style={{ color: '#667eea', fontWeight: 500, fontSize: '14px' }}>
                        Click to upload photo
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        Max 5MB (Optional)
                      </div>
                    </>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <label>Name<input value={enrollForm.name} onChange={e=>setEnrollForm({...enrollForm, name: e.target.value})} /></label>
              <label>Roll Number<input value={enrollForm.rollNumber} onChange={e=>setEnrollForm({...enrollForm, rollNumber: e.target.value})} /></label>
              <label>Email<input value={enrollForm.email} onChange={e=>setEnrollForm({...enrollForm, email: e.target.value})} /></label>
              <label>Password<input type="password" value={enrollForm.password} onChange={e=>setEnrollForm({...enrollForm, password: e.target.value})} /></label>
              <div className="grid-2">
                <label>Major<input value={enrollForm.major} onChange={e=>setEnrollForm({...enrollForm, major: e.target.value})} /></label>
                <label>Year<input type="number" value={enrollForm.year} onChange={e=>setEnrollForm({...enrollForm, year: parseInt(e.target.value||'0')})} /></label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={()=>{
                setShowEnrollModal(false);
                setEnrollForm({ name:'', rollNumber:'', password:'', email:'', major:'', year:1, photo: null, photoPreview: null });
              }}>Cancel</button>
              <button className="btn primary" onClick={enrollStudent}>Enroll Student</button>
            </div>
          </div>
        </div>
      )}

      {showCreateTAModal && (
        <div className="modal-overlay" onClick={()=>{
          setShowCreateTAModal(false);
          setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
        }}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h4><GraduationCap /> Add Teaching Assistant</h4><button className="icon-btn" onClick={()=>{
              setShowCreateTAModal(false);
              setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
            }}><XCircle/></button></div>
            <div className="modal-body">
              <label>Name<input value={taForm.name} onChange={e=>setTaForm({...taForm, name: e.target.value})} /></label>
              <label>TA ID<input value={taForm.taId} onChange={e=>setTaForm({...taForm, taId: e.target.value})} /></label>
              <label>Email<input value={taForm.email} onChange={e=>setTaForm({...taForm, email: e.target.value})} /></label>
              <label>Password<input type="password" value={taForm.password} onChange={e=>setTaForm({...taForm, password: e.target.value})} /></label>
              <label>Department<input value={taForm.department} onChange={e=>setTaForm({...taForm, department: e.target.value})} /></label>
              <label>
                Profile Picture (Optional)
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  border: '2px dashed rgba(102, 126, 234, 0.3)',
                  borderRadius: '8px',
                  background: taForm.photoPreview ? 'transparent' : 'rgba(102, 126, 234, 0.02)',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
                onClick={() => document.getElementById('ta-photo-upload')?.click()}
                >
                  {taForm.photoPreview ? (
                    <>
                      <img 
                        src={taForm.photoPreview} 
                        alt="Preview" 
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '2px solid rgba(102, 126, 234, 0.2)'
                        }} 
                      />
                      <button 
                        type="button"
                        className="btn subtle small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaForm({...taForm, photo: null, photoPreview: null});
                        }}
                      >
                        <XCircle style={{ width: '12px', height: '12px' }} /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera style={{ width: '48px', height: '48px', color: '#667eea', opacity: 0.6 }} />
                      <div style={{ color: '#667eea', fontWeight: 500, fontSize: '14px' }}>
                        Click to upload photo
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Max 5MB (Optional)
                      </div>
                    </>
                  )}
                  <input
                    id="ta-photo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          setMessage({ type: 'error', text: 'Photo size must be less than 5MB' });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          setTaForm({ ...taForm, photo: base64String, photoPreview: base64String });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={()=>{
                setShowCreateTAModal(false);
                setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
              }}>Cancel</button>
              <button className="btn primary" onClick={createTA}>Add TA</button>
            </div>
          </div>
        </div>
      )}

      {showAssignTAModal && selectedClass && (
        <div className="modal-overlay" onClick={()=>setShowAssignTAModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h4><Settings /> Assign TAs to {selectedClass.code}</h4><button className="icon-btn" onClick={()=>setShowAssignTAModal(false)}><XCircle/></button></div>
            <div className="modal-body">
              <div className="ta-assign-list">
                {taList.map(ta => (
                  <label key={ta.id} className="ta-assign-item">
                    <input type="checkbox" checked={assignTAForm.selectedTAs.includes(ta.id)} onChange={(e) => {
                      if (e.target.checked) setAssignTAForm({ selectedTAs: [...assignTAForm.selectedTAs, ta.id] });
                      else setAssignTAForm({ selectedTAs: assignTAForm.selectedTAs.filter(id=>id!==ta.id) });
                    }} />
                    <div>
                      <div className="ta-name">{ta.name}</div>
                      <div className="ta-meta">{ta.taId}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={()=>setShowAssignTAModal(false)}>Cancel</button>
              <button className="btn primary" onClick={assignTAsToClass}>Assign TAs</button>
            </div>
          </div>
        </div>
      )}

      {showTADetailsModal && viewingClassTAs && (
        <div className="modal-overlay" onClick={() => { setShowTADetailsModal(false); setViewingClassTAs(null); }}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4><GraduationCap /> TA Details - {viewingClassTAs.code}</h4>
              <button className="icon-btn" onClick={() => { setShowTADetailsModal(false); setViewingClassTAs(null); }}><XCircle/></button>
            </div>
            <div className="modal-body">
              {getClassTAs(viewingClassTAs).length === 0 ? (
                <div className="empty">No TAs assigned to this class</div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Photo</th><th>TA ID</th><th>Name</th><th>Email</th><th>Department</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {getClassTAs(viewingClassTAs).map(ta => (
                        <tr key={ta.id}>
                          <td>
                            {ta.profilePictureBase64 ? (
                              <img 
                                src={ta.profilePictureBase64} 
                                alt={ta.name} 
                                style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '50%', 
                                  objectFit: 'cover',
                                  border: '2px solid rgba(102, 126, 234, 0.2)'
                                }} 
                              />
                            ) : (
                              <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                background: 'rgba(102, 126, 234, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#667eea',
                                fontSize: '16px',
                                fontWeight: 'bold'
                              }}>
                                {ta.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                          </td>
                          <td>{ta.taId || 'N/A'}</td>
                          <td>{ta.name || 'N/A'}</td>
                          <td>{ta.email || 'N/A'}</td>
                          <td>{ta.department || 'N/A'}</td>
                          <td>
                            <button 
                              className="btn icon danger small" 
                              onClick={() => {
                                if (viewingClassTAs) {
                                  unenrollTA(ta.id);
                                  setShowTADetailsModal(false);
                                  setViewingClassTAs(null);
                                }
                              }}
                              title="Remove TA from Class"
                            >
                              <XCircle />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => { setShowTADetailsModal(false); setViewingClassTAs(null); }}>Close</button>
              <button className="btn primary" onClick={() => {
                setShowTADetailsModal(false);
                setViewingClassTAs(null);
                if (viewingClassTAs) {
                  setSelectedClass(viewingClassTAs);
                  setAssignTAForm({selectedTAs: viewingClassTAs.taIds || []});
                  setShowAssignTAModal(true);
                }
              }}>
                <Settings /> Manage TAs
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfilePreview(null); }}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4><User /> Update Profile Picture</h4>
              <button className="icon-btn" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfilePreview(null); }}><XCircle/></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '16px',
                padding: '20px',
                border: '2px dashed rgba(102, 126, 234, 0.3)',
                borderRadius: '12px',
                background: profilePreview ? 'transparent' : 'rgba(102, 126, 234, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => document.getElementById('profile-upload')?.click()}
              onMouseEnter={(e) => { if (!profilePreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)'; }}
              onMouseLeave={(e) => { if (!profilePreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.02)'; }}
              >
                {profilePreview ? (
                  <>
                    <img 
                      src={profilePreview} 
                      alt="Preview" 
                      style={{ 
                        width: '150px', 
                        height: '150px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '3px solid rgba(102, 126, 234, 0.2)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                      }} 
                    />
                    <button 
                      type="button"
                      className="btn subtle small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfilePicture(null);
                        setProfilePreview(null);
                      }}
                    >
                      <XCircle style={{ width: '14px', height: '14px' }} /> Remove Photo
                    </button>
                  </>
                ) : (
                  <>
                    <Camera style={{ width: '64px', height: '64px', color: '#667eea', opacity: 0.6 }} />
                    <div style={{ color: '#667eea', fontWeight: 500, fontSize: '16px' }}>
                      Click to upload profile picture
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      Max 5MB
                    </div>
                  </>
                )}
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleProfilePictureUpload}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfilePreview(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateProfilePicture} disabled={!profilePicture}>Update Profile Picture</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfessorDashboard;
