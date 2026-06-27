import axios from 'axios'
// https://secure-attend-backend.onrender.com
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080/api'
  : 'https://secure-attend-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const professorAPI = {
  createSession: (classId: string, sessionData?: {
    latitude?: number;
    longitude?: number;
    wifiSSID?: string;
    allowedRadiusMeters?: number;
    durationMinutes?: number;
    requireLocation?: boolean;
    requireFace?: boolean;
    requireProfessorVerification?: boolean;
    requireTAVerification?: boolean;
  }) => {
    const payload = {
      latitude: sessionData?.latitude ?? 40.7128,
      longitude: sessionData?.longitude ?? -74.0060,
      wifiSSID: sessionData?.wifiSSID ?? "Campus-WiFi",
      allowedRadiusMeters: sessionData?.allowedRadiusMeters ?? 50.0,
      durationMinutes: sessionData?.durationMinutes ?? 120,
      requireLocation: sessionData?.requireLocation ?? true,
      requireFace: sessionData?.requireFace ?? true,
      requireProfessorVerification: sessionData?.requireProfessorVerification ?? true,
      requireTAVerification: sessionData?.requireTAVerification ?? true,
    };
    return api.post(`/professor/classes/${classId}/sessions`, payload);
  },
  
  updateSession: (sessionId: string, sessionData: {
    latitude?: number;
    longitude?: number;
    wifiSSID?: string;
    allowedRadiusMeters?: number;
    durationMinutes?: number;
    requireLocation?: boolean;
    requireFace?: boolean;
    requireProfessorVerification?: boolean;
    requireTAVerification?: boolean;
  }) => {
    return api.put(`/professor/sessions/${sessionId}`, sessionData);
  },
  
  getSession: (sessionId: string) =>
    api.get(`/professor/sessions/${sessionId}`),
  
  closeSession: (sessionId: string) => 
    api.put(`/professor/sessions/${sessionId}/close`),
  
  getOpenSessions: (classId: string) => 
    api.get(`/professor/classes/${classId}/sessions/open`),
  
  getLiveAttendance: (sessionId: string) => 
    api.get(`/professor/sessions/${sessionId}/attendance`),
  
  updateHeadcount: (sessionId: string, headcount: number) =>
    api.put(`/professor/sessions/${sessionId}/headcount?headcount=${headcount}`),
  
  flagProxy: (attendanceId: string, flagged: boolean, reason?: string) =>
    api.put(`/professor/attendance/${attendanceId}/flag?flagged=${flagged}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  
  verifyAttendance: (attendanceId: string, approved: boolean, notes?: string) =>
    api.put(`/professor/attendance/${attendanceId}/verify?approved=${approved}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
};

export const studentAPI = {
  initiateAttendance: (data: {
    studentId: string;
    sessionId: string;
    qrCodeOrCodeword: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) => api.post('/student/attendance/initiate', data),
  
  verifyLocation: (data: {
    attendanceId: string;
    latitude: number;
    longitude: number;
    wifiSSID?: string;
  }) => api.post('/student/attendance/verify-location', data),
  
  verifyFace: (data: {
    attendanceId: string;
    faceImageBase64: string;
    livenessDetected?: boolean;
  }) => api.post('/student/attendance/verify-face', data),
  
  getStudentAttendance: (studentId: string) => 
    api.get(`/student/${studentId}/attendance`),
  
  getAttendanceById: (attendanceId: string) =>
    api.get(`/student/attendance/${attendanceId}`),
}

export const taAPI = {
  getVerifiedAttendance: (sessionId: string) => 
    api.get(`/ta/sessions/${sessionId}/attendance`),
  
  getStudentAttendanceHistory: (studentId: string) => 
    api.get(`/ta/students/${studentId}/attendance`),
  
  getFlaggedAttendance: () =>
    api.get('/ta/attendance/flagged'),
  
  getPendingVerifications: () =>
    api.get('/ta/attendance/pending'),
  
  verifyAttendance: (attendanceId: string, approved: boolean, notes?: string) =>
    api.put(`/ta/attendance/${attendanceId}/verify?approved=${approved}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
}

export const profileAPI = {
  updateProfilePicture: (userId: string, role: 'PROFESSOR' | 'STUDENT' | 'TA', profilePictureBase64: string) => {
    const endpoint = role === 'PROFESSOR' ? '/professor' : role === 'STUDENT' ? '/student' : '/ta';
    return api.put(`${endpoint}/profile/picture?userId=${userId}`, { profilePictureBase64 });
  },
}

export default api