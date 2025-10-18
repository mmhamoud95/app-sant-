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
          width: { md: 'calc(100% - 280px)' },
          minHeight: '100vh',
          bgcolor: '#F9FAFB',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
