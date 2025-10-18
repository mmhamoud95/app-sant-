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
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

export default function AdminPatientsPage() {
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
              <UsersIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Gestion des patients
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Vue d&apos;ensemble des comptes patients
              </Typography>
            </div>
          </div>
        </div>

        {/* Coming Soon Message */}
        <Paper className="rounded-xl border border-purple-100 p-12">
          <Box className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl">
                <UsersIcon className="h-16 w-16 text-purple-600" />
              </div>
            </div>
            <Typography variant="h5" fontWeight="bold" className="text-gray-800 mb-3">
              Gestion des patients
            </Typography>
            <Typography variant="body1" className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Cette fonctionnalité est en cours de développement. Vous pourrez bientôt consulter la liste des patients,
              visualiser leur historique de rendez-vous et gérer leurs comptes.
            </Typography>
            <Alert severity="info" className="max-w-2xl mx-auto">
              <Typography variant="body2">
                <strong>Fonctionnalités à venir :</strong>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• Liste complète des patients inscrits</li>
                  <li>• Historique des rendez-vous par patient</li>
                  <li>• Statistiques d&apos;utilisation</li>
                  <li>• Gestion des comptes patients</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        </Paper>
      </Container>
    </DashboardLayout>
  )
}
