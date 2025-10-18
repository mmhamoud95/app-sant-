"use client"
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  HomeIcon,
  CalendarDaysIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  ShieldCheckIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

const drawerWidth = 280

type MenuItem = {
  label: string
  path: string
  icon: React.ComponentType<any>
}

type SidebarProps = {
  userRole: 'patient' | 'doctor' | 'admin'
}

export default function DashboardSidebar({ userRole }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  // Define menu items based on user role
  const getMenuItems = (): MenuItem[] => {
    switch (userRole) {
      case 'patient':
        return [
          { label: 'Accueil', path: '/dashboard/patient', icon: HomeIcon },
          { label: 'Rechercher', path: '/search', icon: MagnifyingGlassIcon },
          { label: 'Mes rendez-vous', path: '/dashboard/patient', icon: CalendarDaysIcon },
          { label: 'Messages', path: '/dashboard/patient/messages', icon: ChatBubbleLeftRightIcon },
          { label: 'Dossier médical', path: '/dashboard/patient/medical-records', icon: DocumentTextIcon },
          { label: 'Profils familiaux', path: '/dashboard/patient/family', icon: UserGroupIcon },
          { label: 'Mon profil', path: '/dashboard/patient/profile', icon: UserIcon },
          { label: 'Paramètres', path: '/dashboard/patient/settings', icon: Cog6ToothIcon },
        ]
      case 'doctor':
        return [
          { label: 'Tableau de bord', path: '/dashboard/doctor', icon: HomeIcon },
          { label: 'Rendez-vous', path: '/dashboard/doctor/appointments', icon: CalendarDaysIcon },
          { label: 'Disponibilités', path: '/dashboard/doctor/availability', icon: ClipboardDocumentCheckIcon },
          { label: 'Mon profil', path: '/dashboard/doctor/profile', icon: UserIcon },
          { label: 'Statistiques', path: '/dashboard/doctor/stats', icon: ChartBarIcon },
        ]
      case 'admin':
        return [
          { label: 'Tableau de bord', path: '/dashboard/admin', icon: HomeIcon },
          { label: 'Praticiens', path: '/dashboard/admin/doctors', icon: ClipboardDocumentCheckIcon },
          { label: 'Patients', path: '/dashboard/admin/patients', icon: UsersIcon },
          { label: 'Statistiques', path: '/dashboard/admin/stats', icon: ChartBarIcon },
          { label: 'Paramètres', path: '/dashboard/admin/settings', icon: Cog6ToothIcon },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  // Get theme colors based on role
  const getRoleColors = () => {
    switch (userRole) {
      case 'patient':
        return {
          primary: '#2563EB', // blue-600
          secondary: '#3B82F6', // blue-500
          light: '#EFF6FF', // blue-50
          gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        }
      case 'doctor':
        return {
          primary: '#10B981', // green-600
          secondary: '#059669', // green-700
          light: '#D1FAE5', // green-100
          gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
        }
      case 'admin':
        return {
          primary: '#9333EA', // purple-600
          secondary: '#7E22CE', // purple-700
          light: '#F3E8FF', // purple-100
          gradient: 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)',
        }
      default:
        return {
          primary: '#6B7280',
          secondary: '#4B5563',
          light: '#F3F4F6',
          gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
        }
    }
  }

  const colors = getRoleColors()

  const getUserInitials = () => {
    if (!session?.user) return '?'
    const email = session.user.email || ''
    return email.charAt(0).toUpperCase()
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case 'patient':
        return 'Patient'
      case 'doctor':
        return 'Praticien'
      case 'admin':
        return 'Administrateur'
      default:
        return ''
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
      {/* Logo and Brand */}
      <Box sx={{ p: 3, background: colors.gradient }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: '12px',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartIcon style={{ width: 28, height: 28, color: colors.primary }} />
            </Box>
            <Typography variant="h6" fontWeight="700" color="white">
              App Santé
            </Typography>
          </Box>
        </Link>
      </Box>

      {/* User Profile Section */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid #E5E7EB' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: colors.primary,
              width: 48,
              height: 48,
              fontSize: '1.25rem',
              fontWeight: 600,
            }}
          >
            {getUserInitials()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight="600" noWrap sx={{ color: '#1F2937' }}>
              {session?.user?.email?.split('@')[0] || 'Utilisateur'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              {getRoleLabel()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, pt: 2, px: 1.5 }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Link href={item.path} style={{ textDecoration: 'none', width: '100%' }} onClick={isMobile ? handleDrawerToggle : undefined}>
                <ListItemButton
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    px: 2,
                    bgcolor: isActive ? colors.light : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? colors.light : '#F3F4F6',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      style={{
                        width: 24,
                        height: 24,
                        color: isActive ? colors.primary : '#6B7280',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.95rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? colors.primary : '#374151',
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          )
        })}
      </List>

      <Divider sx={{ borderColor: '#E5E7EB' }} />

      {/* Logout Button */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: '12px',
            py: 1.5,
            px: 2,
            border: `2px solid ${colors.primary}`,
            '&:hover': {
              bgcolor: colors.light,
            },
            transition: 'all 0.2s',
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ArrowRightOnRectangleIcon
              style={{
                width: 24,
                height: 24,
                color: colors.primary,
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Déconnexion"
            primaryTypographyProps={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: colors.primary,
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{ 
          display: { xs: 'flex', md: 'none' },
          position: 'fixed', 
          top: 16, 
          left: 16, 
          zIndex: 1300, 
          bgcolor: 'white', 
          boxShadow: 3,
          '&:hover': {
            bgcolor: colors.light,
          },
          transition: 'all 0.2s',
        }}
      >
        <Bars3Icon style={{ width: 24, height: 24, color: colors.primary }} />
      </IconButton>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  )
}
