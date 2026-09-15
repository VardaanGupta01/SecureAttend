import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, LogOut, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  headerActions?: React.ReactNode;
  profilePicture?: string | null;
  onProfileClick?: () => void;
  message?: { type: 'success' | 'error'; text: string } | null;
  onDismissMessage?: () => void;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  icon,
  headerActions,
  profilePicture,
  onProfileClick,
  message,
  onDismissMessage,
  children,
}) => {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();

  const logout = async () => {
    try {
      await authLogout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="pa-root">
      <div className="pa-container">
        <header className="pa-header">
          <div className="pa-logo">
            <div className="pa-logo-icon">{icon}</div>
            <div>
              <h1 className="pa-title">{title}</h1>
              <div className="pa-sub">{subtitle}</div>
            </div>
          </div>
          <div className="pa-header-right">
            {onProfileClick && (
              <button
                type="button"
                className={`btn subtle profile-btn${profilePicture ? '' : ' icon'}`}
                onClick={onProfileClick}
                title="Profile"
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  icon
                )}
              </button>
            )}
            {headerActions}
            <button type="button" className="btn ghost" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {message && (
          <div className={`pa-alert ${message.type === 'success' ? 'pa-alert-success' : 'pa-alert-error'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <div className="pa-alert-text">{message.text}</div>
            {onDismissMessage && (
              <button type="button" className="pa-alert-close" onClick={onDismissMessage}>
                <XCircle size={18} />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
