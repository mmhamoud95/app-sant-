"use client"
import { Box } from '@mui/material'
import DashboardSidebar from './DashboardSidebar'

type DashboardLayoutProps = {
  children: React.ReactNode
  userRole: 'patient' | 'doctor' | 'admin'
}

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F9FAFB' }}>
      <DashboardSidebar userRole={userRole} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'calc(100% - 280px)' },
          minHeight: '100vh',
          bgcolor: '#F9FAFB',
          pt: { xs: 8, md: 0 }, // Padding top pour le bouton hamburger sur mobile
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
