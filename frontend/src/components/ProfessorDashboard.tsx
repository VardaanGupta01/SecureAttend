import React, { useEffect, useState } from "react";
import {
  Users, Plus, QrCode, Clock, MapPin, CheckCircle, XCircle,
  UserPlus, Trash2, BookOpen, GraduationCap,
  AlertCircle, Eye, Settings, Calendar, TrendingUp, Edit, Camera, User, Wifi
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import DashboardLayout from './layout/DashboardLayout';
import api from '../config/api';
import { profileAPI } from '../services/api';
import { DEPARTMENTS } from '../constants/departments';

const apiClient = api;

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
  requireWifi?: boolean;
  requireSubnetCheck?: boolean;
  networkId?: string;
  subnetMask?: string;
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
  deviceFingerprint?: string;
  deviceMacAddress?: string;
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

  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'tas'>('sessions');

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
  const [profileModalPreview, setProfileModalPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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
    latitude: 0, longitude: 0, wifiSSID: "",
    networkId: "", subnetMask: "255.255.255.0", requireSubnetCheck: true,
    requireOneDevicePerStudent: true,
    allowedRadiusMeters: 50, durationMinutes: 120, requireLocation: true,
    requireWifi: true, requireProfessorVerification: true, requireTAVerification: false
  });

  const [detectingWifi, setDetectingWifi] = useState(false);

  const fetchCurrentWifiForSession = async () => {
    setDetectingWifi(true);
    try {
      const res = await api.get('/student/detect-network');
      const data = res.data?.data || res.data;
      if (data?.detectedSSID) {
        setSessionForm((prev: any) => ({
          ...prev,
          wifiSSID: data.detectedSSID,
          networkId: data.networkId || prev.networkId,
          subnetMask: data.subnetMask || prev.subnetMask,
          requireWifi: true,
          requireSubnetCheck: true,
        }));
        setFlashMessage({
          type: 'success',
          text: `Auto-filled Wi-Fi: ${data.detectedSSID} (Subnet: ${data.networkId || 'N/A'})`,
        });
      } else {
        setFlashMessage({ type: 'info', text: 'No active Wi-Fi detected on this host.' });
      }
    } catch (err) {
      console.warn('Could not auto-detect Wi-Fi:', err);
    } finally {
      setDetectingWifi(false);
    }
  };

  const fetchCurrentWifiForEditSession = async () => {
    setDetectingWifi(true);
    try {
      const res = await api.get('/student/detect-network');
      const data = res.data?.data || res.data;
      if (data?.detectedSSID) {
        setEditSessionForm((prev: any) => ({
          ...prev,
          wifiSSID: data.detectedSSID,
          networkId: data.networkId || prev.networkId,
          subnetMask: data.subnetMask || prev.subnetMask,
          requireWifi: true,
          requireSubnetCheck: true,
        }));
        setFlashMessage({
          type: 'success',
          text: `Auto-filled Wi-Fi: ${data.detectedSSID} (Subnet: ${data.networkId || 'N/A'})`,
        });
      } else {
        setFlashMessage({ type: 'info', text: 'No active Wi-Fi detected on this host.' });
      }
    } catch (err) {
      console.warn('Could not auto-detect Wi-Fi:', err);
    } finally {
      setDetectingWifi(false);
    }
  };

  const [locationLoading, setLocationLoading] = useState(false);

  const fetchCurrentLocation = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  const applyLocationToSessionForm = async (classItem?: ClassItem | null) => {
    setLocationLoading(true);
    try {
      const { latitude, longitude } = await fetchCurrentLocation();
      setSessionForm((prev: typeof sessionForm) => ({
        ...prev,
        latitude,
        longitude,
        wifiSSID: classItem?.wifiSSID ?? prev.wifiSSID,
      }));
    } catch {
      if (classItem?.latitude != null && classItem?.longitude != null) {
        setSessionForm((prev: typeof sessionForm) => ({
          ...prev,
          latitude: classItem.latitude,
          longitude: classItem.longitude,
          wifiSSID: classItem.wifiSSID ?? prev.wifiSSID,
        }));
        setMessage({ type: 'error', text: 'GPS unavailable — using class location. Allow browser location or enter coordinates manually.' });
      } else {
        setMessage({ type: 'error', text: 'Could not get your location. Allow location access in the browser and try again.' });
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const openCreateSessionModal = () => {
    if (!selectedClass) return;
    setSessionForm((prev: typeof sessionForm) => ({
      ...prev,
      latitude: selectedClass.latitude ?? prev.latitude,
      longitude: selectedClass.longitude ?? prev.longitude,
      wifiSSID: selectedClass.wifiSSID ?? prev.wifiSSID,
    }));
    setShowCreateSessionModal(true);
    applyLocationToSessionForm(selectedClass);
  };

  const [editSessionForm, setEditSessionForm] = useState<any>({
    latitude: 40.7128, longitude: -74.0060, wifiSSID: "",
    networkId: "", subnetMask: "255.255.255.0", requireSubnetCheck: true,
    requireOneDevicePerStudent: true,
    allowedRadiusMeters: 50, durationMinutes: 120, requireLocation: true,
    requireWifi: true, requireProfessorVerification: true, requireTAVerification: false
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
      setClassForm({ code: '', title: '', description: '', semester: '', credits: 3, schedule: '', location: '', latitude: 40.7128, longitude: -74.0060, wifiSSID: 'Campus-WiFi' });
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
    if (!selectedClass) { setMessage({ type: 'error', text: 'Select a class' }); return; }
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
        setProfileModalPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfilePicture = async () => {
    if (!professorId || !profilePicture) return;
    try {
      await profileAPI.updateProfilePicture(professorId, 'PROFESSOR', profilePicture);
      setShowProfileModal(false);
      setProfilePicture(null);
      setProfileModalPreview(null);
      await loadProfessorProfile();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile picture' });
    }
  };

  const enrollStudent = async () => {
    if (!selectedClass) { setMessage({ type: 'error', text: 'Select a class' }); return; }
    if (!enrollForm.name.trim() || !enrollForm.rollNumber.trim() || !enrollForm.email.trim() || !enrollForm.password) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Name, Roll Number, Email, Password)' });
      return;
    }
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
      setEnrollForm({ name: '', rollNumber: '', password: '', email: '', major: '', year: 1, photo: null, photoPreview: null });
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
    if (!taForm.name.trim() || !taForm.taId.trim() || !taForm.email.trim() || !taForm.password) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Name, TA ID, Email, Password)' });
      return;
    }
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
          wifiSSID: sessionData.wifiSSID ?? "",
          networkId: sessionData.networkId ?? "",
          subnetMask: sessionData.subnetMask ?? "255.255.255.0",
          requireSubnetCheck: sessionData.requireSubnetCheck ?? true,
          requireOneDevicePerStudent: sessionData.requireOneDevicePerStudent ?? true,
          allowedRadiusMeters: sessionData.allowedRadiusMeters ?? 50,
          durationMinutes: durationMinutes,
          requireLocation: sessionData.requireLocation ?? true,
          requireWifi: sessionData.requireWifi ?? Boolean(sessionData.wifiSSID),
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
    <DashboardLayout
      title="Professor Dashboard"
      subtitle={`Welcome back, ${user?.name ?? 'Professor'}`}
      icon={<GraduationCap size={28} />}
      profilePicture={profilePreview}
      onProfileClick={() => {
        setProfileModalPreview(profilePreview);
        setProfilePicture(null);
        setShowProfileModal(true);
      }}
      message={message}
      onDismissMessage={() => setMessage(null)}
      headerActions={
        <>
          <button type="button" className="btn primary" onClick={() => setShowCreateClassModal(true)}>
            <Plus className="ico" /> Create Class
          </button>
          <button type="button" className="btn ghost" onClick={() => setShowCreateTAModal(true)}>
            <UserPlus className="ico" /> Add TA
          </button>
        </>
      }
    >
      <div className="pa-card">
        <nav className="pa-tabs">
          <button className={`pa-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            <BookOpen /> Classes & Sessions
          </button>
          <button className={`pa-tab ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            <Users /> Students ({enrolledStudents.length})
          </button>
          <button className={`pa-tab ${activeTab === 'tas' ? 'active' : ''}`} onClick={() => setActiveTab('tas')}>
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
                        <button className="btn subtle" onClick={() => { setAssignTAForm({ selectedTAs: selectedClass.taIds || [] }); setShowAssignTAModal(true); }}>
                          <Settings /> Manage TAs
                        </button>
                        <button className="btn primary" onClick={openCreateSessionModal}><Plus /> New Session</button>
                      </div>
                    </div>

                    <div className="class-info">
                      <div className="ci-code">{selectedClass.code} - {selectedClass.title}</div>
                      <div className="ci-location"><MapPin /> {selectedClass.location || 'Location not set'}</div>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="empty session-empty-cta">
                        <QrCode size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
                        <p><strong>No active session yet</strong></p>
                        <p style={{ fontSize: '0.9rem', marginTop: 8, opacity: 0.8 }}>
                          Click the button below to start a session and get your QR code for students to scan.
                        </p>
                        <button
                          className="btn primary"
                          style={{ marginTop: 16 }}
                          onClick={openCreateSessionModal}
                        >
                          <Plus /> Start Session &amp; Get QR Code
                        </button>
                      </div>
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
                  <div className="empty large">
                    <p>No session selected</p>
                    <p style={{ fontSize: '0.85rem', marginTop: 8, opacity: 0.75 }}>
                      Start a session first — the QR code and live attendance will appear here.
                    </p>
                  </div>
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
                                {p.deviceFingerprint && (
                                  <div style={{ fontSize: '0.72rem', color: '#6366f1', fontFamily: 'monospace', marginTop: 2 }}>
                                    🔒 {p.deviceFingerprint.slice(0, 16)} {p.deviceMacAddress && p.deviceMacAddress !== '00:00:00:00:00:00' ? `(${p.deviceMacAddress})` : ''}
                                  </div>
                                )}
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
                            {a.deviceFingerprint && (
                              <div style={{ fontSize: '0.72rem', color: '#6366f1', fontFamily: 'monospace', marginTop: 3 }}>
                                🔒 Dev: {a.deviceFingerprint} {a.deviceMacAddress && a.deviceMacAddress !== '00:00:00:00:00:00' ? `(${a.deviceMacAddress})` : ''}
                              </div>
                            )}
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
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><BookOpen /> Create New Class</h4>
              <button className="icon-btn" onClick={() => setShowCreateClassModal(false)}><XCircle /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>
                  Class Code
                  <input
                    value={classForm.code}
                    onChange={e => setClassForm({ ...classForm, code: e.target.value })}
                    placeholder="e.g., CS101"
                  />
                </label>
                <label>
                  Credits
                  <input
                    type="number"
                    value={classForm.credits}
                    onChange={e => setClassForm({ ...classForm, credits: parseInt(e.target.value || '0') })}
                    placeholder="3"
                  />
                </label>
              </div>
              <label>
                Course Title
                <input
                  value={classForm.title}
                  onChange={e => setClassForm({ ...classForm, title: e.target.value })}
                  placeholder="e.g., Introduction to Computer Science"
                />
              </label>
              <label>
                Course Description
                <textarea
                  value={classForm.description}
                  onChange={e => setClassForm({ ...classForm, description: e.target.value })}
                  placeholder="Brief overview of course topics, syllabus, and objectives..."
                />
              </label>
              <div className="grid-2">
                <label>
                  Semester
                  <input
                    value={classForm.semester}
                    onChange={e => setClassForm({ ...classForm, semester: e.target.value })}
                    placeholder="e.g., Fall 2024"
                  />
                </label>
                <label>
                  Lecture Schedule
                  <input
                    value={classForm.schedule}
                    onChange={e => setClassForm({ ...classForm, schedule: e.target.value })}
                    placeholder="e.g., Mon/Wed 10:00 - 11:30 AM"
                  />
                </label>
              </div>
              <label>
                Physical Classroom / Hall
                <input
                  value={classForm.location}
                  onChange={e => setClassForm({ ...classForm, location: e.target.value })}
                  placeholder="e.g., Room 301, Engineering Hall"
                />
              </label>
              <div className="grid-2">
                <label>
                  Classroom Latitude
                  <input
                    type="number"
                    step="0.000001"
                    value={classForm.latitude}
                    onChange={e => setClassForm({ ...classForm, latitude: parseFloat(e.target.value || '0') })}
                    placeholder="e.g., 25.4299"
                  />
                </label>
                <label>
                  Classroom Longitude
                  <input
                    type="number"
                    step="0.000001"
                    value={classForm.longitude}
                    onChange={e => setClassForm({ ...classForm, longitude: parseFloat(e.target.value || '0') })}
                    placeholder="e.g., 81.7712"
                  />
                </label>
              </div>
              <label>
                Classroom Wi-Fi Network Name (SSID)
                <input
                  value={classForm.wifiSSID}
                  onChange={e => setClassForm({ ...classForm, wifiSSID: e.target.value })}
                  placeholder="e.g., Campus-WiFi"
                />
              </label>
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
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><Edit /> Edit Class Details</h4>
              <button className="icon-btn" onClick={() => { setShowEditClassModal(false); setEditingClass(null); }}><XCircle /></button>
            </div>
            <div className="modal-body">
              {editingClass && (
                <>
                  <div className="info-box" style={{ marginBottom: '16px' }}>
                    <div><strong>Class ID:</strong> {editingClass.id?.slice(-8)}</div>
                    <div><strong>Current Code:</strong> {editingClass.code}</div>
                    <div><strong>Current Title:</strong> {editingClass.title}</div>
                  </div>
                  <div className="grid-2">
                    <label>
                      Class Code
                      <input
                        value={editClassForm.code}
                        onChange={e => setEditClassForm({ ...editClassForm, code: e.target.value })}
                        placeholder="e.g., CS101"
                      />
                    </label>
                    <label>
                      Credits
                      <input
                        type="number"
                        value={editClassForm.credits}
                        onChange={e => setEditClassForm({ ...editClassForm, credits: parseInt(e.target.value || '0') })}
                        placeholder="3"
                      />
                    </label>
                  </div>
                  <label>
                    Course Title
                    <input
                      value={editClassForm.title}
                      onChange={e => setEditClassForm({ ...editClassForm, title: e.target.value })}
                      placeholder="e.g., Introduction to Computer Science"
                    />
                  </label>
                  <label>
                    Course Description
                    <textarea
                      value={editClassForm.description}
                      onChange={e => setEditClassForm({ ...editClassForm, description: e.target.value })}
                      placeholder="Course overview and objectives..."
                    />
                  </label>
                  <div className="grid-2">
                    <label>
                      Semester
                      <input
                        value={editClassForm.semester}
                        onChange={e => setEditClassForm({ ...editClassForm, semester: e.target.value })}
                        placeholder="e.g., Fall 2024"
                      />
                    </label>
                    <label>
                      Lecture Schedule
                      <input
                        value={editClassForm.schedule}
                        onChange={e => setEditClassForm({ ...editClassForm, schedule: e.target.value })}
                        placeholder="e.g., Mon/Wed 10:00 - 11:30 AM"
                      />
                    </label>
                  </div>
                  <label>
                    Physical Classroom / Hall
                    <input
                      value={editClassForm.location}
                      onChange={e => setEditClassForm({ ...editClassForm, location: e.target.value })}
                      placeholder="e.g., Room 301, Engineering Hall"
                    />
                  </label>
                  <div className="grid-2">
                    <label>
                      Classroom Latitude
                      <input
                        type="number"
                        step="0.000001"
                        value={editClassForm.latitude}
                        onChange={e => setEditClassForm({ ...editClassForm, latitude: parseFloat(e.target.value || '0') })}
                      />
                    </label>
                    <label>
                      Classroom Longitude
                      <input
                        type="number"
                        step="0.000001"
                        value={editClassForm.longitude}
                        onChange={e => setEditClassForm({ ...editClassForm, longitude: parseFloat(e.target.value || '0') })}
                      />
                    </label>
                  </div>
                  <label>
                    Classroom Wi-Fi Network Name (SSID)
                    <input
                      value={editClassForm.wifiSSID}
                      onChange={e => setEditClassForm({ ...editClassForm, wifiSSID: e.target.value })}
                      placeholder="e.g., Campus-WiFi"
                    />
                  </label>
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
              <div style={{ flex: 1 }}></div>
              <button className="btn ghost" onClick={() => { setShowEditClassModal(false); setEditingClass(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateClass}>Update Class</button>
            </div>
          </div>
        </div>
      )}

      {showCreateSessionModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowCreateSessionModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h4><Calendar /> Create Session for {selectedClass.code}</h4><button className="icon-btn" onClick={() => setShowCreateSessionModal(false)}><XCircle /></button></div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                  {locationLoading ? '📍 Fetching your current location…' : '📍 Session location (used to verify students are in class)'}
                </span>
                <button
                  type="button"
                  className="btn subtle"
                  disabled={locationLoading}
                  onClick={() => applyLocationToSessionForm(selectedClass)}
                >
                  <MapPin /> Refresh GPS
                </button>
              </div>
              <div className="grid-2">
                <label>
                  Session Latitude
                  <input
                    type="number"
                    step="0.000001"
                    value={sessionForm.latitude}
                    onChange={e => setSessionForm({ ...sessionForm, latitude: parseFloat(e.target.value || '0') })}
                    placeholder="e.g., 25.4299"
                  />
                </label>
                <label>
                  Session Longitude
                  <input
                    type="number"
                    step="0.000001"
                    value={sessionForm.longitude}
                    onChange={e => setSessionForm({ ...sessionForm, longitude: parseFloat(e.target.value || '0') })}
                    placeholder="e.g., 81.7712"
                  />
                </label>
              </div>
              <div className="form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>Classroom Wi-Fi Network Name (SSID)</label>
                  <button
                    type="button"
                    className="btn subtle"
                    style={{ padding: '2px 8px', fontSize: '0.78rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={fetchCurrentWifiForSession}
                    disabled={detectingWifi}
                    title="Auto-fill with currently connected network"
                  >
                    <Wifi size={13} />
                    {detectingWifi ? 'Detecting…' : 'Use Current Wi-Fi'}
                  </button>
                </div>
                <input
                  value={sessionForm.wifiSSID}
                  onChange={e => setSessionForm({ ...sessionForm, wifiSSID: e.target.value })}
                  placeholder="e.g., Redmi Note 13 5G or Campus-WiFi"
                />
                <div className="form-hint">
                  Students will be required to be connected to this network to mark attendance.
                </div>
              </div>
              <div className="grid-2">
                <label>
                  Network ID (CIDR Subnet)
                  <input
                    value={sessionForm.networkId}
                    onChange={e => setSessionForm({ ...sessionForm, networkId: e.target.value })}
                    placeholder="e.g., 10.50.100.0/24"
                  />
                </label>
                <label>
                  Subnet Mask
                  <input
                    value={sessionForm.subnetMask}
                    onChange={e => setSessionForm({ ...sessionForm, subnetMask: e.target.value })}
                    placeholder="255.255.255.0"
                  />
                </label>
              </div>
              <div className="grid-2">
                <label>
                  Allowed Radius (meters)
                  <input
                    type="number"
                    value={sessionForm.allowedRadiusMeters}
                    onChange={e => setSessionForm({ ...sessionForm, allowedRadiusMeters: parseFloat(e.target.value || '0') })}
                    placeholder="50"
                  />
                </label>
                <label>
                  Session Duration (minutes)
                  <input
                    type="number"
                    value={sessionForm.durationMinutes}
                    onChange={e => setSessionForm({ ...sessionForm, durationMinutes: parseInt(e.target.value || '0') })}
                    placeholder="30"
                  />
                </label>
              </div>
              <div className="checkbox-grid">
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireLocation} onChange={e => setSessionForm({ ...sessionForm, requireLocation: e.target.checked })} />
                  <span>Require Location Geofencing</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireWifi} onChange={e => setSessionForm({ ...sessionForm, requireWifi: e.target.checked })} />
                  <span>Require Wi-Fi SSID Verification</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireSubnetCheck} onChange={e => setSessionForm({ ...sessionForm, requireSubnetCheck: e.target.checked })} />
                  <span>Verify Subnet Mask & Network ID (Anti-Rogue AP)</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireOneDevicePerStudent} onChange={e => setSessionForm({ ...sessionForm, requireOneDevicePerStudent: e.target.checked })} />
                  <span>Enforce One Device, One Attendance (Anti-Proxy Device Lock)</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireProfessorVerification} onChange={e => setSessionForm({ ...sessionForm, requireProfessorVerification: e.target.checked })} />
                  <span>Require Professor Dual-Check</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={sessionForm.requireTAVerification} onChange={e => setSessionForm({ ...sessionForm, requireTAVerification: e.target.checked })} />
                  <span>Require TA Verification</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowCreateSessionModal(false)}>Cancel</button>
              <button className="btn primary" onClick={createSession}>Create Session</button>
            </div>
          </div>
        </div>
      )}

      {showEditSessionModal && editingSession && (
        <div className="modal-overlay" onClick={() => { setShowEditSessionModal(false); setEditingSession(null); }}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><Edit /> Edit Session Settings</h4>
              <button className="icon-btn" onClick={() => { setShowEditSessionModal(false); setEditingSession(null); }}><XCircle /></button>
            </div>
            <div className="modal-body">
              {editingSession && (
                <>
                  <div className="info-box" style={{ marginBottom: '16px' }}>
                    <div><strong>Session ID:</strong> {editingSession.id?.slice(-8)}</div>
                    <div><strong>Status:</strong> {editingSession.status || 'N/A'}</div>
                    <div><strong>Codeword:</strong> <code>{editingSession.codeword}</code></div>
                    {editingSession.startTime && <div><strong>Started:</strong> {new Date(editingSession.startTime).toLocaleString()}</div>}
                    {editingSession.endTime && <div><strong>Ends:</strong> {new Date(editingSession.endTime).toLocaleString()}</div>}
                  </div>
                  <div className="grid-2">
                    <label>
                      Session Latitude
                      <input
                        type="number"
                        step="0.000001"
                        value={editSessionForm.latitude}
                        onChange={e => setEditSessionForm({ ...editSessionForm, latitude: parseFloat(e.target.value || '0') })}
                      />
                    </label>
                    <label>
                      Session Longitude
                      <input
                        type="number"
                        step="0.000001"
                        value={editSessionForm.longitude}
                        onChange={e => setEditSessionForm({ ...editSessionForm, longitude: parseFloat(e.target.value || '0') })}
                      />
                    </label>
                  </div>
                  <div className="form-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ margin: 0, fontWeight: 600 }}>Classroom Wi-Fi Network Name (SSID)</label>
                      <button
                        type="button"
                        className="btn subtle"
                        style={{ padding: '2px 8px', fontSize: '0.78rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={fetchCurrentWifiForEditSession}
                        disabled={detectingWifi}
                        title="Auto-fill with currently connected network"
                      >
                        <Wifi size={13} />
                        {detectingWifi ? 'Detecting…' : 'Use Current Wi-Fi'}
                      </button>
                    </div>
                    <input
                      value={editSessionForm.wifiSSID}
                      onChange={e => setEditSessionForm({ ...editSessionForm, wifiSSID: e.target.value })}
                      placeholder="e.g., Redmi Note 13 5G or Campus-WiFi"
                    />
                    <div className="form-hint">
                      Students will be required to be connected to this network to mark attendance.
                    </div>
                  </div>
                  <div className="grid-2">
                    <label>
                      Network ID (CIDR Subnet)
                      <input
                        value={editSessionForm.networkId}
                        onChange={e => setEditSessionForm({ ...editSessionForm, networkId: e.target.value })}
                        placeholder="e.g., 10.50.100.0/24"
                      />
                    </label>
                    <label>
                      Subnet Mask
                      <input
                        value={editSessionForm.subnetMask}
                        onChange={e => setEditSessionForm({ ...editSessionForm, subnetMask: e.target.value })}
                        placeholder="255.255.255.0"
                      />
                    </label>
                  </div>
                  <div className="grid-2">
                    <label>
                      Allowed Radius (meters)
                      <input
                        type="number"
                        value={editSessionForm.allowedRadiusMeters}
                        onChange={e => setEditSessionForm({ ...editSessionForm, allowedRadiusMeters: parseFloat(e.target.value || '0') })}
                      />
                    </label>
                    <label>
                      Session Duration (minutes)
                      <input
                        type="number"
                        value={editSessionForm.durationMinutes}
                        onChange={e => setEditSessionForm({ ...editSessionForm, durationMinutes: parseInt(e.target.value || '0') })}
                      />
                    </label>
                  </div>
                  <div className="checkbox-grid">
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireLocation} onChange={e => setEditSessionForm({ ...editSessionForm, requireLocation: e.target.checked })} />
                      <span>Require Location Geofencing</span>
                    </label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireWifi} onChange={e => setEditSessionForm({ ...editSessionForm, requireWifi: e.target.checked })} />
                      <span>Require Wi-Fi SSID Verification</span>
                    </label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireSubnetCheck} onChange={e => setEditSessionForm({ ...editSessionForm, requireSubnetCheck: e.target.checked })} />
                      <span>Verify Subnet Mask & Network ID (Anti-Rogue AP)</span>
                    </label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireOneDevicePerStudent} onChange={e => setEditSessionForm({ ...editSessionForm, requireOneDevicePerStudent: e.target.checked })} />
                      <span>Enforce One Device, One Attendance (Anti-Proxy Device Lock)</span>
                    </label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireProfessorVerification} onChange={e => setEditSessionForm({ ...editSessionForm, requireProfessorVerification: e.target.checked })} />
                      <span>Require Professor Dual-Check</span>
                    </label>
                    <label className="checkbox-item">
                      <input type="checkbox" checked={editSessionForm.requireTAVerification} onChange={e => setEditSessionForm({ ...editSessionForm, requireTAVerification: e.target.checked })} />
                      <span>Require TA Verification</span>
                    </label>
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
              <div style={{ flex: 1 }}></div>
              <button className="btn ghost" onClick={() => { setShowEditSessionModal(false); setEditingSession(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateSession}>Update Session</button>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><UserPlus /> Enroll Student to {selectedClass.code}</h4>
              <button className="icon-btn" onClick={() => setShowEnrollModal(false)}><XCircle /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Student Photo (Optional)
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '18px',
                  border: '2px dashed rgba(102, 126, 234, 0.35)',
                  borderRadius: '12px',
                  background: enrollForm.photoPreview ? '#ffffff' : 'rgba(102, 126, 234, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  onMouseEnter={(e) => { if (!enrollForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)'; }}
                  onMouseLeave={(e) => { if (!enrollForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.02)'; }}
                >
                  {enrollForm.photoPreview ? (
                    <>
                      <img
                        src={enrollForm.photoPreview}
                        alt="Preview"
                        style={{
                          width: '110px',
                          height: '110px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid rgba(102, 126, 234, 0.3)',
                          boxShadow: '0 4px 14px rgba(102, 126, 234, 0.2)'
                        }}
                      />
                      <button
                        type="button"
                        className="btn subtle small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnrollForm({ ...enrollForm, photo: null, photoPreview: null });
                        }}
                        style={{ marginTop: '6px' }}
                      >
                        <XCircle style={{ width: '14px', height: '14px' }} /> Remove Photo
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera style={{ width: '42px', height: '42px', color: '#667eea', opacity: 0.7 }} />
                      <div style={{ color: '#667eea', fontWeight: 600, fontSize: '14px' }}>
                        Click to upload photo
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        PNG or JPG (Max 5MB)
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

              <label>
                Full Name
                <input
                  value={enrollForm.name}
                  onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })}
                  placeholder="e.g., Alex Smith"
                />
              </label>

              <label>
                Roll Number / Student ID
                <input
                  value={enrollForm.rollNumber}
                  onChange={e => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
                  placeholder="e.g., S101 or 2024CS001"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={enrollForm.email}
                  onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                  placeholder="e.g., alex.smith@campus.edu"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={enrollForm.password}
                  onChange={e => setEnrollForm({ ...enrollForm, password: e.target.value })}
                  placeholder="Create a student password"
                />
              </label>

              <div className="grid-2">
                <label>
                  Major / Department
                  <select
                    value={enrollForm.major}
                    onChange={e => setEnrollForm({ ...enrollForm, major: e.target.value })}
                  >
                    <option value="">Select Department / Major</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Academic Year
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={enrollForm.year}
                    onChange={e => setEnrollForm({ ...enrollForm, year: parseInt(e.target.value || '1') })}
                    placeholder="1"
                  />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => {
                setShowEnrollModal(false);
                setEnrollForm({ name: '', rollNumber: '', password: '', email: '', major: '', year: 1, photo: null, photoPreview: null });
              }}>Cancel</button>
              <button className="btn primary" onClick={enrollStudent}>Enroll Student</button>
            </div>
          </div>
        </div>
      )}

      {showCreateTAModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateTAModal(false);
          setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><GraduationCap /> Add Teaching Assistant</h4>
              <button className="icon-btn" onClick={() => {
                setShowCreateTAModal(false);
                setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
              }}><XCircle /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Profile Picture (Optional)
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '18px',
                  border: '2px dashed rgba(102, 126, 234, 0.35)',
                  borderRadius: '12px',
                  background: taForm.photoPreview ? '#ffffff' : 'rgba(102, 126, 234, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                  onClick={() => document.getElementById('ta-photo-upload')?.click()}
                  onMouseEnter={(e) => { if (!taForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)'; }}
                  onMouseLeave={(e) => { if (!taForm.photoPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.02)'; }}
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
                          border: '3px solid rgba(102, 126, 234, 0.3)',
                          boxShadow: '0 4px 14px rgba(102, 126, 234, 0.2)'
                        }}
                      />
                      <button
                        type="button"
                        className="btn subtle small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaForm({ ...taForm, photo: null, photoPreview: null });
                        }}
                        style={{ marginTop: '6px' }}
                      >
                        <XCircle style={{ width: '12px', height: '12px' }} /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera style={{ width: '42px', height: '42px', color: '#667eea', opacity: 0.7 }} />
                      <div style={{ color: '#667eea', fontWeight: 600, fontSize: '14px' }}>
                        Click to upload photo
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        PNG or JPG (Max 5MB)
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
              </div>

              <label>
                Full Name
                <input
                  value={taForm.name}
                  onChange={e => setTaForm({ ...taForm, name: e.target.value })}
                  placeholder="e.g., Sarah Connor"
                />
              </label>

              <label>
                TA Identification ID
                <input
                  value={taForm.taId}
                  onChange={e => setTaForm({ ...taForm, taId: e.target.value })}
                  placeholder="e.g., TA001 or TA_CS_01"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={taForm.email}
                  onChange={e => setTaForm({ ...taForm, email: e.target.value })}
                  placeholder="e.g., sarah.connor@campus.edu"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={taForm.password}
                  onChange={e => setTaForm({ ...taForm, password: e.target.value })}
                  placeholder="Create a password for this TA"
                />
              </label>

              <label>
                Department / Faculty
                <select
                  value={taForm.department}
                  onChange={e => setTaForm({ ...taForm, department: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => {
                setShowCreateTAModal(false);
                setTaForm({ name: '', taId: '', password: '', email: '', department: '', photo: null, photoPreview: null });
              }}>Cancel</button>
              <button className="btn primary" onClick={createTA}>Add TA</button>
            </div>
          </div>
        </div>
      )}

      {showAssignTAModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowAssignTAModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h4><Settings /> Assign TAs to {selectedClass.code}</h4><button className="icon-btn" onClick={() => setShowAssignTAModal(false)}><XCircle /></button></div>
            <div className="modal-body">
              <div className="ta-assign-list">
                {taList.map(ta => (
                  <label key={ta.id} className="ta-assign-item">
                    <input type="checkbox" checked={assignTAForm.selectedTAs.includes(ta.id)} onChange={(e) => {
                      if (e.target.checked) setAssignTAForm({ selectedTAs: [...assignTAForm.selectedTAs, ta.id] });
                      else setAssignTAForm({ selectedTAs: assignTAForm.selectedTAs.filter(id => id !== ta.id) });
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
              <button className="btn ghost" onClick={() => setShowAssignTAModal(false)}>Cancel</button>
              <button className="btn primary" onClick={assignTAsToClass}>Assign TAs</button>
            </div>
          </div>
        </div>
      )}

      {showTADetailsModal && viewingClassTAs && (
        <div className="modal-overlay" onClick={() => { setShowTADetailsModal(false); setViewingClassTAs(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><GraduationCap /> TA Details - {viewingClassTAs.code}</h4>
              <button className="icon-btn" onClick={() => { setShowTADetailsModal(false); setViewingClassTAs(null); }}><XCircle /></button>
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
                  setAssignTAForm({ selectedTAs: viewingClassTAs.taIds || [] });
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
        <div className="modal-overlay" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfileModalPreview(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4><User /> Update Profile Picture</h4>
              <button className="icon-btn" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfileModalPreview(null); }}><XCircle /></button>
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
                background: profileModalPreview ? 'transparent' : 'rgba(102, 126, 234, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
                onClick={() => document.getElementById('profile-upload')?.click()}
                onMouseEnter={(e) => { if (!profileModalPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)'; }}
                onMouseLeave={(e) => { if (!profileModalPreview) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.02)'; }}
              >
                {profileModalPreview ? (
                  <>
                    <img
                      src={profileModalPreview}
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
                        setProfileModalPreview(null);
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
              <button className="btn ghost" onClick={() => { setShowProfileModal(false); setProfilePicture(null); setProfileModalPreview(null); }}>Cancel</button>
              <button className="btn primary" onClick={updateProfilePicture} disabled={!profilePicture}>Update Profile Picture</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ProfessorDashboard;
