import { useState, useEffect } from 'react';
import {
  BarChart3, CheckCircle, XCircle, TrendingUp, Flag, BookOpen, Eye, RefreshCw, ClipboardList, X,
} from 'lucide-react';
import api from '../config/api';
import DashboardLayout from './layout/DashboardLayout';
import StatusBadge from './ui/StatusBadge';

const getUser = () => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

const TADashboard = () => {
  const user = getUser();
  const taId = user?.userId;

  const [activeTab, setActiveTab] = useState(0);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sessionReport, setSessionReport] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [flaggedAttendance, setFlaggedAttendance] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [selectedStudentRollNumber, setSelectedStudentRollNumber] = useState('');
  const [message, setMessage] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [liveMonitorDialogOpen, setLiveMonitorDialogOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    if (taId) {
      loadTAClasses();
      loadFlaggedAttendance();
      loadPendingApprovals();
      loadUserProfile();
    }
  }, [taId]);

  const loadUserProfile = async () => {
    if (!taId) return;
    try {
      const response = await api.get(`/ta/${taId}`);
      const taData = response.data?.data || response.data;
      if (taData?.profilePictureBase64) {
        setUserProfilePicture(taData.profilePictureBase64);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    if (selectedClass) loadClassSessions();
  }, [selectedClass]);

  useEffect(() => {
    if (!liveMonitorDialogOpen || !selectedSession) return;
    loadSessionAttendance();
    const interval = setInterval(loadSessionAttendance, 3000);
    return () => clearInterval(interval);
  }, [liveMonitorDialogOpen, selectedSession]);

  const loadTAClasses = async () => {
    try {
      const res = await api.get(`/ta/classes?taId=${taId}`);
      const classesData = res.data?.data || [];
      setClasses(Array.isArray(classesData) ? classesData : []);
      if (classesData.length > 0) setSelectedClass(classesData[0]);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load assigned classes' });
    }
  };

  const loadClassSessions = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/ta/classes/${selectedClass.id}/sessions?taId=${taId}`);
      setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setSessions([]);
    }
  };

  const loadSessionAttendance = async () => {
    if (!selectedSession) return;
    try {
      const res = await api.get(`/ta/sessions/${selectedSession.id}/attendance?taId=${taId}`);
      setAttendance(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const generateSessionReport = async (sessionId: string) => {
    try {
      const res = await api.get(`/ta/sessions/${sessionId}/report?taId=${taId}`);
      setSessionReport(res.data?.data || null);
      setReportDialogOpen(true);
    } catch {
      setMessage({ type: 'error', text: 'Failed to generate report' });
    }
  };

  const loadStudentHistory = async () => {
    if (!selectedStudentRollNumber) return;
    try {
      const res = await api.get(`/ta/students/history?studentRollNumber=${selectedStudentRollNumber}&taId=${taId}`);
      setStudentHistory(Array.isArray(res.data?.data) ? res.data.data : []);
      setMessage({ type: 'success', text: 'Student history loaded' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load student history' });
    }
  };

  const loadFlaggedAttendance = async () => {
    try {
      const res = await api.get(`/ta/attendance/flagged?taId=${taId}`);
      setFlaggedAttendance(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load flagged attendance:', error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const res = await api.get(`/ta/attendance/pending?taId=${taId}`);
      setPendingApprovals(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    }
  };

  const taVerifyAttendance = async (attendanceId: string, approved: boolean) => {
    try {
      const notes = approved ? 'TA approved' : 'TA rejected';
      await api.put(`/ta/attendance/${attendanceId}/verify?taId=${taId}&approved=${approved}&notes=${encodeURIComponent(notes)}`);
      setMessage({ type: 'success', text: approved ? 'Attendance approved' : 'Attendance rejected' });
      loadPendingApprovals();
      loadFlaggedAttendance();
      if (selectedSession) loadSessionAttendance();
    } catch {
      setMessage({ type: 'error', text: 'Failed to verify attendance' });
    }
  };

  const flagProxy = async (attendanceId: string, flagged: boolean, reason: string) => {
    try {
      await api.put(`/ta/attendance/${attendanceId}/flag?taId=${taId}&flagged=${flagged}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`);
      setMessage({ type: 'success', text: 'Proxy flag updated' });
      loadFlaggedAttendance();
      if (selectedSession) loadSessionAttendance();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update flag' });
    }
  };

  const openLiveMonitor = (session: any) => {
    setSelectedSession(session);
    setLiveMonitorDialogOpen(true);
  };

  const getSessionBadge = (session: any) => {
    if (session.status === 'EXPIRED' || !session.open) return <span className="badge badge-gray">Closed</span>;
    if (session.open && session.status === 'ACTIVE') return <span className="badge badge-green">Active</span>;
    return <span className="badge badge-blue">Scheduled</span>;
  };

  const renderVerifications = (att: any) => (
    <div className="chip-row" style={{ marginTop: 0 }}>
      {att.systemVerified && <span className="chip">System</span>}
      {att.professorVerified && <span className="chip">Prof</span>}
      {att.taVerified && <span className="chip">TA</span>}
      {att.flaggedProxy && <span className="badge badge-yellow">Flagged</span>}
    </div>
  );

  const tabs = [
    { label: 'My Classes & Sessions', icon: <BookOpen size={16} /> },
    { label: 'Student Analysis', icon: <TrendingUp size={16} /> },
    { label: `Pending Approvals (${pendingApprovals.length})`, icon: <ClipboardList size={16} /> },
    { label: `Flagged (${flaggedAttendance.length})`, icon: <Flag size={16} /> },
  ];

  return (
    <DashboardLayout
      title="Teaching Assistant Dashboard"
      subtitle={`Welcome back, ${user?.name || 'TA'}!`}
      icon={<ClipboardList size={28} />}
      profilePicture={userProfilePicture}
      message={message}
      onDismissMessage={() => setMessage(null)}
    >
      <div className="pa-card">
        <div className="pa-tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              type="button"
              className={`pa-tab ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="pa-content">
          {activeTab === 0 && (
            <div className="pa-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="panel-card">
                <div className="panel-card-header"><BookOpen size={18} /> Assigned Classes</div>
                <div className="panel-card-body">
                  {classes.length === 0 ? (
                    <div className="empty">
                      <strong>No classes assigned yet</strong>
                      <p style={{ marginTop: 8 }}>Wait for professor to assign you to classes</p>
                    </div>
                  ) : (
                    <div className="class-list">
                      {classes.map((cls) => (
                        <div
                          key={cls.id}
                          className={`class-card ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                          onClick={() => setSelectedClass(cls)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedClass(cls)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="class-card-content">
                            <div className="cc-code">{cls.code}</div>
                            <div className="cc-title">{cls.title}</div>
                            <div className="cc-title">{cls.location || 'Location not set'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-card-header">
                  {selectedClass ? `Sessions — ${selectedClass.code}` : 'Sessions'}
                </div>
                <div className="panel-card-body">
                  {!selectedClass ? (
                    <div className="empty"><strong>Select a class to view sessions</strong></div>
                  ) : sessions.length === 0 ? (
                    <div className="empty">
                      <strong>No sessions available</strong>
                      <p style={{ marginTop: 8 }}>Sessions will appear here when created by the professor</p>
                    </div>
                  ) : (
                    <div className="session-list">
                      {sessions.map((session) => (
                        <div key={session.id} className="session-card">
                          <div className="session-header">
                            <div>
                              <div className="session-title">Session #{session.id.substring(session.id.length - 8)}</div>
                              <div className="session-time">{new Date(session.startTime).toLocaleString()}</div>
                            </div>
                            {getSessionBadge(session)}
                          </div>
                          <div className="session-actions">
                            <button type="button" className="btn ghost" onClick={() => generateSessionReport(session.id)}>
                              <BarChart3 size={16} /> Report
                            </button>
                            {session.open && session.status === 'ACTIVE' && (
                              <button type="button" className="btn primary" onClick={() => openLiveMonitor(session)}>
                                <Eye size={16} /> Monitor
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="panel-card">
              <div className="panel-card-header"><TrendingUp size={18} /> Student Attendance Analysis</div>
              <div className="panel-card-body">
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, minWidth: 200 }}
                    value={selectedStudentRollNumber}
                    onChange={(e) => setSelectedStudentRollNumber(e.target.value)}
                    placeholder="e.g., 2023CS101"
                  />
                  <button type="button" className="btn primary" onClick={loadStudentHistory} disabled={!selectedStudentRollNumber}>
                    Load History
                  </button>
                </div>

                {studentHistory.length > 0 && (
                  <>
                    <div className="stats-grid stats-grid-4" style={{ marginBottom: 16 }}>
                      <div className="stat-card stat-blue">
                        <div className="stat-label">Total Records</div>
                        <div className="stat-value">{studentHistory.length}</div>
                      </div>
                      <div className="stat-card stat-blue">
                        <div className="stat-label">Verified</div>
                        <div className="stat-value">
                          {studentHistory.filter((h) => h.systemVerified && h.professorVerified).length}
                        </div>
                      </div>
                      <div className="stat-card stat-purple">
                        <div className="stat-label">Flagged</div>
                        <div className="stat-value">{studentHistory.filter((h) => h.flaggedProxy).length}</div>
                      </div>
                      <div className="stat-card stat-purple">
                        <div className="stat-label">Percentage</div>
                        <div className="stat-value">
                          {studentHistory.length > 0
                            ? `${Math.round((studentHistory.filter((h) => h.systemVerified && h.professorVerified).length / studentHistory.length) * 100)}%`
                            : '0%'}
                        </div>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Verifications</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentHistory.map((att) => (
                            <tr key={att.id}>
                              <td>{new Date(att.checkInTime).toLocaleDateString()}</td>
                              <td>{att.classId.substring(0, 8)}...</td>
                              <td>
                                <StatusBadge
                                  status={att.finalStatus}
                                  flaggedProxy={att.flaggedProxy}
                                  systemVerified={att.systemVerified}
                                  professorVerified={att.professorVerified}
                                  taVerified={att.taVerified}
                                />
                              </td>
                              <td>{renderVerifications(att)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="panel-card">
              <div className="panel-card-header">Pending TA Approvals ({pendingApprovals.length})</div>
              <div className="panel-card-body">
                {pendingApprovals.length === 0 ? (
                  <div className="empty">
                    <strong>No pending approvals</strong>
                    <p style={{ marginTop: 8 }}>All attendance records have been processed</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Session</th>
                          <th>Class</th>
                          <th>Verifications</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApprovals.map((att) => (
                          <tr key={att.id}>
                            <td>{att.studentName} ({att.studentRollNumber || 'N/A'})</td>
                            <td>{att.sessionId.substring(0, 8)}...</td>
                            <td>{att.classId.substring(0, 8)}...</td>
                            <td>
                              <div className="chip-row" style={{ marginTop: 0 }}>
                                {att.verificationLayersPassed?.map((layer: string) => (
                                  <span key={layer} className="chip">{layer}</span>
                                ))}
                              </div>
                            </td>
                            <td>{new Date(att.checkInTime).toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" className="btn icon success" onClick={() => taVerifyAttendance(att.id, true)} title="Approve">
                                  <CheckCircle size={16} />
                                </button>
                                <button type="button" className="btn icon danger" onClick={() => taVerifyAttendance(att.id, false)} title="Reject">
                                  <XCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="panel-card">
              <div className="panel-card-header"><Flag size={18} /> Flagged Attendance ({flaggedAttendance.length})</div>
              <div className="panel-card-body">
                {flaggedAttendance.length === 0 ? (
                  <div className="empty">
                    <strong>No flagged records</strong>
                    <p style={{ marginTop: 8 }}>All attendance records are clean</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Session</th>
                          <th>Class</th>
                          <th>Reason</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flaggedAttendance.map((att) => (
                          <tr key={att.id}>
                            <td>{att.studentName} ({att.studentRollNumber || 'N/A'})</td>
                            <td>{att.sessionId.substring(0, 8)}...</td>
                            <td>{att.classId.substring(0, 8)}...</td>
                            <td>{att.proxyReason || 'Flagged as proxy'}</td>
                            <td>{new Date(att.checkInTime).toLocaleString()}</td>
                            <td>
                              <button type="button" className="btn ghost" onClick={() => flagProxy(att.id, false, '')}>
                                Clear Flag
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {reportDialogOpen && (
        <div className="modal-overlay" onClick={() => setReportDialogOpen(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Session Attendance Report
              <button type="button" className="icon-btn" onClick={() => setReportDialogOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {sessionReport && (
                <>
                  <div className="stats-grid stats-grid-4" style={{ marginBottom: 16 }}>
                    <div className="stat-card stat-blue">
                      <div className="stat-label">Total</div>
                      <div className="stat-value">{sessionReport.totalAttendance}</div>
                    </div>
                    <div className="stat-card stat-blue">
                      <div className="stat-label">Approved</div>
                      <div className="stat-value">{sessionReport.fullyApproved}</div>
                    </div>
                    <div className="stat-card stat-purple">
                      <div className="stat-label">Pending</div>
                      <div className="stat-value">{sessionReport.pending}</div>
                    </div>
                    <div className="stat-card stat-purple">
                      <div className="stat-label">Flagged</div>
                      <div className="stat-value">{sessionReport.flagged}</div>
                    </div>
                  </div>
                  <div className="info-box" style={{ marginBottom: 16 }}>
                    <strong>Verification Rate:</strong> {sessionReport.verificationRate?.toFixed(1)}%
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <tbody>
                        <tr><td>System Verified</td><td><span className="badge badge-blue">{sessionReport.systemVerified}</span></td></tr>
                        <tr><td>Professor Verified</td><td><span className="badge badge-blue">{sessionReport.professorVerified}</span></td></tr>
                        <tr><td>TA Verified</td><td><span className="badge badge-green">{sessionReport.taVerified}</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setReportDialogOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {liveMonitorDialogOpen && (
        <div className="modal-overlay" onClick={() => setLiveMonitorDialogOpen(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Live Attendance Monitor
              <button type="button" className="icon-btn" onClick={loadSessionAttendance} title="Refresh"><RefreshCw size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => setLiveMonitorDialogOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="info-box" style={{ marginBottom: 16 }}>
                <strong>Total:</strong> {attendance.length} |{' '}
                <strong>Verified:</strong> {attendance.filter((a) => a.systemVerified && a.professorVerified).length} |{' '}
                <strong>Pending:</strong> {attendance.filter((a) => a.systemVerified && !a.professorVerified).length}
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Verifications</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((att) => (
                      <tr key={att.id}>
                        <td>{att.studentName} ({att.studentRollNumber || 'N/A'})</td>
                        <td>
                          <StatusBadge
                            status={att.finalStatus}
                            flaggedProxy={att.flaggedProxy}
                            systemVerified={att.systemVerified}
                            professorVerified={att.professorVerified}
                            taVerified={att.taVerified}
                          />
                        </td>
                        <td>{renderVerifications(att)}</td>
                        <td>{new Date(att.checkInTime).toLocaleTimeString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!att.flaggedProxy && (
                              <button
                                type="button"
                                className="btn icon subtle"
                                onClick={() => flagProxy(att.id, true, 'Flagged by TA during monitoring')}
                                title="Flag as proxy"
                              >
                                <Flag size={16} />
                              </button>
                            )}
                            {att.professorVerified && !att.taVerified && (
                              <>
                                <button type="button" className="btn icon success" onClick={() => taVerifyAttendance(att.id, true)}>
                                  <CheckCircle size={16} />
                                </button>
                                <button type="button" className="btn icon danger" onClick={() => taVerifyAttendance(att.id, false)}>
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setLiveMonitorDialogOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TADashboard;
