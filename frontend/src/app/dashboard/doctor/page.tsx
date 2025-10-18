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
import DashboardLayout from '@/components/DashboardLayout'

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
          <Button 
            variant="contained" 
            onClick={() => signIn()}
            sx={{
              background: 'linear-gradient(to right, #10B981, #059669)',
              '&:hover': {
                background: 'linear-gradient(to right, #059669, #047857)',
              },
            }}
          >
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

  // Get today's appointments for detailed view
  const todayAppointmentsList = data?.items.filter((a) => {
    const slotDate = new Date(a.slot.start_time)
    const today = new Date()
    return (
      slotDate.toDateString() === today.toDateString() &&
      ['booked', 'confirmed'].includes(a.status)
    )
  }) || []

  const nextWeekAppointments = data?.items.filter((a) => {
    const slotDate = new Date(a.slot.start_time)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return (
      slotDate > today &&
      slotDate <= nextWeek &&
      ['booked', 'confirmed'].includes(a.status)
    )
  }) || []

  return (
    <DashboardLayout userRole="doctor">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-2 rounded-lg shadow-lg">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Tableau de bord praticien
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-600 p-2 rounded-lg">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-green-700">
                    {todayAppointments}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Aujourd&apos;hui
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-blue-700">
                    {nextWeekAppointments.length}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Cette semaine
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-teal-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-teal-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-teal-600 p-2 rounded-lg">
                  <UserIcon className="h-6 w-6 text-white" />
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

          <Card className="border border-purple-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-purple-700">
                    {completedAppointments}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Complétés
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments - Highlighted */}
        {todayAppointmentsList.length > 0 && (
          <Paper className="rounded-xl border border-green-200 p-6 mb-8 bg-gradient-to-br from-green-50 to-white">
            <Typography variant="h6" className="mb-4 font-bold flex items-center gap-2">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
              Consultations d&apos;aujourd&apos;hui
            </Typography>
            <Stack spacing={3}>
              {todayAppointmentsList.map((appointment) => (
                <Paper
                  key={appointment.id}
                  className="p-5 hover:shadow-lg transition-all duration-200 border border-green-100 bg-white"
                  elevation={1}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-gradient-to-br from-green-100 to-green-50 p-3 rounded-lg">
                        <UserIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <Typography variant="h6" className="font-semibold text-gray-800">
                          {appointment.patient.first_name} {appointment.patient.last_name}
                        </Typography>
                        <div className="flex items-center gap-2 mt-1 text-gray-600">
                          <ClockIcon className="h-4 w-4" />
                          <Typography variant="body2" className="font-medium">
                            {new Date(appointment.slot.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(appointment.slot.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </div>
                      </div>
                    </div>
                    <Chip
                      label={statusLabels[appointment.status]}
                      color={statusColors[appointment.status]}
                      size="small"
                    />
                  </div>

                  {appointment.reason && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <Typography variant="body2" className="text-gray-700">
                        <strong>Motif de consultation :</strong> {appointment.reason}
                      </Typography>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        background: 'linear-gradient(to right, #10B981, #059669)',
                        '&:hover': {
                          background: 'linear-gradient(to right, #059669, #047857)',
                        },
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Voir le dossier
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: '#10B981',
                        color: '#10B981',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#059669',
                          backgroundColor: '#D1FAE5',
                        },
                      }}
                    >
                      Confirmer
                    </Button>
                  </div>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {/* All Upcoming Appointments */}
        <Paper className="rounded-xl border border-gray-100 p-6">
          <Typography variant="h6" className="mb-4 font-bold flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-green-600" />
            Prochains rendez-vous
          </Typography>

          {isLoading && (
            <Stack spacing={2}>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={100} className="rounded-xl" />
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
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 p-4 rounded-full">
                  <CalendarDaysIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <Typography variant="h6" className="text-gray-500 mb-2">
                Aucun rendez-vous prévu
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                Les rendez-vous de vos patients apparaîtront ici
              </Typography>
            </div>
          )}

          {!isLoading && data && data.items.length > 0 && (
            <Stack spacing={3}>
              {data.items
                .filter((a) => {
                  const slotDate = new Date(a.slot.start_time)
                  const today = new Date()
                  return (
                    ['booked', 'confirmed'].includes(a.status) &&
                    slotDate.toDateString() !== today.toDateString()
                  )
                })
                .slice(0, 10)
                .map((appointment) => (
                  <Paper
                    key={appointment.id}
                    className="p-5 hover:shadow-md transition-shadow duration-200 border border-gray-100"
                    elevation={0}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-3 rounded-lg">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <Typography variant="h6" className="font-semibold text-gray-800">
                            {appointment.patient.first_name} {appointment.patient.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" className="mt-1">
                            {formatDateTime(appointment.slot.start_time)}
                          </Typography>
                        </div>
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
      </Container>
    </DashboardLayout>
  )
}
