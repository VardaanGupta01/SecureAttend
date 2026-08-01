import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, List, Grid, Alert, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Tabs, Tab, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField,
} from '@mui/material';
import {
  Assessment as ReportIcon, CheckCircle as CheckIcon, Cancel as CancelIcon,
  TrendingUp as TrendIcon, Flag as FlagIcon, Class as ClassIcon, Visibility,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../config/api';

const getUser = () => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

const TADashboard = () => {
  const user = getUser();
  const taId = user?.userId;

  const [activeTab, setActiveTab] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [flaggedAttendance, setFlaggedAttendance] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedStudentRollNumber, setSelectedStudentRollNumber] = useState('');
  const [message, setMessage] = useState(null);
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
      if (taData && taData.profilePictureBase64) {
        setUserProfilePicture(taData.profilePictureBase64);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadClassSessions();
    }
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
      if (classesData.length > 0) {
        setSelectedClass(classesData[0]);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      setMessage({ type: 'error', text: 'Failed to load assigned classes' });
    }
  };

  const loadClassSessions = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/ta/classes/${selectedClass.id}/sessions?taId=${taId}`);
      const sessionsData = res.data?.data || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    }
  };

  const loadSessionAttendance = async () => {
    if (!selectedSession) return;
    try {
      const res = await api.get(`/ta/sessions/${selectedSession.id}/attendance?taId=${taId}`);
      const attendanceData = res.data?.data || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const generateSessionReport = async (sessionId) => {
    try {
      const res = await api.get(`/ta/sessions/${sessionId}/report?taId=${taId}`);
      setSessionReport(res.data?.data || null);
      setReportDialogOpen(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate report' });
    }
  };

  const loadStudentHistory = async () => {
    if (!selectedStudentRollNumber) return;
    try {
      const res = await api.get(`/ta/students/history?studentRollNumber=${selectedStudentRollNumber}&taId=${taId}`);
      const historyData = res.data?.data || [];
      setStudentHistory(Array.isArray(historyData) ? historyData : []);
      setMessage({ type: 'success', text: 'Student history loaded' });
    } catch (error) {
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

  const taVerifyAttendance = async (attendanceId, approved) => {
    try {
      const notes = approved ? 'TA approved' : 'TA rejected';
      await api.put(`/ta/attendance/${attendanceId}/verify?taId=${taId}&approved=${approved}&notes=${encodeURIComponent(notes)}`);
      
      setMessage({ 
        type: 'success', 
        text: approved ? 'Attendance approved' : 'Attendance rejected'
      });

      loadPendingApprovals();
      loadFlaggedAttendance();
      if (selectedSession) loadSessionAttendance();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify attendance' });
    }
  };

  const flagProxy = async (attendanceId, flagged, reason) => {
    try {
      await api.put(`/ta/attendance/${attendanceId}/flag?taId=${taId}&flagged=${flagged}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`);
      setMessage({ type: 'success', text: 'Proxy flag updated' });
      loadFlaggedAttendance();
      if (selectedSession) loadSessionAttendance();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update flag' });
    }
  };

  const openLiveMonitor = (session) => {
    setSelectedSession(session);
    setLiveMonitorDialogOpen(true);
  };

  const getStatusChip = (att) => {
    if (att.finalStatus === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
    if (att.finalStatus === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
    if (att.flaggedProxy) return <Chip label="Flagged" color="warning" size="small" />;
    if (att.taVerified) return <Chip label="TA Verified" color="success" size="small" />;
    if (att.professorVerified) return <Chip label="Prof Verified" color="info" size="small" />;
    if (att.systemVerified) return <Chip label="System Verified" color="primary" size="small" />;
    return <Chip label="Pending" color="default" size="small" />;
  };

  const getSessionStatus = (session) => {
    if (session.status === 'EXPIRED' || !session.open) return { label: 'CLOSED', color: 'default' };
    if (session.open && session.status === 'ACTIVE') return { label: 'ACTIVE', color: 'success' };
    return { label: 'SCHEDULED', color: 'info' };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Teaching Assistant Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, <strong>{user?.name || 'TA'}</strong>! 👋
          </Typography>
        </Box>
        {userProfilePicture && (
          <Box
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid rgba(102, 126, 234, 0.2)',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img 
              src={userProfilePicture} 
              alt="Profile" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </Box>
        )}
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)} 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {message.text}
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)} 
        sx={{ 
          mb: 3,
          '& .MuiTab-root': {
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.95rem',
          },
          '& .Mui-selected': {
            color: '#667eea',
          },
          '& .MuiTabs-indicator': {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            height: 3,
            borderRadius: '3px 3px 0 0',
          }
        }}
      >
        <Tab label="My Classes & Sessions" />
        <Tab label="Student Analysis" />
        <Tab label={`Pending Approvals (${pendingApprovals.length})`} />
        <Tab label={`Flagged (${flaggedAttendance.length})`} />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card 
              elevation={0}
              sx={{
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 2,
                color: 'white',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ClassIcon /> Assigned Classes
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>

                {classes.length === 0 ? (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      borderRadius: 2,
                      border: '1px dashed rgba(102, 126, 234, 0.2)',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                      No classes assigned yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Wait for professor to assign you to classes
                    </Typography>
                  </Paper>
                ) : (
                  <List sx={{ p: 0 }}>
                    {classes.map((cls) => (
                      <Paper
                        key={cls.id}
                        sx={{
                          mb: 2,
                          p: 2.5,
                          cursor: 'pointer',
                          border: selectedClass?.id === cls.id ? '2px solid' : '1px solid',
                          borderColor: selectedClass?.id === cls.id ? '#667eea' : 'rgba(102, 126, 234, 0.15)',
                          borderRadius: 2,
                          background: selectedClass?.id === cls.id 
                            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                            : 'white',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                            transform: 'translateY(-2px)',
                          }
                        }}
                        onClick={() => setSelectedClass(cls)}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#667eea', mb: 0.5 }}>
                          {cls.code}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          {cls.title}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          📍 {cls.location || 'Location not set'}
                        </Typography>
                      </Paper>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card 
              elevation={0}
              sx={{
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 2,
                color: 'white',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedClass ? `Sessions - ${selectedClass.code}` : 'Sessions'}
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>

                {!selectedClass ? (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      borderRadius: 2,
                      border: '1px dashed rgba(102, 126, 234, 0.2)',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                      Select a class to view sessions
                    </Typography>
                  </Paper>
                ) : sessions.length === 0 ? (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      borderRadius: 2,
                      border: '1px dashed rgba(102, 126, 234, 0.2)',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                      No sessions available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sessions will appear here when created by the professor
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sessions.map((session) => {
                      const status = getSessionStatus(session);
                      return (
                        <Paper
                          key={session.id}
                          sx={{
                            p: 2.5,
                            border: '1px solid rgba(102, 126, 234, 0.15)',
                            borderRadius: 2,
                            background: 'white',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                              transform: 'translateY(-2px)',
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Session #{session.id.substring(session.id.length - 8)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(session.startTime).toLocaleString()}
                              </Typography>
                            </Box>
                            <Chip 
                              label={status.label} 
                              size="small"
                              sx={{
                                background: status.color === 'success' 
                                  ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%)'
                                  : status.color === 'default'
                                  ? 'rgba(158, 158, 158, 0.1)'
                                  : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                                color: status.color === 'success' ? '#4caf50' : status.color === 'default' ? '#9e9e9e' : '#667eea',
                                border: `1px solid ${status.color === 'success' ? 'rgba(76, 175, 80, 0.2)' : status.color === 'default' ? 'rgba(158, 158, 158, 0.2)' : 'rgba(102, 126, 234, 0.2)'}`,
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ReportIcon />}
                              onClick={() => generateSessionReport(session.id)}
                              sx={{
                                borderColor: '#667eea',
                                color: '#667eea',
                                '&:hover': {
                                  borderColor: '#5568d3',
                                  background: 'rgba(102, 126, 234, 0.08)',
                                }
                              }}
                            >
                              Report
                            </Button>
                            {status.label === 'ACTIVE' && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Visibility />}
                                onClick={() => openLiveMonitor(session)}
                                sx={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                                  }
                                }}
                              >
                                Monitor
                              </Button>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card 
          elevation={0}
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 2,
            color: 'white',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendIcon /> Student Attendance Analysis
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                label="Student Roll Number"
                value={selectedStudentRollNumber}
                onChange={(e) => setSelectedStudentRollNumber(e.target.value)}
                placeholder="e.g., 2023CS101"
                sx={{ flexGrow: 1 }}
                variant="outlined"
              />
              <Button
                variant="contained"
                onClick={loadStudentHistory}
                disabled={!selectedStudentRollNumber}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    opacity: 0.6,
                  }
                }}
              >
                Load History
              </Button>
            </Box>

            {studentHistory.length > 0 && (
              <Box>
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Total Records</Typography>
                      <Typography variant="h5">{studentHistory.length}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Verified</Typography>
                      <Typography variant="h5" color="success.main">
                        {studentHistory.filter(h => h.systemVerified && h.professorVerified).length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Flagged</Typography>
                      <Typography variant="h5" color="error.main">
                        {studentHistory.filter(h => h.flaggedProxy).length}
                      </Typography>
                    </Grid>
                      <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Percentage</Typography>
                      <Typography variant="h5">
                        {studentHistory.length > 0
                          ? `${Math.round(
                              (studentHistory.filter(h => h.systemVerified && h.professorVerified).length /
                                studentHistory.length) * 100
                            )} %`
                          : "0 %"}
                      </Typography>

                    </Grid>
                  </Grid>
                </Paper>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Verifications</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentHistory.map((att) => (
                        <TableRow key={att.id}>
                          <TableCell>{new Date(att.checkInTime).toLocaleDateString()}</TableCell>
                          <TableCell>{att.classId.substring(0, 8)}...</TableCell>
                          <TableCell>{getStatusChip(att)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {att.systemVerified && <Chip label="System" size="small" color="primary" />}
                              {att.professorVerified && <Chip label="Prof" size="small" color="info" />}
                              {att.taVerified && <Chip label="TA" size="small" color="success" />}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card 
          elevation={0}
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 2,
            color: 'white',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Pending TA Approvals ({pendingApprovals.length})
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>

            {pendingApprovals.length === 0 ? (
              <Paper 
                sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  borderRadius: 2,
                  border: '1px dashed rgba(102, 126, 234, 0.2)',
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                  No pending approvals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All attendance records have been processed
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Session</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Verifications</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApprovals.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>{att.studentName} ({att.studentRollNumber || 'N/A'})</TableCell>
                        <TableCell>{att.sessionId.substring(0, 8)}...</TableCell>
                        <TableCell>{att.classId.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {att.verificationLayersPassed.map((layer) => (
                              <Chip key={layer} label={layer} size="small" color="primary" variant="outlined" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>{new Date(att.checkInTime).toLocaleString()}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => taVerifyAttendance(att.id, true)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => taVerifyAttendance(att.id, false)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card 
          elevation={0}
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 2,
            color: 'white',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlagIcon /> Flagged Attendance Records ({flaggedAttendance.length})
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>

            {flaggedAttendance.length === 0 ? (
              <Paper 
                sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  borderRadius: 2,
                  border: '1px dashed rgba(102, 126, 234, 0.2)',
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', mb: 1 }}>
                  No flagged records
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All attendance records are clean
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Session</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flaggedAttendance.map((att) => (
                      <TableRow key={att.id} sx={{ bgcolor: 'error.50' }}>
                        <TableCell>{att.studentName} ({att.studentRollNumber || 'N/A'})</TableCell>
                        <TableCell>{att.sessionId.substring(0, 8)}...</TableCell>
                        <TableCell>{att.classId.substring(0, 8)}...</TableCell>
                        <TableCell>{att.proxyReason || 'Flagged as proxy'}</TableCell>
                        <TableCell>{new Date(att.checkInTime).toLocaleString()}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => flagProxy(att.id, false, '')}
                          >
                            Clear Flag
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Session Attendance Report</DialogTitle>
        <DialogContent>
          {sessionReport && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                    <Typography variant="h4">{sessionReport.totalAttendance}</Typography>
                    <Typography variant="caption">Total</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                    <Typography variant="h4">{sessionReport.fullyApproved}</Typography>
                    <Typography variant="caption">Approved</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                    <Typography variant="h4">{sessionReport.pending}</Typography>
                    <Typography variant="caption">Pending</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                    <Typography variant="h4">{sessionReport.flagged}</Typography>
                    <Typography variant="caption">Flagged</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
                <Typography variant="h6">Verification Rate: {sessionReport.verificationRate.toFixed(1)}%</Typography>
              </Paper>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>System Verified</TableCell>
                      <TableCell align="right">
                        <Chip label={sessionReport.systemVerified} color="primary" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Professor Verified</TableCell>
                      <TableCell align="right">
                        <Chip label={sessionReport.professorVerified} color="info" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TA Verified</TableCell>
                      <TableCell align="right">
                        <Chip label={sessionReport.taVerified} color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={liveMonitorDialogOpen} onClose={() => setLiveMonitorDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Live Attendance Monitor</Typography>
            <IconButton onClick={() => loadSessionAttendance()}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
            <Typography variant="body2">
              <strong>Total Attendance:</strong> {attendance.length} | 
              <strong> Verified:</strong> {attendance.filter(a => a.systemVerified && a.professorVerified).length} | 
              <strong> Pending:</strong> {attendance.filter(a => a.systemVerified && !a.professorVerified).length}
            </Typography>
          </Paper>

          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Verifications</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell>{att.studentName} ({att.studentRollNumber || 'N/A'})</TableCell>
                    <TableCell>{getStatusChip(att)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {att.systemVerified && <Chip label="System" size="small" color="primary" />}
                        {att.professorVerified && <Chip label="Prof" size="small" color="info" />}
                        {att.taVerified && <Chip label="TA" size="small" color="success" />}
                        {att.flaggedProxy && <Chip label="Flagged" size="small" color="error" />}
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(att.checkInTime).toLocaleTimeString()}</TableCell>
                    <TableCell align="center">
                      {!att.flaggedProxy && (
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => flagProxy(att.id, true, 'Flagged by TA during monitoring')}
                          title="Flag as proxy"
                        >
                          <FlagIcon />
                        </IconButton>
                      )}
                      {att.professorVerified && !att.taVerified && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => taVerifyAttendance(att.id, true)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => taVerifyAttendance(att.id, false)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiveMonitorDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TADashboard;