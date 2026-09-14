import React, { useState, useEffect, Suspense } from "react";
import { QrCode, MapPin, CheckCircle, TrendingUp, X, Loader2, GraduationCap, Wifi, RefreshCw } from "lucide-react";
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
  const [isDetectingWifi, setIsDetectingWifi] = useState(false);
  const [detectedWifiInfo, setDetectedWifiInfo] = useState<{
    detectedSSID: string;
    requiredSSID: string | null;
    wifiRequired: boolean;
    isMatch: boolean;
  } | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<string[]>(["QR/Codeword"]);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  const detectWifiNetwork = async (targetSessionId?: string) => {
    const sId = targetSessionId !== undefined ? targetSessionId : sessionId;
    setIsDetectingWifi(true);
    try {
      const response = await api.get('/student/detect-network', {
        params: sId ? { sessionId: sId } : {},
      });
      const data = response.data?.data || response.data;
      if (data) {
        setDetectedWifiInfo(data);
        if (data.detectedSSID) {
          setWifiSsid(data.detectedSSID);
        }
      }
    } catch (error) {
      console.warn('Network auto-detection failed:', error);
    } finally {
      setIsDetectingWifi(false);
    }
  };

  useEffect(() => {
    loadStudentAttendance();
    getCurrentLocation();
    loadUserProfile();
    detectWifiNetwork();
  }, []);

  useEffect(() => {
    if (activeStep === 1) {
      detectWifiNetwork(sessionId);
    }
  }, [activeStep, sessionId]);

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
    const steps = ["QR/Codeword", "Location & Wi-Fi"];
    setVerificationSteps(steps);
    
    if (attendance.currentStep === "QR_VERIFIED") {
      setActiveStep(1);
    } else if (attendance.currentStep === "LOCATION_VERIFIED" || attendance.currentStep === "AWAITING_PROFESSOR" || attendance.currentStep === "COMPLETED") {
      setMessage({ type: "success", text: "Attendance recorded and awaiting professor approval." });
      setTimeout(() => {
        setVerificationDialogOpen(false);
        loadStudentAttendance();
        resetForm();
      }, 1800);
    }
  };

  const resetForm = () => {
    setSessionId("");
    setQrOrCodeword("");
    setActiveStep(0);
    setDetectedWifiInfo(null);
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
    if (detectedWifiInfo?.wifiRequired && !wifiSsid.trim()) {
      setMessage({
        type: "error",
        text: "Classroom Wi-Fi network not detected. Please ensure Wi-Fi is active and click 'Re-scan'.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/student/attendance/verify-location', {
        attendanceId: currentAttendance.id,
        latitude,
        longitude,
        wifiSSID: wifiSsid.trim() || undefined,
      });
      
      const updated = response.data?.data || response.data;
      setCurrentAttendance(updated);
      
      setMessage({ type: "success", text: "Location & Wi-Fi verified! Attendance recorded successfully." });
      setTimeout(() => {
        setVerificationDialogOpen(false);
        loadStudentAttendance();
        resetForm();
      }, 1800);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Location verification failed";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const proceedToNextStep = () => {
    if (activeStep === 0) initiateAttendance();
    else if (activeStep === 1) verifyLocation();
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0, fontWeight: 600 }}>Wi-Fi Network (Auto-Detected)</label>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '2px 8px', fontSize: '0.78rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => detectWifiNetwork(sessionId)}
                  disabled={isDetectingWifi}
                  title="Re-scan connected network"
                >
                  <RefreshCw size={12} className={isDetectingWifi ? 'spin' : ''} />
                  {isDetectingWifi ? 'Detecting…' : 'Re-scan'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  value={wifiSsid}
                  readOnly
                  placeholder={isDetectingWifi ? "Detecting connected Wi-Fi…" : "No Wi-Fi network detected"}
                  style={{
                    backgroundColor: 'rgba(243, 244, 246, 0.7)',
                    cursor: 'not-allowed',
                    fontWeight: 600,
                    color: wifiSsid ? 'inherit' : '#9ca3af',
                  }}
                />
                {isDetectingWifi && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    <Loader2 size={16} className="spin" color="#2563eb" />
                  </div>
                )}
              </div>
              {detectedWifiInfo && (
                <div style={{ marginTop: 6, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {detectedWifiInfo.wifiRequired ? (
                    detectedWifiInfo.isMatch ? (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={14} /> Network matched: {detectedWifiInfo.requiredSSID}
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={14} /> Connected to &apos;{detectedWifiInfo.detectedSSID}&apos; (Expected: &apos;{detectedWifiInfo.requiredSSID}&apos;)
                      </span>
                    )
                  ) : (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={14} /> Connected: {detectedWifiInfo.detectedSSID} (Auto-detected)
                    </span>
                  )}
                </div>
              )}
              <div className="form-hint" style={{ marginTop: 4 }}>
                SSID is automatically verified from your device interface to prevent bypass spoofing.
              </div>
            </div>
            <button
              type="button"
              className="btn primary full"
              onClick={proceedToNextStep}
              disabled={loading || (detectedWifiInfo?.wifiRequired ? !wifiSsid.trim() : false)}
            >
              <CheckCircle size={16} /> {loading ? 'Verifying…' : 'Verify & Mark Attendance'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Connected Wi-Fi Network</label>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '2px 8px', fontSize: '0.78rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => detectWifiNetwork(sessionId)}
                  disabled={isDetectingWifi}
                  title="Re-scan connected network"
                >
                  <RefreshCw size={12} className={isDetectingWifi ? 'spin' : ''} />
                  {isDetectingWifi ? 'Scanning…' : 'Scan Network'}
                </button>
              </div>
              <input
                className="form-input"
                value={wifiSsid}
                readOnly
                placeholder={isDetectingWifi ? "Detecting Wi-Fi…" : "No Wi-Fi detected"}
                style={{
                  backgroundColor: 'rgba(243, 244, 246, 0.7)',
                  cursor: 'not-allowed',
                  fontWeight: 600,
                  color: wifiSsid ? 'inherit' : '#9ca3af',
                }}
              />
              <div className="form-hint">Automatically fetched from your connection (read-only for security)</div>
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
              <div><strong>Wi-Fi:</strong> {wifiSsid ? <span style={{ color: '#059669', fontWeight: 600 }}>{wifiSsid} (Auto-detected)</span> : "Not detected"}</div>
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
