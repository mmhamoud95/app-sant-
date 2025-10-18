"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  Card,
  CardContent,
} from '@mui/material'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

type AppointmentItem = {
  id: number
  status: 'booked' | 'confirmed' | 'cancelled' | 'completed'
  slot: {
    start_time: string
  }
}

type AppointmentListResponse = {
  items: AppointmentItem[]
  total: number
}

export default function DoctorStatsPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['doctor', 'appointments', 'stats'],
    queryFn: async () => {
      const res = await axios.get<AppointmentListResponse>('/doctors/me/appointments?limit=100')
      return res.data
    },
  })

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <Paper elevation={3} className="p-8 rounded-xl">
          <Typography variant="h5" gutterBottom className="font-bold">
            Espace praticien
          </Typography>
          <Typography color="text.secondary" className="mb-4">
            Vous devez vous connecter pour accéder à vos statistiques.
          </Typography>
          <Button variant="contained" onClick={() => signIn()}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  // Calculate statistics
  const totalAppointments = data?.total || 0
  const completedAppointments = data?.items.filter((a) => a.status === 'completed').length || 0
  const cancelledAppointments = data?.items.filter((a) => a.status === 'cancelled').length || 0
  const upcomingAppointments = data?.items.filter(
    (a) => ['booked', 'confirmed'].includes(a.status) && new Date(a.slot.start_time) > new Date()
  ).length || 0

  const completionRate = totalAppointments > 0 
    ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
    : '0.0'

  const cancellationRate = totalAppointments > 0
    ? ((cancelledAppointments / totalAppointments) * 100).toFixed(1)
    : '0.0'

  return (
    <DashboardLayout userRole="doctor">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-2 rounded-lg shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Mes statistiques
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Vue d&apos;ensemble de votre activité
              </Typography>
            </div>
          </div>
        </div>

        {isLoading && (
          <Stack spacing={3}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
            ))}
          </Stack>
        )}

        {isError && (
          <Alert severity="error" className="mb-4">
            Une erreur est survenue lors du chargement des statistiques.
          </Alert>
        )}

        {!isLoading && data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <CalendarDaysIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Typography variant="h3" fontWeight="bold" className="text-blue-700">
                        {totalAppointments}
                      </Typography>
                      <Typography variant="body2" className="text-gray-700 font-medium">
                        Total rendez-vous
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-600 p-2 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Typography variant="h3" fontWeight="bold" className="text-green-700">
                        {completedAppointments}
                      </Typography>
                      <Typography variant="body2" className="text-gray-700 font-medium">
                        Complétés
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-teal-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-teal-50 to-white">
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-teal-600 p-2 rounded-lg">
                      <ClockIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Typography variant="h3" fontWeight="bold" className="text-teal-700">
                        {upcomingAppointments}
                      </Typography>
                      <Typography variant="body2" className="text-gray-700 font-medium">
                        À venir
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-red-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-white">
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-red-600 p-2 rounded-lg">
                      <XCircleIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Typography variant="h3" fontWeight="bold" className="text-red-700">
                        {cancelledAppointments}
                      </Typography>
                      <Typography variant="body2" className="text-gray-700 font-medium">
                        Annulés
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Paper className="rounded-xl border border-gray-100 p-6">
                <Typography variant="h6" className="mb-4 font-bold">
                  Taux de complétion
                </Typography>
                <div className="flex items-end gap-2">
                  <Typography variant="h2" fontWeight="bold" className="text-green-600">
                    {completionRate}%
                  </Typography>
                </div>
                <Typography variant="body2" className="text-gray-600 mt-2">
                  {completedAppointments} consultations terminées sur {totalAppointments} au total
                </Typography>
              </Paper>

              <Paper className="rounded-xl border border-gray-100 p-6">
                <Typography variant="h6" className="mb-4 font-bold">
                  Taux d&apos;annulation
                </Typography>
                <div className="flex items-end gap-2">
                  <Typography variant="h2" fontWeight="bold" className="text-red-600">
                    {cancellationRate}%
                  </Typography>
                </div>
                <Typography variant="body2" className="text-gray-600 mt-2">
                  {cancelledAppointments} rendez-vous annulés sur {totalAppointments} au total
                </Typography>
              </Paper>
            </div>

            {/* Info Message */}
            {totalAppointments === 0 && (
              <Alert severity="info" className="mt-6">
                Aucune donnée disponible pour le moment. Vos statistiques apparaîtront ici une fois que vous aurez des rendez-vous.
              </Alert>
            )}
          </>
        )}
      </Container>
    </DashboardLayout>
  )
}
