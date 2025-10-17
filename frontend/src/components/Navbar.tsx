"use client"

import Link from "next/link"
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Avatar, Divider } from "@mui/material"
import MenuIcon from "@mui/icons-material/Menu"
import { useSession, signIn, signOut } from "next-auth/react"
import { useState } from "react"

export default function Navbar() {
  const { data: session, status } = useSession()
  const isAuth = status === "authenticated"
  const role = (session?.user as any)?.role as string | undefined
  const name = (session?.user as any)?.name || "Utilisateur"

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleMenuClose = () => setAnchorEl(null)

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar className="max-w-6xl mx-auto w-full flex justify-between">
        <Typography variant="h6" fontWeight="bold">
          <Link href="/" className="no-underline text-inherit">App Santé</Link>
        </Typography>

        {/* Desktop Navigation */}
        <Box className="hidden sm:flex gap-2 items-center">
          <Button component={Link} href="/search" color="primary">
            Trouver un praticien
          </Button>

          {role === "patient" && (
            <Button component={Link} href="/dashboard/patient">
              Mes rendez-vous
            </Button>
          )}
          {role === "doctor" && (
            <Button component={Link} href="/dashboard/practitioner">
              Dashboard praticien
            </Button>
          )}
          {role === "admin" && (
            <Button component={Link} href="/dashboard/admin">
              Admin
            </Button>
          )}

          {status === "loading" ? (
            <Button disabled>Chargement...</Button>
          ) : !isAuth ? (
            <Button variant="contained" onClick={() => signIn()}>
              Se connecter
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => signOut({ callbackUrl: "/" })}>
              Se déconnecter
            </Button>
          )}
        </Box>

        {/* Mobile Menu */}
        <Box className="sm:hidden">
          <IconButton onClick={handleMenuOpen} color="inherit">
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem component={Link} href="/search" onClick={handleMenuClose}>
              Trouver un praticien
            </MenuItem>

            {role === "patient" && (
              <MenuItem component={Link} href="/dashboard/patient" onClick={handleMenuClose}>
                Mes rendez-vous
              </MenuItem>
            )}
            {role === "doctor" && (
              <MenuItem component={Link} href="/dashboard/practitioner" onClick={handleMenuClose}>
                Dashboard praticien
              </MenuItem>
            )}
            {role === "admin" && (
              <MenuItem component={Link} href="/dashboard/admin" onClick={handleMenuClose}>
                Admin
              </MenuItem>
            )}

            <Divider />

            {!isAuth ? (
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  signIn()
                }}
              >
                Se connecter
              </MenuItem>
            ) : (
              <MenuItem
                onClick={() => {
                  handleMenuClose()
                  signOut({ callbackUrl: "/" })
                }}
              >
                Se déconnecter
              </MenuItem>
            )}
          </Menu>
        </Box>

        {/* Avatar / Profile Info (optionnel) */}
        {isAuth && (
          <Box className="hidden sm:flex items-center gap-2 ml-4">
            <Avatar alt={name} sx={{ width: 32, height: 32 }} />
            <Typography variant="body2" color="text.secondary">
              {name} {role && <span className="text-gray-500">({role})</span>}
            </Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}
