import React, { createContext, useState, useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  Box, Container, AppBar, Toolbar, Typography, Button, Card, CardContent,
  TextField, Tabs, Tab, Alert, Link, IconButton, Menu, MenuItem, InputAdornment
} from '@mui/material';
import { AccountCircle, ExitToApp, Email, Lock, School, Person, Badge } from '@mui/icons-material';
import ProfessorDashboard from './components/ProfessorDashboard';
import StudentPortal from './components/StudentPortal';
import TADashboard from './components/TADashboard';
import axios from 'axios';

const API_BASE = 'https://secure-attend-backend.onrender.com/api';
const api = axios.create({ baseURL: API_BASE });

interface User {
  userId: string;
  name: string;
  role: 'PROFESSOR' | 'STUDENT' | 'TA';
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (userData: User) => {
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

const Login: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoints = ['/auth/professor/login', '/auth/student/login', '/auth/ta/login'];
      const paths = ['/professor', '/student', '/ta'];
      const res = await api.post(endpoints[tab], { username, password });
      
      if (res.data && res.data.data) {
        const authData = res.data.data;
        const userData: User = {
          userId: authData.userId,
          name: authData.name,
          role: authData.role as 'PROFESSOR' | 'STUDENT' | 'TA',
          email: authData.email,
          token: authData.token
        };
        login(userData);
        navigate(paths[tab]);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please make sure the backend is running on https://secure-attend-backend.onrender.com');
      } else if (err.response) {
        const errorMessage = err.response?.data?.message || err.response?.data?.errorCode || 'Login failed';
        setError(errorMessage);
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite',
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.8 },
      }
    }}>
      <Card sx={{ 
        width: 480, 
        maxWidth: '90%',
        borderRadius: 4,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
      }}>
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 3,
          textAlign: 'center',
          color: 'white',
        }}>
          <School sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            SecureAttend
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Advanced Attendance Management System
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)} 
            centered 
            sx={{ 
              mb: 3,
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: '#667eea',
              },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab icon={<Person />} iconPosition="start" label="Professor" />
            <Tab icon={<School />} iconPosition="start" label="Student" />
            <Tab icon={<Badge />} iconPosition="start" label="TA" />
          </Tabs>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  alignItems: 'center',
                }
              }}
            >
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label={['Email', 'Roll Number', 'TA ID'][tab]}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {tab === 0 ? <Email sx={{ color: '#667eea' }} /> : <Badge sx={{ color: '#667eea' }} />}
                </InputAdornment>
              ),
            }}
            variant="outlined"
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
            }}
            variant="outlined"
          />
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleLogin} 
            disabled={loading} 
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
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
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          {tab === 0 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link 
                  component="button" 
                  onClick={() => navigate('/signup')}
                  sx={{
                    color: '#667eea',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Card sx={{ 
        width: 480, 
        maxWidth: '90%',
        borderRadius: 4,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
      }}>
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 3,
          textAlign: 'center',
          color: 'white',
        }}>
          <Person sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Professor Signup
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Create your account to get started
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Registration successful! Redirecting...</Alert>}
          <TextField 
            fullWidth 
            label="Name" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField 
            fullWidth 
            label="Email" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField 
            fullWidth 
            label="Department" 
            value={form.department} 
            onChange={(e) => setForm({ ...form, department: e.target.value })} 
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <School sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField 
            fullWidth 
            type="password" 
            label="Password" 
            value={form.password} 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            fullWidth 
            variant="contained" 
            onClick={handleSignup} 
            disabled={loading} 
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
              },
            }}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </Button>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link 
              component="button" 
              onClick={() => navigate('/login')}
              sx={{
                color: '#667eea',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
        }}
      >
        <Toolbar>
          <School sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            SecureAttend
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
            {user?.role}
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <AccountCircle />
          </IconButton>
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: {
                borderRadius: 2,
                mt: 1,
                minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }
            }}
          >
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem 
              onClick={() => { logout(); navigate('/login'); }}
              sx={{
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.08)',
                }
              }}
            >
              <ExitToApp sx={{ mr: 1, color: '#667eea' }} /> 
              <Typography>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h4" gutterBottom>Unauthorized Access</Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>You don't have permission to access this page.</Typography>
      <Button variant="contained" onClick={() => navigate('/login')}>Back to Login</Button>
    </Box>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        <Route
          path="/professor"
          element={
            <ProtectedRoute allowedRoles={['PROFESSOR']}>
              <AppLayout><ProfessorDashboard /></AppLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <AppLayout><StudentPortal /></AppLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/ta"
          element={
            <ProtectedRoute allowedRoles={['TA']}>
              <AppLayout><TADashboard /></AppLayout>
            </ProtectedRoute>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;