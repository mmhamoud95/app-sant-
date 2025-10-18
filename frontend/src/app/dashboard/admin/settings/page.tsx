"use client"
import { useSession, signIn } from 'next-auth/react'
import {
  Paper,
  Typography,
  Container,
  Button,
  Alert,
  Box,
} from '@mui/material'
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

export default function AdminSettingsPage() {
  const { status } = useSession()

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
          <Button variant="contained" onClick={() => signIn()}>
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
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
              <Cog6ToothIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Paramètres
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Configuration de la plateforme
              </Typography>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <Paper className="rounded-xl border border-purple-100 p-12">
          <Box className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl">
                <Cog6ToothIcon className="h-16 w-16 text-purple-600" />
              </div>
            </div>
            <Typography variant="h5" fontWeight="bold" className="text-gray-800 mb-3">
              Paramètres système
            </Typography>
            <Typography variant="body1" className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Cette section est en cours de développement. Vous pourrez bientôt configurer
              les paramètres globaux de la plateforme, gérer les permissions et personnaliser
              l&apos;expérience utilisateur.
            </Typography>
            <Alert severity="info" className="max-w-2xl mx-auto">
              <Typography variant="body2">
                <strong>Paramètres à venir :</strong>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Configuration générale de la plateforme</li>
                  <li>• Gestion des rôles et permissions</li>
                  <li>• Paramètres de sécurité et conformité</li>
                  <li>• Notifications et alertes système</li>
                  <li>• Personnalisation de l&apos;interface</li>
                  <li>• Intégrations tierces</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        </Paper>
      </Container>
    </DashboardLayout>
  )
}
