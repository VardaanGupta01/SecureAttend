import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  Box,
  Paper 
} from '@mui/material'
import { 
  School as ProfessorIcon, 
  Person as StudentIcon, 
  SupervisorAccount as TAIcon 
} from '@mui/icons-material'

const RoleSelector: React.FC = () => {
  const navigate = useNavigate()

  const roles = [
    {
      title: 'Professor',
      description: 'Create sessions, generate QR codes, monitor attendance',
      icon: <ProfessorIcon sx={{ fontSize: 60 }} />,
      path: '/professor',
      color: '#1976d2'
    },
    {
      title: 'Student',
      description: 'Scan QR codes, verify location and face, mark attendance',
      icon: <StudentIcon sx={{ fontSize: 60 }} />,
      path: '/student',
      color: '#2e7d32'
    },
    {
      title: 'Teaching Assistant',
      description: 'View reports, track attendance trends, generate analytics',
      icon: <TAIcon sx={{ fontSize: 60 }} />,
      path: '/ta',
      color: '#ed6c02'
    }
  ]

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        SecureAttend
      </Typography>
      <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
        Multi-Layer Attendance Verification System
      </Typography>
      
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {roles.map((role) => (
          <Grid item xs={12} md={4} key={role.title}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: role.color, mb: 2 }}>
                  {role.icon}
                </Box>
                <Typography variant="h5" component="h2" gutterBottom>
                  {role.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {role.description}
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={() => navigate(role.path)}
                  sx={{ 
                    backgroundColor: role.color,
                    '&:hover': {
                      backgroundColor: role.color,
                      opacity: 0.9
                    }
                  }}
                >
                  Enter as {role.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default RoleSelector
