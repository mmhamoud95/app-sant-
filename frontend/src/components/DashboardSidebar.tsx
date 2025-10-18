"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  styled,
  Tooltip,
} from "@mui/material"
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
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline"
import { HeartIcon } from "@heroicons/react/24/solid"
import { useState, useMemo, memo, useEffect } from "react"

// Constants
const DRAWER_WIDTH_EXPANDED = 280
const DRAWER_WIDTH_COLLAPSED = 72

// Types
type UserRole = "patient" | "doctor" | "admin"

type MenuItem = {
  label: string
  path: string
  icon: React.ComponentType<any>
}

type SidebarProps = {
  userRole: UserRole
}

type ColorScheme = {
  primary: string
  secondary: string
  light: string
  gradient: string
}

// Styled components
const SidebarContainer = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#FAFAFA",
  overflowY: "auto",
  scrollbarWidth: "thin", // Firefox
  scrollbarColor: `${theme.palette.primary.main} transparent`, // Firefox
  "&::-webkit-scrollbar": { width: 8 }, // Webkit
  "&::-webkit-scrollbar-thumb": {
    background: theme.palette.primary.main,
    borderRadius: 4,
  },
}))

const LogoContainer = styled(Box)<{ colors: ColorScheme }>(({ colors }) => ({
  padding: 16,
  background: colors.gradient,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}))

const UserProfileContainer = styled(Box)({
  padding: 20,
  borderBottom: "1px solid #E5E7EB",
})

const CollapseButton = styled(IconButton)<{ colors: ColorScheme }>(({ colors }) => ({
  color: "white",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  padding: 4,
}))

