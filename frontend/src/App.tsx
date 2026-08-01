import React, { createContext, useState, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { School, User, Badge, Mail, Lock, LogOut, Menu as MenuIcon } from 'lucide-react';
import ProfessorDashboard from './components/ProfessorDashboard';
import StudentPortal from './components/StudentPortal';
import TADashboard from './components/TADashboard';
import api, { API_BASE } from './config/api';

interface UserData {
  userId: string;
  name: string;
  role: 'PROFESSOR' | 'STUDENT' | 'TA';
  email: string;
  token: string;
}

interface AuthContextType {
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

const InputField: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}> = ({ label, type = 'text', value, onChange, icon }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-gray-300 py-2.5 ${icon ? 'pl-10 pr-4' : 'px-4'} focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition`}
      />
    </div>
  </div>
);

const Login: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const tabs = [
    { label: 'Professor', icon: <User size={18} /> },
    { label: 'Student', icon: <School size={18} /> },
    { label: 'TA', icon: <Badge size={18} /> },
  ];

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoints = ['/auth/professor/login', '/auth/student/login', '/auth/ta/login'];
      const paths = ['/professor', '/student', '/ta'];
      const res = await api.post(endpoints[tab], { username, password });

      if (res.data?.data) {
        const authData = res.data.data;
        login({
          userId: authData.userId,
          name: authData.name,
          role: authData.role,
          email: authData.email,
          token: authData.token,
        });
        navigate(paths[tab]);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; response?: { data?: { message?: string } }; request?: unknown };
      if (e.code === 'ECONNREFUSED' || e.code === 'ERR_NETWORK' || e.message?.includes('Network Error')) {
        setError(`Cannot connect to server at ${API_BASE}. Check that the backend is deployed and CORS is configured.`);
      } else if (e.response) {
        setError(e.response.data?.message || 'Login failed');
      } else if (e.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(e.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-700 to-pink-400 p-4">
      <div className="w-full max-w-md bg-white/98 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 p-6 text-center text-white">
          <School className="mx-auto mb-2 opacity-90" size={48} />
          <h1 className="text-2xl font-bold">SecureAttend</h1>
          <p className="text-sm opacity-90 mt-1">Advanced Attendance Management System</p>
        </div>

        <div className="p-6">
          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setTab(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition ${
                  tab === i ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
          )}

          <InputField
            label={['Email', 'Roll Number', 'TA ID'][tab]}
            value={username}
            onChange={setUsername}
            icon={tab === 0 ? <Mail size={18} /> : <Badge size={18} />}
          />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            icon={<Lock size={18} />}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {tab === 0 && (
            <p className="mt-4 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <button onClick={() => navigate('/signup')} className="text-brand-500 font-semibold hover:underline">
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Signup: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/professor/signup', form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-700 to-pink-400 p-4">
      <div className="w-full max-w-md bg-white/98 backdrop-blur rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 p-6 text-center text-white">
          <User className="mx-auto mb-2 opacity-90" size={48} />
          <h1 className="text-2xl font-bold">Professor Signup</h1>
          <p className="text-sm opacity-90 mt-1">Create your account to get started</p>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">Registration successful! Redirecting...</div>}

          <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} icon={<User size={18} />} />
          <InputField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} icon={<Mail size={18} />} />
          <InputField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} icon={<School size={18} />} />
          <InputField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} icon={<Lock size={18} />} />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60 transition"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <p className="mt-4 text-center">
            <button onClick={() => navigate('/login')} className="text-brand-500 font-semibold hover:underline text-sm">
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-brand-50">
      <header className="bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <School size={28} />
          <h1 className="text-lg font-bold flex-1">SecureAttend</h1>
          <span className="text-sm opacity-90 hidden sm:inline">{user?.role}</span>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-white/10 transition">
              <MenuIcon size={22} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl text-gray-800 py-2 z-50">
                <div className="px-4 py-2 border-b">
                  <p className="font-semibold text-brand-500">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-brand-50 text-sm"
                >
                  <LogOut size={16} className="text-brand-500" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="text-center mt-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Unauthorized Access</h2>
      <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
      <button onClick={() => navigate('/login')} className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
        Back to Login
      </button>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/professor" element={<ProtectedRoute allowedRoles={['PROFESSOR']}><AppLayout><ProfessorDashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><AppLayout><StudentPortal /></AppLayout></ProtectedRoute>} />
        <Route path="/ta" element={<ProtectedRoute allowedRoles={['TA']}><AppLayout><TADashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
