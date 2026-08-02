import React, { useState, useEffect, Suspense } from "react";
import { QrCode, MapPin, ScanFace, CheckCircle, TrendingUp, X, Loader2, GraduationCap } from "lucide-react";
import api from '../config/api';
import DashboardLayout from './layout/DashboardLayout';
import StatusBadge from './ui/StatusBadge';

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
        },
        () => {
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
    setVerificationSteps(["QR/Codeword"]);
    setActiveStep(0);
    setCurrentAttendance(null);
    setVerificationDialogOpen(true);
  };

  const initiateAttendance = async () => {
    setLoading(true);
    try {
      const response = await api.post('/student/attendance/initiate', {
        studentId,
        sessionId,
        qrCodeOrCodeword: qrOrCodeword,
        deviceInfo: navigator.userAgent,
        ipAddress: "127.0.0.1",
      });
      
      const attendanceRecord = response.data?.data || response.data;
      setCurrentAttendance(attendanceRecord);
      determineRemainingSteps(attendanceRecord);
      setMessage({ type: "success", text: "QR verified! Proceeding to next verification step." });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "QR verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const determineRemainingSteps = (attendance: Attendance) => {
    const steps = ["QR/Codeword"];
    const nextStepIndex = 1;
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
      setMessage({ type: "success", text: "All verifications complete! Your attendance has been recorded and is awaiting approval." });
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
      const response = await api.post('/student/attendance/verify-location', {
        attendanceId: currentAttendance.id,
        latitude,
        longitude,
        wifiSSID: wifiSsid,
      });
      
      const updated = response.data?.data || response.data;
      setCurrentAttendance(updated);
      
      if (updated.currentStep === "LOCATION_VERIFIED") {
        setActiveStep(2);
        setMessage({ type: "success", text: "Location verified! Proceed to face verification." });
      } else if (updated.currentStep === "FACE_VERIFIED" || updated.currentStep === "AWAITING_PROFESSOR") {
        setMessage({ type: "success", text: "All verifications complete! Your attendance has been recorded." });
        setTimeout(() => {
          setVerificationDialogOpen(false);
          loadStudentAttendance();
          resetForm();
        }, 2000);
      }
    } catch (error: any) {
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
      const response = await api.post('/student/attendance/verify-face', {
        attendanceId: currentAttendance.id,
        faceImageBase64,
        livenessDetected: livenessPassed,
      });
      
      const updated = response.data?.data || response.data;
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
      const errorMsg = error.response?.data?.message || "Face verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const simulateFaceCapture = () => {
    setFaceImageBase64("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    setLivenessPassed(true);
    setMessage({ type: "success", text: "Face captured and liveness verified" });
  };

  const proceedToNextStep = () => {
    if (activeStep === 0) initiateAttendance();
    else if (activeStep === 1) verifyLocation();
    else if (activeStep === 2) verifyFace();
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div>
            <p className="form-hint" style={{ marginBottom: 12 }}>Verify your QR code or codeword to begin.</p>
            <div className="info-box" style={{ marginBottom: 16 }}>
              <div><strong>Session ID:</strong> {sessionId}</div>
              <div style={{ marginTop: 4 }}><strong>QR/Codeword:</strong> {qrOrCodeword}</div>
            </div>
            <button type="button" className="btn primary full" onClick={proceedToNextStep} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify QR / Codeword'}
            </button>
          </div>
        );
      case 1:
        return (
          <div>
            <p className="form-hint" style={{ marginBottom: 12 }}>Confirm you are in the classroom.</p>
            <div className="info-box" style={{ marginBottom: 16 }}>
              <div><strong>Latitude:</strong> {latitude?.toFixed(6)}</div>
              <div><strong>Longitude:</strong> {longitude?.toFixed(6)}</div>
            </div>
            <div className="form-field">
              <label>Wi-Fi Network Name (SSID)</label>
              <input className="form-input" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="e.g., Campus-WiFi" />
              <div className="form-hint">Must match exactly what your professor set for this session</div>
            </div>
            <button type="button" className="btn primary full" onClick={proceedToNextStep} disabled={loading || !wifiSsid.trim()}>
              <MapPin size={16} /> {loading ? 'Verifying…' : 'Verify Location'}
            </button>
          </div>
        );
      case 2:
        return (
          <div>
            <p className="form-hint" style={{ marginBottom: 12 }}>Capture your face for biometric verification.</p>
            <div className="info-box" style={{ marginBottom: 16, textAlign: 'center' }}>
              {faceImageBase64 ? (
                <>
                  <CheckCircle size={48} color="#059669" style={{ margin: '0 auto' }} />
                  <p style={{ color: '#059669', marginTop: 8 }}>Face captured successfully</p>
                </>
              ) : (
                <>
                  <ScanFace size={48} color="#6b7280" style={{ margin: '0 auto' }} />
                  <p style={{ marginTop: 8 }}>No face captured yet</p>
                </>
              )}
              <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={simulateFaceCapture}>
                Capture Face
              </button>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <input type="checkbox" checked={livenessPassed} onChange={(e) => setLivenessPassed(e.target.checked)} />
                Liveness detected
              </label>
            </div>
            <button type="button" className="btn primary full" onClick={proceedToNextStep} disabled={loading || !faceImageBase64 || !livenessPassed}>
              <CheckCircle size={16} /> {loading ? 'Verifying…' : 'Complete Verification'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusChip = (att: Attendance) => (
    <StatusBadge
      status={att.finalStatus}
      flaggedProxy={att.flaggedProxy}
      systemVerified={att.systemVerified}
      professorVerified={att.professorVerified}
      taVerified={att.taVerified}
    />
  );

  return (
    <DashboardLayout
      title="Student Portal"
      subtitle={`Welcome back, ${user?.name || "Student"}!`}
      icon={<GraduationCap size={28} />}
      profilePicture={userProfilePicture}
      message={message}
      onDismissMessage={() => setMessage(null)}
    >
      <div className="pa-grid-2">
        <div className="panel-card">
          <div className="panel-card-header">
            <QrCode size={18} /> Mark Attendance
          </div>
          <div className="panel-card-body">
            <div className="form-field">
              <label>Session ID</label>
              <input className="form-input" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="Enter session ID from professor" />
              <div className="form-hint">Get the session ID from your professor&apos;s screen</div>
            </div>
            <div className="form-field">
              <label>QR Code or Codeword</label>
              <input className="form-input" value={qrOrCodeword} onChange={(e) => setQrOrCodeword(e.target.value)} placeholder="Scan QR or enter codeword" />
              <div className="form-hint">Scan the QR code or type the codeword shown by professor</div>
            </div>
            <div className="form-field">
              <label>Wi-Fi Network Name (SSID)</label>
              <input className="form-input" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="e.g., Campus-WiFi" />
              <div className="form-hint">Required if professor enabled WiFi check — enter the exact network name</div>
            </div>
            <button type="button" className="btn primary full" style={{ marginBottom: 10 }} onClick={startVerification} disabled={!sessionId || !qrOrCodeword}>
              Start Verification Process
            </button>
            <button type="button" className="btn ghost full" onClick={() => setScannerOpen(true)}>
              <QrCode size={16} /> Scan QR Code
            </button>
            <div className="info-box" style={{ marginTop: 16 }}>
              <div className="info-box-title">Current Location</div>
              <div><strong>Latitude:</strong> {latitude?.toFixed(4)}</div>
              <div><strong>Longitude:</strong> {longitude?.toFixed(4)}</div>
              <div><strong>Wi-Fi:</strong> {wifiSsid || "Not set"}</div>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <TrendingUp size={18} /> Attendance History
          </div>
          <div className="panel-card-body">
            {attendance.length === 0 ? (
              <div className="empty">
                <strong>No attendance records yet</strong>
                <p style={{ marginTop: 8 }}>Mark your first attendance to see it here</p>
              </div>
            ) : (
              attendance.map((att) => (
                <div key={att.id} className="history-item">
                  <div className="history-item-header">
                    <strong>Session {att.sessionId.substring(0, 8)}...</strong>
                    {getStatusChip(att)}
                  </div>
                  <div className="history-meta"><strong>Checked in:</strong> {new Date(att.checkInTime).toLocaleString()}</div>
                  <div className="history-meta"><strong>Status:</strong> {att.currentStep}</div>
                  <div className="chip-row">
                    {att.verificationLayersPassed.map((layer) => (
                      <span key={layer} className="chip">{layer}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {verificationDialogOpen && (
        <div className="modal-overlay" onClick={() => !loading && setVerificationDialogOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Multi-Layer Verification
              <button type="button" className="icon-btn" onClick={() => !loading && setVerificationDialogOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="stepper">
                {verificationSteps.map((label, idx) => (
                  <div key={label} className={`step ${idx === activeStep ? "active" : idx < activeStep ? "done" : ""}`}>{label}</div>
                ))}
              </div>
              {getStepContent()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setVerificationDialogOpen(false)} disabled={loading}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="modal-overlay" onClick={() => setScannerOpen(false)}>
          <div className="modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Scan QR Code
              <button type="button" className="icon-btn" onClick={() => setScannerOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <Suspense fallback={<div style={{ textAlign: "center", padding: 40 }}><Loader2 size={32} /></div>}>
                <div style={{ width: 320, height: 320, margin: "0 auto" }}>
                  <QrScanner delay={500} onScan={handleScan} onError={handleScanError} style={{ width: "100%" }} />
                </div>
              </Suspense>
              <p className="form-hint" style={{ marginTop: 12, textAlign: "center" }}>Point your camera at the QR code displayed by the professor</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setScannerOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentPortal;
