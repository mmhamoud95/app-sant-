"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

type AvailabilityRule = {
  id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
}

type AvailabilityException = {
  id: string
  date: string
  is_closed: boolean
  reason?: string | null
}

type AvailabilityResponse = {
  rules: AvailabilityRule[]
  exceptions: AvailabilityException[]
}

const weekdayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function DoctorAvailabilityPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['doctor', 'availability'],
    queryFn: async () => {
      const res = await axios.get<AvailabilityResponse>('/doctors/me/availability')
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await axios.delete(`/doctors/me/availability/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'availability'] })
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
            Vous devez vous connecter pour gérer vos disponibilités.
          </Typography>
          <Button variant="contained" onClick={() => signIn()}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  const handleDelete = (itemId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette disponibilité ?')) {
      deleteMutation.mutate(itemId)
    }
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Extract HH:MM from HH:MM:SS
  }

  return (
    <DashboardLayout userRole="doctor">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-green-500 p-2 rounded-lg shadow-lg">
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  Mes disponibilités
                </Typography>
                <Typography variant="body1" className="text-gray-600">
                  Définissez vos horaires de consultation
                </Typography>
              </div>
            </div>
            <Button
              variant="contained"
              startIcon={<PlusIcon className="h-5 w-5" />}
              sx={{
                background: 'linear-gradient(to right, #10B981, #059669)',
                '&:hover': {
                  background: 'linear-gradient(to right, #059669, #047857)',
                },
              }}
            >
              Ajouter une disponibilité
            </Button>
          </div>
        </div>

        {isLoading && (
          <Stack spacing={3}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
            ))}
          </Stack>
        )}

        {isError && (
          <Alert severity="error" className="mb-4">
            Une erreur est survenue lors du chargement des disponibilités.
          </Alert>
        )}

        {!isLoading && data && (
          <div className="grid grid-cols-1 gap-6">
            {/* Recurring Rules */}
            <Paper className="rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="h-6 w-6 text-green-600" />
                <Typography variant="h6" fontWeight="bold">
                  Horaires récurrents
                </Typography>
              </div>

              {data.rules.length === 0 ? (
                <div className="text-center py-8">
                  <Typography variant="body2" className="text-gray-500 mb-2">
                    Aucune disponibilité récurrente définie
                  </Typography>
                  <Typography variant="body2" className="text-gray-400">
                    Ajoutez vos horaires de consultation hebdomadaires
                  </Typography>
                </div>
              ) : (
                <Stack spacing={2}>
                  {data.rules.map((rule) => (
                    <Paper
                      key={rule.id}
                      className="p-4 border border-green-100 hover:shadow-md transition-shadow"
                      elevation={0}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Chip
                            label={weekdayNames[rule.weekday]}
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-5 w-5 text-gray-500" />
                            <Typography variant="body1" className="font-medium">
                              {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                            </Typography>
                          </div>
                          <Chip
                            label={`${rule.slot_minutes} min/créneau`}
                            size="small"
                            sx={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
                          />
                        </div>
                        <Tooltip title="Supprimer">
                          <IconButton
                            onClick={() => handleDelete(rule.id)}
                            disabled={deleteMutation.isPending}
                            color="error"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>

            {/* Exceptions */}
            <Paper className="rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="h-6 w-6 text-orange-600" />
                <Typography variant="h6" fontWeight="bold">
                  Exceptions et fermetures
                </Typography>
              </div>

              {data.exceptions.length === 0 ? (
                <div className="text-center py-8">
                  <Typography variant="body2" className="text-gray-500 mb-2">
                    Aucune exception définie
                  </Typography>
                  <Typography variant="body2" className="text-gray-400">
                    Ajoutez des fermetures exceptionnelles (congés, jours fériés, etc.)
                  </Typography>
                </div>
              ) : (
                <Stack spacing={2}>
                  {data.exceptions.map((exception) => (
                    <Paper
                      key={exception.id}
                      className="p-4 border border-orange-100 hover:shadow-md transition-shadow"
                      elevation={0}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Chip
                            label={new Date(exception.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                            color={exception.is_closed ? 'error' : 'warning'}
                            variant="outlined"
                          />
                          {exception.reason && (
                            <Typography variant="body2" className="text-gray-600">
                              {exception.reason}
                            </Typography>
                          )}
                          {exception.is_closed && (
                            <Chip
                              label="Fermé"
                              size="small"
                              color="error"
                            />
                          )}
                        </div>
                        <Tooltip title="Supprimer">
                          <IconButton
                            onClick={() => handleDelete(exception.id)}
                            disabled={deleteMutation.isPending}
                            color="error"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </div>
        )}
      </Container>
    </DashboardLayout>
  )
}
