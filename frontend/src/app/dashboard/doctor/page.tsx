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
  Chip,
} from '@mui/material'
import {
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

type AppointmentItem = {
  id: number
  status: 'booked' | 'confirmed' | 'cancelled' | 'completed'
  reason?: string | null
  created_at: string
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  slot: {
    id: number
    start_time: string
    end_time: string
  }
}

type AppointmentListResponse = {
  items: AppointmentItem[]
  total: number
  page: number
  limit: number
}

export default function DoctorDashboardPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['doctor', 'appointments'],
    queryFn: async () => {
      const res = await axios.get<AppointmentListResponse>('/doctors/me/appointments')
      return res.data
    },
  })

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <Paper elevation={3} className="p-8 rounded-xl">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <Typography variant="h5" gutterBottom className="font-bold">
            Espace praticien
          </Typography>
          <Typography color="text.secondary" className="mb-4">
            Vous devez vous connecter pour accéder à votre espace praticien.
          </Typography>
          <Button variant="contained" onClick={() => signIn()}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    })

  const statusColors: Record<AppointmentItem['status'], 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    booked: 'info',
    confirmed: 'success',
    cancelled: 'error',
    completed: 'default',
  }

  const statusLabels: Record<AppointmentItem['status'], string> = {
    booked: 'Réservé',
    confirmed: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé',
  }

  // Calculate stats
  const upcomingAppointments = data?.items.filter(
    (a) => ['booked', 'confirmed'].includes(a.status)
  ).length || 0

  const todayAppointments = data?.items.filter((a) => {
    const slotDate = new Date(a.slot.start_time)
    const today = new Date()
    return (
      slotDate.toDateString() === today.toDateString() &&
      ['booked', 'confirmed'].includes(a.status)
    )
  }).length || 0

  const completedAppointments = data?.items.filter(
    (a) => a.status === 'completed'
  ).length || 0

  return (
    <Container maxWidth="lg" className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-2 rounded-lg">
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
          </div>
          <Typography variant="h4" fontWeight="bold" className="text-gray-800">
            Tableau de bord praticien
          </Typography>
        </div>
        <Typography variant="body1" className="text-gray-600">
          Gérez vos consultations et votre planning
        </Typography>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border border-gray-100 shadow-sm">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  {todayAppointments}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Aujourd&apos;hui
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <ClockIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  {upcomingAppointments}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  À venir
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  {completedAppointments}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Complétés
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Paper className="rounded-xl border border-gray-100 p-6">
        <Typography variant="h6" className="mb-4 font-bold flex items-center gap-2">
          <UserIcon className="h-6 w-6 text-green-600" />
          Prochains rendez-vous
        </Typography>

        {isLoading && (
          <Stack spacing={2}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={100} />
            ))}
          </Stack>
        )}

        {isError && (
          <Alert severity="error" className="mb-4">
            Une erreur est survenue lors du chargement des rendez-vous.
          </Alert>
        )}

        {!isLoading && data && data.items.length === 0 && (
          <div className="text-center py-12">
            <Typography variant="h6" className="text-gray-500 mb-2">
              Aucun rendez-vous
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              Vos prochains rendez-vous apparaîtront ici
            </Typography>
          </div>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <Stack spacing={3}>
            {data.items
              .filter((a) => ['booked', 'confirmed'].includes(a.status))
              .map((appointment) => (
                <Paper
                  key={appointment.id}
                  className="p-4 hover:shadow-md transition-shadow duration-200 border border-gray-100"
                  elevation={0}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Typography variant="h6" className="font-semibold text-gray-800">
                        {appointment.patient.first_name} {appointment.patient.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(appointment.slot.start_time)}
                      </Typography>
                    </div>
                    <Chip
                      label={statusLabels[appointment.status]}
                      color={statusColors[appointment.status]}
                      size="small"
                    />
                  </div>

                  {appointment.reason && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <Typography variant="body2" className="text-gray-700">
                        <strong>Motif :</strong> {appointment.reason}
                      </Typography>
                    </div>
                  )}
                </Paper>
              ))}
          </Stack>
        )}
      </Paper>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Paper className="p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <Typography variant="h6" className="font-semibold">
              Gérer mes disponibilités
            </Typography>
          </div>
          <Typography variant="body2" className="text-gray-600 mb-4">
            Définissez vos créneaux horaires et gérez votre calendrier
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            sx={{
              borderColor: '#10B981',
              color: '#10B981',
              '&:hover': {
                borderColor: '#059669',
                backgroundColor: '#D1FAE5',
              },
            }}
          >
            Configurer
          </Button>
        </Paper>

        <Paper className="p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <Typography variant="h6" className="font-semibold">
              Mon profil
            </Typography>
          </div>
          <Typography variant="body2" className="text-gray-600 mb-4">
            Mettez à jour vos informations professionnelles
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            sx={{
              borderColor: '#3B82F6',
              color: '#3B82F6',
              '&:hover': {
                borderColor: '#2563EB',
                backgroundColor: '#DBEAFE',
              },
            }}
          >
            Modifier
          </Button>
        </Paper>
      </div>
    </Container>
  )
}
