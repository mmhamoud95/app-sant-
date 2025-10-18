"use client"

import { Box, useTheme } from "@mui/material"
import DashboardSidebar from "./DashboardSidebar"

type DashboardLayoutProps = {
  children: React.ReactNode
  userRole: "patient" | "doctor" | "admin"
}

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: theme.palette.mode === "dark" ? "#111827" : "#F9FAFB",
        color: theme.palette.text.primary,
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      {/* 🧭 Sidebar */}
      <DashboardSidebar userRole={userRole} />

      {/* 🧩 Contenu principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: "calc(100% - 280px)" },
          minHeight: "100vh",
          bgcolor: theme.palette.mode === "dark" ? "#111827" : "#F9FAFB",
          pt: { xs: 8, md: 0 }, // espace pour le bouton mobile
          px: { xs: 2, sm: 3, md: 4 },
          pb: 4,
          overflowX: "hidden",
          transition: "all 0.3s ease",
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.primary.main,
            borderRadius: 4,
          },
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.primary.main} transparent`,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