// Memo components for performance
const SidebarHeader = memo(
  ({ 
    colors, 
    isCollapsed, 
    onToggleCollapse 
  }: { 
    colors: ColorScheme; 
    isCollapsed: boolean; 
    onToggleCollapse: () => void 
  }) => (
    <LogoContainer colors={colors}>
      {!isCollapsed ? (
        <Link href="/" style={{ textDecoration: "none", flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: "12px",
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HeartIcon width={28} height={28} style={{ color: colors.primary }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="white">
              App Santé
            </Typography>
          </Box>
        </Link>
      ) : (
        <Link href="/" style={{ textDecoration: "none", width: "100%", display: "flex", justifyContent: "center" }}>
          <Box
            sx={{
              bgcolor: "white",
              borderRadius: "12px",
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HeartIcon width={24} height={24} style={{ color: colors.primary }} />
          </Box>
        </Link>
      )}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <CollapseButton
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          size="small"
          colors={colors}
        >
          {isCollapsed ? <ChevronRightIcon width={16} /> : <ChevronLeftIcon width={16} />}
        </CollapseButton>
      </Box>
    </LogoContainer>
  )
)

const UserProfile = memo(
  ({
    session,
    colors,
    userRole,
    isCollapsed,
  }: {
    session: any
    colors: ColorScheme
    userRole: UserRole
    isCollapsed: boolean
  }) => {
    const getUserInitials = () => session?.user?.email?.[0]?.toUpperCase() ?? "?"
    const userLabel = userRole === "admin" ? "Administrateur" : userRole === "doctor" ? "Praticien" : "Patient"

    if (isCollapsed) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <Tooltip title={session?.user?.email?.split("@")[0] ?? "Utilisateur"}>
            <Avatar sx={{ bgcolor: colors.primary, width: 40, height: 40, fontWeight: 600 }}>
              {getUserInitials()}
            </Avatar>
          </Tooltip>
        </Box>
      )
    }

    return (
      <UserProfileContainer>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: colors.primary, width: 48, height: 48, fontWeight: 600 }}>
            {getUserInitials()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={600}>
              {session?.user?.email?.split("@")[0] ?? "Utilisateur"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {userLabel}
            </Typography>
          </Box>
        </Box>
      </UserProfileContainer>
    )
  }
)

const NavigationItem = memo(
  ({
    item,
    isActive,
    colors,
    onClick,
    isCollapsed,
  }: {
    item: MenuItem
    isActive: boolean
    colors: ColorScheme
    onClick?: () => void
    isCollapsed: boolean
  }) => {
    const Icon = item.icon

    if (isCollapsed) {
      return (
        <Tooltip title={item.label} placement="right">
          <Link
            href={item.path}
            style={{ textDecoration: "none", width: "100%", display: "block" }}
            onClick={onClick}
          >
            <ListItemButton
              sx={{
                borderRadius: "12px",
                py: 1.3,
                justifyContent: "center",
                mb: 0.5,
                bgcolor: isActive ? colors.light : "transparent",
                transition: "background 0.2s ease, transform 0.1s ease",
                "&:hover": {
                  bgcolor: isActive ? colors.light : "#F3F4F6",
                  transform: "scale(1.05)",
                },
              }}
            >
              <Icon width={22} height={22} style={{ color: isActive ? colors.primary : "#6B7280" }} />
            </ListItemButton>
          </Link>
        </Tooltip>
      )
    }

    return (
      <Link
        href={item.path}
        style={{ textDecoration: "none", width: "100%", display: "block" }}
        onClick={onClick}
      >
        <ListItemButton
          sx={{
            borderRadius: "12px",
            py: 1.3,
            px: 2,
            mb: 0.5,
            bgcolor: isActive ? colors.light : "transparent",
            transition: "background 0.2s ease, transform 0.1s ease",
            "&:hover": {
              bgcolor: isActive ? colors.light : "#F3F4F6",
              transform: "scale(1.02)",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Icon width={22} height={22} style={{ color: isActive ? colors.primary : "#6B7280" }} />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? colors.primary : "#374151",
            }}
          />
        </ListItemButton>
      </Link>
    )
  }
)

const LogoutButton = memo(
  ({ 
    colors, 
    onLogout, 
    isCollapsed 
  }: { 
    colors: ColorScheme; 
    onLogout: () => void; 
    isCollapsed: boolean 
  }) => {
    if (isCollapsed) {
      return (
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <Tooltip title="Déconnexion" placement="right">
            <IconButton
              onClick={onLogout}
              sx={{
                color: colors.primary,
                border: `2px solid ${colors.primary}`,
                borderRadius: "12px",
                p: 1,
                "&:hover": { bgcolor: colors.light },
              }}
            >
              <ArrowRightOnRectangleIcon width={22} height={22} />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={onLogout}
          sx={{
            borderRadius: "12px",
            py: 1.5,
            px: 2,
            border: `2px solid ${colors.primary}`,
            "&:hover": { bgcolor: colors.light },
            transition: "all 0.2s ease",
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ArrowRightOnRectangleIcon width={22} height={22} style={{ color: colors.primary }} />
          </ListItemIcon>
          <ListItemText
            primary="Déconnexion"
            primaryTypographyProps={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: colors.primary,
            }}
          />
        </ListItemButton>
      </Box>
    );
  }
)

// Main component
export default function DashboardSidebar({ userRole }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // For localStorage persistence of sidebar state
  useEffect(() => {
    // Load sidebar state from localStorage
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) {
      setIsCollapsed(savedState === "true")
    }
  }, [])
  
  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed.toString())
  }, [isCollapsed])

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev)
  const handleToggleCollapse = () => setIsCollapsed((prev) => !prev)
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" })
  }

  // Get current date for display (YYYY-MM-DD)
  const currentDate = new Date().toISOString().split('T')[0]

  // Theme colors based on user role
  const colors = useMemo<ColorScheme>(() => {
    const palette: Record<UserRole, ColorScheme> = {
      patient: {
        primary: "#2563EB",
        secondary: "#3B82F6",
        light: "#EFF6FF",
        gradient: "linear-gradient(135deg, #2563EB, #3B82F6)",
      },
      doctor: {
        primary: "#10B981",
        secondary: "#059669",
        light: "#D1FAE5",
        gradient: "linear-gradient(135deg, #10B981, #14B8A6)",
      },
      admin: {
        primary: "#9333EA",
        secondary: "#7E22CE",
        light: "#F3E8FF",
        gradient: "linear-gradient(135deg, #9333EA, #4F46E5)",
      },
    }
    return palette[userRole]
  }, [userRole])

  // Navigation items based on user role
  const menuItems = useMemo<MenuItem[]>(() => {
    const menuConfig: Record<UserRole, MenuItem[]> = {
      patient: [
        { label: "Accueil", path: "/dashboard/patient", icon: HomeIcon },
        { label: "Rechercher", path: "/search", icon: MagnifyingGlassIcon },
        { label: "Mes rendez-vous", path: "/dashboard/patient", icon: CalendarDaysIcon },
        {
          label: "Messages",
          path: "/dashboard/patient/messages",
          icon: ChatBubbleLeftRightIcon,
        },
        {
          label: "Dossier médical",
          path: "/dashboard/patient/medical-records",
          icon: DocumentTextIcon,
        },
        { label: "Profils familiaux", path: "/dashboard/patient/family", icon: UserGroupIcon },
        { label: "Mon profil", path: "/dashboard/patient/profile", icon: UserIcon },
        { label: "Paramètres", path: "/dashboard/patient/settings", icon: Cog6ToothIcon },
      ],
      doctor: [
        { label: "Tableau de bord", path: "/dashboard/doctor", icon: HomeIcon },
        { label: "Rendez-vous", path: "/dashboard/doctor/appointments", icon: CalendarDaysIcon },
        {
          label: "Disponibilités",
          path: "/dashboard/doctor/availability",
          icon: ClipboardDocumentCheckIcon,
        },
        { label: "Mon profil", path: "/dashboard/doctor/profile", icon: UserIcon },
        { label: "Statistiques", path: "/dashboard/doctor/stats", icon: ChartBarIcon },
      ],
      admin: [
        { label: "Tableau de bord", path: "/dashboard/admin", icon: HomeIcon },
        { label: "Praticiens", path: "/dashboard/admin/doctors", icon: ClipboardDocumentCheckIcon },
        { label: "Patients", path: "/dashboard/admin/patients", icon: UsersIcon },
        { label: "Statistiques", path: "/dashboard/admin/stats", icon: ChartBarIcon },
        { label: "Paramètres", path: "/dashboard/admin/settings", icon: Cog6ToothIcon },
      ],
    }
    
    return menuConfig[userRole] || []
  }, [userRole])

  // Current drawer width based on collapsed state
  const currentDrawerWidth = isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED

  // Drawer content
  const drawerContent = (
    <SidebarContainer>
      <SidebarHeader 
        colors={colors} 
        isCollapsed={isCollapsed} 
        onToggleCollapse={handleToggleCollapse} 
      />
      
      <UserProfile 
        session={session} 
        colors={colors} 
        userRole={userRole} 
        isCollapsed={isCollapsed} 
      />

      {/* Date display - only shown when expanded */}
      {!isCollapsed && (
        <Box sx={{ px: 3, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {currentDate}
          </Typography>
        </Box>
      )}

      <List sx={{ flex: 1, py: 1.5, px: isCollapsed ? 1 : 1.5 }}>
        {menuItems.map((item) => (
          <NavigationItem
            key={item.path}
            item={item}
            isActive={pathname === item.path}
            colors={colors}
            onClick={isMobile ? handleDrawerToggle : undefined}
            isCollapsed={isCollapsed}
          />
        ))}
      </List>

      <Divider />
      <LogoutButton 
        colors={colors} 
        onLogout={handleLogout} 
        isCollapsed={isCollapsed} 
      />
    </SidebarContainer>
  )

  return (
    <>
      {/* Mobile menu toggle button */}
      <IconButton
        color="inherit"
        onClick={handleDrawerToggle}
        aria-label="open drawer"
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1300,
          bgcolor: "white",
          boxShadow: 3,
          "&:hover": { bgcolor: colors.light },
          transition: "all 0.2s ease",
        }}
      >
        <Bars3Icon width={24} height={24} style={{ color: colors.primary }} />
      </IconButton>

      {/* Mobile drawer - temporary */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH_EXPANDED,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            border: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer - permanent but collapsible */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: currentDrawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          "& .MuiDrawer-paper": {
            width: currentDrawerWidth,
            border: "none",
            boxSizing: "border-box",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflowX: "hidden",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  )
}