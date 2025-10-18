"use client"
import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Paper,
  Typography,
  Container,
  Button,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

export default function AdminSettingsPage() {
  const { status } = useSession()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [doctorAutoApproval, setDoctorAutoApproval] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [language, setLanguage] = useState('fr')
  const [timezone, setTimezone] = useState('Europe/Paris')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API
    setShowSuccess(true)
  }

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <Paper elevation={3} className="p-8 rounded-xl">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <Typography variant="h5" gutterBottom className="font-bold">
            Accès administrateur requis
          </Typography>
          <Typography color="text.secondary" className="mb-4">
            Vous devez vous connecter avec un compte administrateur.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => signIn()}
            sx={{
              background: 'linear-gradient(to right, #9333EA, #4F46E5)',
              '&:hover': {
                background: 'linear-gradient(to right, #7E22CE, #4338CA)',
              },
            }}
          >
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <DashboardLayout userRole="admin">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
              <Cog6ToothIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Paramètres système
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Configuration globale de la plateforme
              </Typography>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Notifications Settings */}
          <Paper className="rounded-xl border border-purple-100 p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 rounded-lg">
                <BellIcon className="h-6 w-6 text-blue-600" />
              </div>
              <Typography variant="h6" fontWeight="bold">
                Notifications
              </Typography>
            </div>
            <Divider className="mb-4" />
            <Box className="space-y-3">
              <FormControlLabel
                control={
                  <Switch 
                    checked={emailNotifications} 
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="600">Notifications par email</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Envoyer des notifications aux admins pour les événements importants
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Paper>

          {/* Doctor Management Settings */}
          <Paper className="rounded-xl border border-purple-100 p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-100 to-green-50 p-2 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <Typography variant="h6" fontWeight="bold">
                Gestion des praticiens
              </Typography>
            </div>
            <Divider className="mb-4" />
            <Box className="space-y-3">
              <FormControlLabel
                control={
                  <Switch 
                    checked={doctorAutoApproval} 
                    onChange={(e) => setDoctorAutoApproval(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="600">Approbation automatique</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approuver automatiquement les nouveaux praticiens (non recommandé)
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Paper>

          {/* Platform Settings */}
          <Paper className="rounded-xl border border-purple-100 p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 p-2 rounded-lg">
                <GlobeAltIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <Typography variant="h6" fontWeight="bold">
                Configuration de la plateforme
              </Typography>
            </div>
            <Divider className="mb-4" />
            <Box className="space-y-4">
              <FormControl fullWidth>
                <InputLabel>Langue par défaut</InputLabel>
                <Select
                  value={language}
                  label="Langue par défaut"
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="ar">العربية</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Fuseau horaire</InputLabel>
                <Select
                  value={timezone}
                  label="Fuseau horaire"
                  onChange={(e) => setTimezone(e.target.value)}
                  sx={{ borderRadius: '12px' }}
                >
                  <MenuItem value="Europe/Paris">Europe/Paris (GMT+1)</MenuItem>
                  <MenuItem value="Africa/Casablanca">Africa/Casablanca (GMT+1)</MenuItem>
                  <MenuItem value="Africa/Algiers">Africa/Algiers (GMT+1)</MenuItem>
                  <MenuItem value="Africa/Tunis">Africa/Tunis (GMT+1)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {/* Security Settings */}
          <Paper className="rounded-xl border border-purple-100 p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-red-100 to-red-50 p-2 rounded-lg">
                <LockClosedIcon className="h-6 w-6 text-red-600" />
              </div>
              <Typography variant="h6" fontWeight="bold">
                Sécurité
              </Typography>
            </div>
            <Divider className="mb-4" />
            <Box className="space-y-3">
              <FormControlLabel
                control={
                  <Switch 
                    checked={maintenanceMode} 
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    color="error"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="600">Mode maintenance</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Activer le mode maintenance pour tous les utilisateurs (sauf admins)
                    </Typography>
                  </Box>
                }
              />
              {maintenanceMode && (
                <Alert severity="warning" className="rounded-xl">
                  <Typography variant="body2">
                    <strong>Attention :</strong> En mode maintenance, seuls les administrateurs peuvent accéder à la plateforme.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Paper>

          {/* Email Configuration */}
          <Paper className="rounded-xl border border-purple-100 p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-2 rounded-lg">
                <EnvelopeIcon className="h-6 w-6 text-purple-600" />
              </div>
              <Typography variant="h6" fontWeight="bold">
                Configuration email
              </Typography>
            </div>
            <Divider className="mb-4" />
            <Box className="space-y-4">
              <TextField
                fullWidth
                label="Email de support"
                defaultValue="support@app-sante.fr"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  },
                }}
              />
              <TextField
                fullWidth
                label="Email d'expédition"
                defaultValue="noreply@app-sante.fr"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  },
                }}
              />
            </Box>
          </Paper>

          {/* Save Button */}
          <Box className="flex justify-end">
            <Button
              variant="contained"
              size="large"
              onClick={handleSaveSettings}
              sx={{
                background: 'linear-gradient(to right, #9333EA, #4F46E5)',
                '&:hover': {
                  background: 'linear-gradient(to right, #7E22CE, #4338CA)',
                },
                px: 6,
                py: 1.5,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Enregistrer les modifications
            </Button>
          </Box>
        </div>
      </Container>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Paramètres enregistrés avec succès !
        </Alert>
      </Snackbar>
    </DashboardLayout>
  )
}
