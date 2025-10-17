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
} from '@mui/material'

type AppointmentItem = {
  id: number
  status: 'booked' | 'confirmed' | 'cancelled' | 'completed'
  reason?: string | null
  created_at: string
  updated_at: string
  cancelled_at?: string | null
  doctor: {
    id: number
    first_name: string
    last_name: string
    clinic_name?: string | null
    city?: string | null
  }
  slot: {
    id: number
    start_time: string
    end_time: string
    status: string
  }
}

type AppointmentListResponse = {
  items: AppointmentItem[]
  total: number
  page: number
  limit: number
}

export const dynamic = 'force-dynamic'

export default function PatientDashboardPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['me', 'appointments'],
    queryFn: async () => {
      const res = await axios.get<AppointmentListResponse>(
        '/patients/me/appointments'
      )
      return res.data
    },
  })

  if (status === 'unauthenticated') {
    return (
      <main className="p-6 max-w-5xl mx-auto text-center">
        <Typography variant="h6" gutterBottom>
          Espace patient
        </Typography>
        <Typography color="text.secondary" className="mb-4">
          Vous devez vous connecter pour voir vos rendez-vous.
        </Typography>
        <Button variant="contained" onClick={() => signIn()}>
          Se connecter
        </Button>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <Typography variant="h5" className="mb-4">
          Mes rendez-vous
        </Typography>
        <Stack spacing={2}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={100} />
          ))}
        </Stack>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <Alert severity="error" className="mb-4">
          Une erreur est survenue lors du chargement des rendez-vous.
        </Alert>
        <Button variant="outlined" onClick={() => refetch()}>
          Réessayer
        </Button>
      </main>
    )
  }

  const formatDate = (iso: string) =>
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

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <Typography variant="h5" className="mb-4">
        Mes rendez-vous
      </Typography>

      <Stack spacing={2}>
        {data?.items.map((a) => (
          <Paper
            key={a.id}
            className="p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-center mb-1">
              <Typography variant="h6">
                Dr {a.doctor.first_name} {a.doctor.last_name}
              </Typography>
              <Chip
                label={a.status.toUpperCase()}
                color={statusColors[a.status]}
                size="small"
              />
            </div>

            <Typography variant="body2" color="text.secondary">
              {formatDate(a.slot.start_time)} — {a.doctor.city || 'Ville inconnue'}
            </Typography>

            {a.reason && (
              <Typography variant="body2" className="mt-2">
                <strong>Motif :</strong> {a.reason}
              </Typography>
            )}
          </Paper>
        ))}

        {data && data.items.length === 0 && (
          <Typography className="mt-4 text-center" color="text.secondary">
            Vous n&apos;avez pas encore de rendez-vous.
          </Typography>
        )}
      </Stack>
    </main>
  )
}
