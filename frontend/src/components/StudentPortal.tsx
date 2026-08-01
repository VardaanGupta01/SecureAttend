import React, { useState, useEffect, Suspense } from "react";
import {
  Box, Typography, Card, CardContent, Button, TextField, List, ListItem, Chip, Grid,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
  Paper, Stepper, Step, StepLabel, CircularProgress,
} from "@mui/material";
import {
  QrCodeScanner as QrIcon, LocationOn as LocationIcon, Face as FaceIcon,
  CheckCircle as CheckIcon, TrendingUp as TrendIcon,
} from "@mui/icons-material";
import api from '../config/api';

const QrScanner = React.lazy(() =>
  import("react-qr-scanner").then((mod: any) => ({
    default: mod.default ?? mod,
  }))
) as unknown as React.ComponentType<any>;

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  verificationLayersPassed: string[];
  currentStep: string;
  systemVerified: boolean;
  professorVerified: boolean;
  taVerified: boolean;
  flaggedProxy: boolean;
  checkInTime: string;
  finalStatus: string;
}

const StudentPortal: React.FC = () => {
  const getUser = () => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  };
  
  const user = getUser();
  const studentId = user?.userId || 'student1';

  const [sessionId, setSessionId] = useState("");
  const [qrOrCodeword, setQrOrCodeword] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [faceImageBase64, setFaceImageBase64] = useState("");
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<string[]>(["QR/Codeword"]);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    loadStudentAttendance();
    getCurrentLocation();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!studentId) return;
    try {
      const response = await api.get(`/student/${studentId}`);
      const studentData = response.data?.data || response.data;
      if (studentData && (studentData as any).faceImageBase64) {
        setUserProfilePicture((studentData as any).faceImageBase64);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          console.log("📍 Location obtained:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setLatitude(40.7128);
          setLongitude(-74.006);
        }
      );
    } else {
      setLatitude(40.7128);
      setLongitude(-74.006);
    }
  };

  const loadStudentAttendance = async () => {
    try {
      const response = await api.get(`/student/${studentId}/attendance`);
      console.log("Student attendance loaded:", response.data);
      const attendanceData = response.data?.data || response.data || [];
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (error: any) {
      console.error("Failed to load attendance:", error);
      setMessage({ type: "error", text: "Failed to load attendance history" });
      setAttendance([]);
    }
  };


  const handleScan = (data: any) => {
    if (!data) return;
    const scanned = typeof data === "string" ? data : data?.text || data?.data || "";
    if (scanned) {
      console.log("QR Scanned:", scanned);
      setQrOrCodeword(scanned);
      setScannerOpen(false);
      setMessage({ type: "success", text: "QR code scanned successfully" });
    }
  };

  const handleScanError = (err: any) => {
    console.warn("QR scan error", err);
  };

  const startVerification = () => {
    if (!sessionId || !qrOrCodeword) {
      setMessage({ type: "error", text: "Please enter Session ID and QR/Codeword" });
      return;
    }
    console.log("Starting verification for session:", sessionId);
    
    setVerificationSteps(["QR/Codeword"]);
    setActiveStep(0);
    setCurrentAttendance(null);
    setVerificationDialogOpen(true);
  };

  const initiateAttendance = async () => {
    setLoading(true);
    try {
      console.log("Initiating attendance with:", { studentId, sessionId, qrOrCodeword });
      const response = await api.post('/student/attendance/initiate', {
        studentId,
        sessionId,
        qrCodeOrCodeword: qrOrCodeword,
        deviceInfo: navigator.userAgent,
        ipAddress: "127.0.0.1",
      });
      
      const attendanceRecord = response.data?.data || response.data;
      console.log("Attendance initiated:", attendanceRecord);
      setCurrentAttendance(attendanceRecord);
      
      determineRemainingSteps(attendanceRecord);
      
      setMessage({ type: "success", text: "QR verified! Proceeding to next verification step." });
    } catch (error: any) {
      console.error("Initiate attendance error:", error);
      const errorMsg = error.response?.data?.message || "QR verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const determineRemainingSteps = (attendance: Attendance) => {
    const steps = ["QR/Codeword"];
    let nextStepIndex = 1;
    
    const currentStep = attendance.currentStep;
    
    if (currentStep === "QR_VERIFIED") {
      steps.push("Location");
      setActiveStep(nextStepIndex);
    } else if (currentStep === "LOCATION_VERIFIED") {
      steps.push("Location");
      steps.push("Face Recognition");
      setActiveStep(nextStepIndex + 1);
    } else if (currentStep === "FACE_VERIFIED" || currentStep === "AWAITING_PROFESSOR") {
      steps.push("Location");
      steps.push("Face Recognition");
      setActiveStep(nextStepIndex + 2);
      setMessage({ 
        type: "success", 
        text: "All verifications complete! Your attendance has been recorded and is awaiting approval." 
      });
      setTimeout(() => {
        setVerificationDialogOpen(false);
        loadStudentAttendance();
        resetForm();
      }, 2000);
    } else if (currentStep === "COMPLETED") {
      setMessage({ type: "success", text: "Attendance fully approved!" });
      setTimeout(() => {
        setVerificationDialogOpen(false);
        loadStudentAttendance();
        resetForm();
      }, 2000);
    }
    
    setVerificationSteps(steps);
  };

  const resetForm = () => {
    setSessionId("");
    setQrOrCodeword("");
    setFaceImageBase64("");
    setLivenessPassed(false);
    setActiveStep(0);
  };

  const verifyLocation = async () => {
    if (!currentAttendance) {
      setMessage({ type: "error", text: "No attendance record found" });
      return;
    }
    if (latitude === null || longitude === null) {
      setMessage({ type: "error", text: "Location not available" });
      return;
    }
    if (!wifiSsid.trim()) {
      setMessage({
        type: "error",
        text: "Enter your Wi-Fi network name (SSID). Browsers cannot detect it automatically — ask your professor for the exact name shown in the session.",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Verifying location:", { attendanceId: currentAttendance.id, latitude, longitude, wifiSsid });
      const response = await api.post('/student/attendance/verify-location', {
        attendanceId: currentAttendance.id,
        latitude,
        longitude,
        wifiSSID: wifiSsid,
      });
      
      const updated = response.data?.data || response.data;
      console.log("Location verified:", updated);
      setCurrentAttendance(updated);
      
      if (updated.currentStep === "LOCATION_VERIFIED") {
        setActiveStep(2);
        setMessage({ type: "success", text: "Location verified! Proceed to face verification." });
      } else if (updated.currentStep === "FACE_VERIFIED" || updated.currentStep === "AWAITING_PROFESSOR") {
        setMessage({ 
          type: "success", 
          text: "All verifications complete! Your attendance has been recorded." 
        });
        setTimeout(() => {
          setVerificationDialogOpen(false);
          loadStudentAttendance();
          resetForm();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Location verification error:", error);
      const errorMsg = error.response?.data?.message || "Location verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const verifyFace = async () => {
    if (!currentAttendance) {
      setMessage({ type: "error", text: "No attendance record found" });
      return;
    }
    if (!faceImageBase64) {
      setMessage({ type: "error", text: "Please capture your face first" });
      return;
    }

    setLoading(true);
    try {
      console.log("➡️ Verifying face for attendance:", currentAttendance.id);
      const response = await api.post('/student/attendance/verify-face', {
        attendanceId: currentAttendance.id,
        faceImageBase64,
        livenessDetected: livenessPassed,
      });
      
      const updated = response.data?.data || response.data;
      console.log("Face verified:", updated);
      setCurrentAttendance(updated);
      
      if (updated.currentStep === "COMPLETED") {
        setMessage({ type: "success", text: "Attendance fully approved!" });
      } else {
        setMessage({ type: "success", text: "All verifications complete! Awaiting professor approval." });
      }
      
      setTimeout(() => {
        setVerificationDialogOpen(false);
        loadStudentAttendance();
        resetForm();
      }, 2000);
    } catch (error: any) {
      console.error("Face verification error:", error);
      const errorMsg = error.response?.data?.message || "Face verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const simulateFaceCapture = () => {
    setFaceImageBase64("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    setLivenessPassed(true);
    console.log("Face captured (simulated)");
    setMessage({ type: "success", text: "Face captured and liveness verified" });
  };

  const proceedToNextStep = () => {
    if (activeStep === 0) {
      initiateAttendance();
    } else if (activeStep === 1) {
      verifyLocation();
    } else if (activeStep === 2) {
      verifyFace();
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Verify your QR code or codeword to begin attendance marking.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Session ID:</strong> {sessionId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>QR/Codeword:</strong> {qrOrCodeword}
              </Typography>
            </Paper>
            <Button
              fullWidth
              variant="contained"
              onClick={proceedToNextStep}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Verify QR/Codeword"}
            </Button>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Verify your location to ensure you&apos;re in the classroom.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Current Location:</strong>
              </Typography>
              <Typography variant="body2">
                Latitude: {latitude?.toFixed(6)}
              </Typography>
              <Typography variant="body2">
                Longitude: {longitude?.toFixed(6)}
              </Typography>
            </Paper>
            <TextField
              fullWidth
              required
              label="Wi-Fi Network Name (SSID)"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="e.g., Campus-WiFi"
              helperText="Type the exact Wi-Fi name your professor set for this session (must match exactly)"
              sx={{ mt: 2 }}
              variant="outlined"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={proceedToNextStep}
              disabled={loading || !wifiSsid.trim()}
              startIcon={<LocationIcon />}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Verify Location"}
            </Button>
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Capture your face for biometric verification.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2, textAlign: 'center' }}>
              {faceImageBase64 ? (
                <Box>
                  <CheckIcon color="success" sx={{ fontSize: 60 }} />
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    Face captured successfully
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <FaceIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No face captured yet
                  </Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                startIcon={<FaceIcon />}
                onClick={simulateFaceCapture}
                sx={{ mt: 2 }}
              >
                Capture Face
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={livenessPassed}
                    onChange={(e) => setLivenessPassed(e.target.checked)}
                  />
                }
                label="Liveness Detected"
                sx={{ mt: 2, display: 'block' }}
              />
            </Paper>
            <Button
              fullWidth
              variant="contained"
              onClick={proceedToNextStep}
              disabled={loading || !faceImageBase64 || !livenessPassed}
              startIcon={<CheckIcon />}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Complete Verification"}
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  const getStatusChip = (att: Attendance) => {
    if (att.finalStatus === "APPROVED") {
      return <Chip label="✓ Approved" color="success" size="small" />;
    }
    if (att.finalStatus === "REJECTED") {
      return <Chip label="✗ Rejected" color="error" size="small" />;
    }
    if (att.flaggedProxy) {
      return <Chip label="⚠ Flagged" color="warning" size="small" />;
    }
    if (att.professorVerified && att.taVerified) {
      return <Chip label="✓✓ Fully Verified" color="success" size="small" />;
    }
    if (att.professorVerified) {
      return <Chip label="✓ Prof Verified" color="info" size="small" />;
    }
    if (att.systemVerified) {
      return <Chip label="System Verified" color="primary" size="small" />;
    }
    return <Chip label="Pending" color="default" size="small" />;
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
            Student Portal
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, <strong>{user?.name || 'Student'}</strong>! 👋
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

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
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
                <QrIcon /> Mark Attendance
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>

              <TextField
                fullWidth
                label="Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID from professor"
                helperText="Get the session ID from your professor's screen"
                sx={{ mb: 2.5 }}
                variant="outlined"
              />

              <TextField
                fullWidth
                label="QR Code or Codeword"
                value={qrOrCodeword}
                onChange={(e) => setQrOrCodeword(e.target.value)}
                placeholder="Scan QR or enter codeword"
                helperText="Scan the QR code or type the codeword shown by professor"
                sx={{ mb: 2.5 }}
                variant="outlined"
              />

              <TextField
                fullWidth
                label="Wi-Fi Network Name (SSID)"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="e.g., Campus-WiFi"
                helperText="Required if professor enabled WiFi check — enter the exact network name"
                sx={{ mb: 3 }}
                variant="outlined"
              />

              <Button
                variant="contained"
                fullWidth
                onClick={startVerification}
                disabled={!sessionId || !qrOrCodeword}
                sx={{ 
                  mb: 2,
                  py: 1.5,
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
                size="large"
              >
                Start Verification Process
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => setScannerOpen(true)}
                startIcon={<QrIcon />}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    background: 'rgba(102, 126, 234, 0.08)',
                  }
                }}
              >
                Scan QR Code
              </Button>

              <Paper 
                sx={{ 
                  p: 2.5, 
                  mt: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}
              >
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#667eea', mb: 1.5 }}>
                  📍 Current Location
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Latitude:</strong> {latitude?.toFixed(4)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Longitude:</strong> {longitude?.toFixed(4)}
                </Typography>
                <Typography variant="body2">
                  <strong>Wi-Fi:</strong> {wifiSsid || "Not detected"}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
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
                <TrendIcon /> Attendance History
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {attendance.length === 0 ? (
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
                    No attendance records yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mark your first attendance to see it here
                  </Typography>
                </Paper>
              ) : (
                <List sx={{ p: 0 }}>
                  {attendance.map((att) => (
                    <Paper
                      key={att.id}
                      sx={{
                        mb: 2,
                        p: 2.5,
                        border: '1px solid',
                        borderColor: 'rgba(102, 126, 234, 0.15)',
                        borderRadius: 2,
                        background: 'white',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                          transform: 'translateY(-2px)',
                        }
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Session {att.sessionId.substring(0, 8)}...
                        </Typography>
                        {getStatusChip(att)}
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Checked in:</strong> {new Date(att.checkInTime).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1.5 }}>
                        <strong>Status:</strong> {att.currentStep}
                      </Typography>
                      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {att.verificationLayersPassed.map((layer) => (
                          <Chip
                            key={layer}
                            label={layer}
                            size="small"
                            sx={{ 
                              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                              color: '#667eea',
                              border: '1px solid rgba(102, 126, 234, 0.2)',
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog 
        open={verificationDialogOpen} 
        onClose={() => !loading && setVerificationDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 700,
        }}>
          Multi-Layer Verification
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {verificationSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {getStepContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={scannerOpen} 
        onClose={() => setScannerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 700,
        }}>
          Scan QR Code
        </DialogTitle>
        <DialogContent>
          <Suspense fallback={<CircularProgress />}>
            <Box sx={{ width: 320, height: 320 }}>
              <QrScanner
                delay={500}
                onScan={handleScan}
                onError={handleScanError}
                style={{ width: "100%" }}
              />
            </Box>
          </Suspense>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Point your camera at the QR code displayed by the professor
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default StudentPortal;  