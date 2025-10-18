"use client"
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Paper,
  Typography,
  Container,
  Tabs,
  Tab,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import {
  ShieldCheckIcon,
  BellIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export default function SettingsPage() {
  const { status } = useSession()
  const [currentTab, setCurrentTab] = useState(0)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  })
  const [dataSharing, setDataSharing] = useState({
    analytics: true,
    research: false,
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [passwordDialog, setPasswordDialog] = useState(false)
  const [deleteDeviceDialog, setDeleteDeviceDialog] = useState<number | null>(null)

  const mockDevices = [
    {
      id: 1,
      name: 'iPhone 13',
      lastActive: 'Maintenant',
      location: 'Paris, France',
      current: true,
    },
    {
      id: 2,
      name: 'Chrome - Windows',
      lastActive: 'Il y a 2 jours',
      location: 'Lyon, France',
      current: false,
    },
  ]

  if (status !== 'authenticated') {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="info">Veuillez vous connecter pour accéder aux paramètres.</Alert>
        </Container>
      </DashboardLayout>
    )
  }

  const handlePasswordChange = () => {
    setFeedback({ type: 'success', message: 'Mot de passe modifié avec succès' })
    setPasswordDialog(false)
  }

  const handleDeviceDelete = (deviceId: number) => {
    setFeedback({ type: 'success', message: 'Appareil déconnecté avec succès' })
    setDeleteDeviceDialog(null)
  }

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-4 md:py-8 px-4 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-3 rounded-lg">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" className="font-bold text-gray-800">
                Paramètres & Sécurité
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Gérez votre compte et vos préférences
              </Typography>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Paper className="mb-6 rounded-xl border border-gray-100">
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab icon={<ShieldCheckIcon className="h-5 w-5" />} iconPosition="start" label="Sécurité" />
            <Tab icon={<BellIcon className="h-5 w-5" />} iconPosition="start" label="Notifications" />
            <Tab icon={<DevicePhoneMobileIcon className="h-5 w-5" />} iconPosition="start" label="Appareils" />
            <Tab icon={<QuestionMarkCircleIcon className="h-5 w-5" />} iconPosition="start" label="Aide" />
          </Tabs>
        </Paper>

        {/* Security Tab */}
        {currentTab === 0 && (
          <div className="space-y-6">
            {/* Password Section */}
            <Card className="border border-gray-100">
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <KeyIcon className="h-5 w-5 text-blue-600" />
                      <Typography variant="h6" className="font-semibold">
                        Mot de passe
                      </Typography>
                    </div>
                    <Typography variant="body2" className="text-gray-600">
                      Modifiez votre mot de passe pour sécuriser votre compte
                    </Typography>
                  </div>
                  <Button
                    variant="outlined"
                    onClick={() => setPasswordDialog(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="border border-gray-100">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                      <Typography variant="h6" className="font-semibold">
                        Authentification à deux facteurs (2FA)
                      </Typography>
                    </div>
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      Ajoutez une couche de sécurité supplémentaire à votre compte
                    </Typography>
                    {twoFactorEnabled && (
                      <Chip label="Activé" color="success" size="small" />
                    )}
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked)
                      setFeedback({
                        type: 'success',
                        message: e.target.checked ? '2FA activé' : '2FA désactivé',
                      })
                    }}
                  />
                </div>
                {twoFactorEnabled && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <Typography variant="body2" className="text-green-800">
                      Votre compte est protégé par l&apos;authentification à deux facteurs. Un code sera demandé lors de chaque connexion.
                    </Typography>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Privacy */}
            <Card className="border border-gray-100">
              <CardContent>
                <Typography variant="h6" className="font-semibold mb-4">
                  Confidentialité des données
                </Typography>
                <div className="space-y-3">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={dataSharing.analytics}
                        onChange={(e) =>
                          setDataSharing({ ...dataSharing, analytics: e.target.checked })
                        }
                      />
                    }
                    label={
                      <div>
                        <Typography variant="body1">Partage des données d&apos;utilisation</Typography>
                        <Typography variant="caption" className="text-gray-600">
                          Aidez-nous à améliorer l&apos;application en partageant des données anonymisées
                        </Typography>
                      </div>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={dataSharing.research}
                        onChange={(e) =>
                          setDataSharing({ ...dataSharing, research: e.target.checked })
                        }
                      />
                    }
                    label={
                      <div>
                        <Typography variant="body1">Participation à la recherche médicale</Typography>
                        <Typography variant="caption" className="text-gray-600">
                          Contribuez à la recherche en autorisant l&apos;utilisation anonyme de vos données
                        </Typography>
                      </div>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* GDPR Compliance */}
            <Card className="border border-gray-100">
              <CardContent>
                <Typography variant="h6" className="font-semibold mb-3">
                  Vos droits (RGPD)
                </Typography>
                <Typography variant="body2" className="text-gray-600 mb-4">
                  Conformément au RGPD, vous disposez de droits sur vos données personnelles :
                </Typography>
                <div className="space-y-2">
                  <Button variant="outlined" fullWidth sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                    Télécharger mes données
                  </Button>
                  <Button variant="outlined" fullWidth sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                    Demander la suppression de mes données
                  </Button>
                  <Button variant="outlined" fullWidth sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                    Corriger mes informations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {currentTab === 1 && (
          <Card className="border border-gray-100">
            <CardContent>
              <Typography variant="h6" className="font-semibold mb-4">
                Préférences de notification
              </Typography>
              <div className="space-y-4">
                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.email}
                        onChange={(e) =>
                          setNotifications({ ...notifications, email: e.target.checked })
                        }
                      />
                    }
                    label={
                      <div>
                        <Typography variant="body1">Notifications par e-mail</Typography>
                        <Typography variant="caption" className="text-gray-600">
                          Recevez des rappels de rendez-vous et des mises à jour par e-mail
                        </Typography>
                      </div>
                    }
                  />
                </div>
                <Divider />
                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.sms}
                        onChange={(e) =>
                          setNotifications({ ...notifications, sms: e.target.checked })
                        }
                      />
                    }
                    label={
                      <div>
                        <Typography variant="body1">Notifications par SMS</Typography>
                        <Typography variant="caption" className="text-gray-600">
                          Recevez des rappels importants par SMS
                        </Typography>
                      </div>
                    }
                  />
                </div>
                <Divider />
                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.push}
                        onChange={(e) =>
                          setNotifications({ ...notifications, push: e.target.checked })
                        }
                      />
                    }
                    label={
                      <div>
                        <Typography variant="body1">Notifications push</Typography>
                        <Typography variant="caption" className="text-gray-600">
                          Recevez des notifications sur votre appareil
                        </Typography>
                      </div>
                    }
                  />
                </div>
              </div>

              <Divider className="my-6" />

              <Typography variant="subtitle1" className="font-semibold mb-3">
                Types de notifications
              </Typography>
              <div className="space-y-2">
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Rappels de rendez-vous"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Nouveaux messages"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Documents disponibles"
                />
                <FormControlLabel
                  control={<Switch />}
                  label="Recommandations de santé"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices Tab */}
        {currentTab === 2 && (
          <Card className="border border-gray-100">
            <CardContent>
              <Typography variant="h6" className="font-semibold mb-4">
                Appareils connectés
              </Typography>
              <Typography variant="body2" className="text-gray-600 mb-4">
                Gérez les appareils qui ont accès à votre compte
              </Typography>
              <List>
                {mockDevices.map((device, index) => (
                  <div key={device.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <div className="flex items-center gap-2">
                            <Typography variant="subtitle1">{device.name}</Typography>
                            {device.current && (
                              <Chip label="Cet appareil" color="primary" size="small" />
                            )}
                          </div>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" className="text-gray-600">
                              {device.location}
                            </Typography>
                            <Typography variant="caption" className="text-gray-500">
                              Actif: {device.lastActive}
                            </Typography>
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        {!device.current && (
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => setDeleteDeviceDialog(device.id)}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </div>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Help Tab */}
        {currentTab === 3 && (
          <div className="space-y-6">
            {/* FAQ Card */}
            <Card className="border border-gray-100">
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" />
                  <Typography variant="h6" className="font-semibold">
                    Questions fréquentes
                  </Typography>
                </div>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemText
                        primary="Comment prendre un rendez-vous ?"
                        secondary="Cliquez sur 'Prendre rendez-vous' et recherchez un praticien..."
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemText
                        primary="Comment annuler un rendez-vous ?"
                        secondary="Allez dans 'Mes rendez-vous' et cliquez sur 'Annuler'..."
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemText
                        primary="Où trouver mes documents médicaux ?"
                        secondary="Accédez à 'Dossier médical' dans le menu..."
                      />
                    </ListItemButton>
                  </ListItem>
                </List>
                <Button
                  variant="text"
                  fullWidth
                  sx={{ textTransform: 'none', mt: 2 }}
                >
                  Voir toutes les questions
                </Button>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="border border-gray-100">
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
                  <Typography variant="h6" className="font-semibold">
                    Contacter le support
                  </Typography>
                </div>
                <Typography variant="body2" className="text-gray-600 mb-4">
                  Notre équipe est là pour vous aider
                </Typography>
                <div className="space-y-3">
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                    sx={{
                      background: 'linear-gradient(to right, #10B981, #059669)',
                      '&:hover': {
                        background: 'linear-gradient(to right, #059669, #047857)',
                      },
                      textTransform: 'none',
                    }}
                  >
                    Démarrer un chat
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ textTransform: 'none' }}
                  >
                    Envoyer un e-mail
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <Typography variant="caption" className="text-blue-800">
                    Temps de réponse moyen: 2 heures
                  </Typography>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Password Change Dialog */}
        <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
          <DialogContent>
            <div className="space-y-4 mt-2">
              <TextField
                fullWidth
                type="password"
                label="Mot de passe actuel"
                variant="outlined"
              />
              <TextField
                fullWidth
                type="password"
                label="Nouveau mot de passe"
                variant="outlined"
                helperText="Minimum 12 caractères"
              />
              <TextField
                fullWidth
                type="password"
                label="Confirmer le nouveau mot de passe"
                variant="outlined"
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialog(false)}>Annuler</Button>
            <Button variant="contained" onClick={handlePasswordChange}>
              Modifier
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Device Dialog */}
        <Dialog
          open={deleteDeviceDialog !== null}
          onClose={() => setDeleteDeviceDialog(null)}
        >
          <DialogTitle>Déconnecter cet appareil ?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Cet appareil ne pourra plus accéder à votre compte. Vous devrez vous reconnecter pour y accéder à nouveau.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDeviceDialog(null)}>Annuler</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => deleteDeviceDialog && handleDeviceDelete(deleteDeviceDialog)}
            >
              Déconnecter
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback Snackbar */}
        <Snackbar
          open={!!feedback}
          autoHideDuration={4000}
          onClose={() => setFeedback(null)}
        >
          <Alert
            onClose={() => setFeedback(null)}
            severity={feedback?.type}
            sx={{ width: '100%' }}
          >
            {feedback?.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  )
}
