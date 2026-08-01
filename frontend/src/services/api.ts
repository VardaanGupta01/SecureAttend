import api from '../config/api';

export { api };

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
      wifiSSID: sessionData?.wifiSSID ?? 'Campus-WiFi',
      allowedRadiusMeters: sessionData?.allowedRadiusMeters ?? 50.0,
      durationMinutes: sessionData?.durationMinutes ?? 120,
      requireLocation: sessionData?.requireLocation ?? true,
      requireFace: sessionData?.requireFace ?? true,
      requireProfessorVerification: sessionData?.requireProfessorVerification ?? true,
      requireTAVerification: sessionData?.requireTAVerification ?? true,
    };
    return api.post(`/professor/classes/${classId}/sessions`, payload);
  },

  updateSession: (sessionId: string, sessionData: Record<string, unknown>) =>
    api.put(`/professor/sessions/${sessionId}`, sessionData),

  getSession: (sessionId: string) => api.get(`/professor/sessions/${sessionId}`),
  closeSession: (sessionId: string) => api.put(`/professor/sessions/${sessionId}/close`),
  getOpenSessions: (classId: string) => api.get(`/professor/classes/${classId}/sessions/open`),
  getLiveAttendance: (sessionId: string) => api.get(`/professor/sessions/${sessionId}/attendance`),
  updateHeadcount: (sessionId: string, headcount: number) =>
    api.put(`/professor/sessions/${sessionId}/headcount?headcount=${headcount}`),
  flagProxy: (attendanceId: string, flagged: boolean, reason?: string) =>
    api.put(`/professor/attendance/${attendanceId}/flag?flagged=${flagged}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  verifyAttendance: (attendanceId: string, approved: boolean, notes?: string) =>
    api.put(`/professor/attendance/${attendanceId}/verify?approved=${approved}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
};

export const studentAPI = {
  initiateAttendance: (data: Record<string, unknown>) => api.post('/student/attendance/initiate', data),
  verifyLocation: (data: Record<string, unknown>) => api.post('/student/attendance/verify-location', data),
  verifyFace: (data: Record<string, unknown>) => api.post('/student/attendance/verify-face', data),
  getStudentAttendance: (studentId: string) => api.get(`/student/${studentId}/attendance`),
  getAttendanceById: (attendanceId: string) => api.get(`/student/attendance/${attendanceId}`),
};

export const taAPI = {
  getVerifiedAttendance: (sessionId: string, taId: string) =>
    api.get(`/ta/sessions/${sessionId}/attendance?taId=${taId}`),
  getStudentAttendanceHistory: (studentId: string, taId: string) =>
    api.get(`/ta/students/${studentId}/attendance?taId=${taId}`),
  getFlaggedAttendance: (taId: string) => api.get(`/ta/attendance/flagged?taId=${taId}`),
  getPendingVerifications: (taId: string) => api.get(`/ta/attendance/pending?taId=${taId}`),
  verifyAttendance: (attendanceId: string, taId: string, approved: boolean, notes?: string) =>
    api.put(`/ta/attendance/${attendanceId}/verify?taId=${taId}&approved=${approved}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`),
};

export const profileAPI = {
  updateProfilePicture: (userId: string, _role: string, profilePictureBase64: string) =>
    api.put(`/professor/profile/picture?userId=${userId}`, { profilePictureBase64 }),
};

export default api;
