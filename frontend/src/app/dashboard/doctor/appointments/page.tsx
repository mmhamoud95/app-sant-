"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  TextField,
  MenuItem,
  Box,
} from '@mui/material'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
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
    phone?: string | null
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

export default function DoctorAppointmentsPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['doctor', 'appointments', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await axios.get<AppointmentListResponse>(`/doctors/me/appointments${params}`)
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
            Vous devez vous connecter pour accéder à vos rendez-vous.
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

  return (
    <DashboardLayout userRole="doctor">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-2 rounded-lg shadow-lg">
              <CalendarDaysIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Mes rendez-vous
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Gérez tous vos rendez-vous
              </Typography>
            </div>
          </div>

          {/* Filter */}
          <Box className="flex items-center gap-3">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              label="Filtrer par statut"
            >
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value="booked">Réservé</MenuItem>
              <MenuItem value="confirmed">Confirmé</MenuItem>
              <MenuItem value="completed">Terminé</MenuItem>
              <MenuItem value="cancelled">Annulé</MenuItem>
            </TextField>
          </Box>
        </div>

        {/* Appointments List */}
        <Paper className="rounded-xl border border-gray-100 p-6">
          {isLoading && (
            <Stack spacing={2}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
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
                Aucun rendez-vous trouvé
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                {statusFilter !== 'all' 
                  ? `Aucun rendez-vous avec le statut "${statusLabels[statusFilter as AppointmentItem['status']] || statusFilter}"`
                  : "Les rendez-vous de vos patients apparaîtront ici"}
              </Typography>
            </div>
          )}

          {!isLoading && data && data.items.length > 0 && (
            <>
              <Typography variant="body2" className="text-gray-600 mb-4">
                {data.total} rendez-vous au total
              </Typography>
              <Stack spacing={3}>
                {data.items.map((appointment) => (
                  <Paper
                    key={appointment.id}
                    className="p-5 hover:shadow-md transition-shadow duration-200 border border-gray-100"
                    elevation={0}
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
                          {appointment.patient.phone && (
                            <Typography variant="body2" className="text-gray-600">
                              {appointment.patient.phone}
                            </Typography>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-gray-600">
                            <ClockIcon className="h-4 w-4" />
                            <Typography variant="body2" className="font-medium">
                              {formatDateTime(appointment.slot.start_time)}
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
                  </Paper>
                ))}
              </Stack>
            </>
          )}
        </Paper>
      </Container>
    </DashboardLayout>
  )
}
