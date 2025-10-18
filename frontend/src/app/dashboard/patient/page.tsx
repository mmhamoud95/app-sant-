"use client"
import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material'
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  UserIcon,
  PlusCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

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
  const queryClient = useQueryClient()
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; appointment?: AppointmentItem }>({ open: false })
  const [cancelReason, setCancelReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: number; reason?: string }) => {
      const payload = reason?.trim() ? { reason: reason.trim() } : {}
      const res = await axios.post(`/patients/me/appointments/${appointmentId}/cancel`, payload)
      return res.data
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Rendez-vous annulé avec succès.' })
      setCancelDialog({ open: false })
      setCancelReason('')
      queryClient.invalidateQueries({ queryKey: ['me', 'appointments'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Impossible d'annuler le rendez-vous pour le moment."
      setFeedback({ type: 'error', message })
    },
  })

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <Paper elevation={3} className="p-8 rounded-xl">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <Typography variant="h5" gutterBottom className="font-bold">
            Espace Patient
          </Typography>
          <Typography color="text.secondary" className="mb-4">
            Vous devez vous connecter pour accéder à vos rendez-vous.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => signIn()}
            sx={{
              background: 'linear-gradient(to right, #2563EB, #3B82F6)',
              '&:hover': {
                background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
              },
            }}
          >
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <div className="mb-8">
            <Skeleton variant="rectangular" height={80} className="rounded-xl mb-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={100} className="rounded-xl" />
            ))}
          </div>
          <Skeleton variant="rectangular" height={300} className="rounded-xl" />
        </Container>
      </DashboardLayout>
    )
  }

  if (isError) {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="error" className="mb-4">
            <Typography variant="h6" className="mb-2">Erreur de chargement</Typography>
            <Typography variant="body2">
              {error?.message || "Une erreur est survenue lors du chargement des rendez-vous."}
            </Typography>
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => refetch()}
            sx={{
              background: 'linear-gradient(to right, #2563EB, #3B82F6)',
              '&:hover': {
                background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
              },
            }}
          >
            Réessayer
          </Button>
        </Container>
      </DashboardLayout>
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

  const statusLabels: Record<AppointmentItem['status'], string> = {
    booked: 'Réservé',
    confirmed: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé',
  }

  // Calculate stats
  const upcomingAppointments = data?.items.filter(
    (a) => ['booked', 'confirmed'].includes(a.status) && new Date(a.slot.start_time) > new Date()
  ) || []

  const completedAppointments = data?.items.filter(
    (a) => a.status === 'completed'
  ).length || 0

  const cancelledAppointments = data?.items.filter(
    (a) => a.status === 'cancelled'
  ).length || 0

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-4 md:py-8 px-4 md:px-6">
      {/* Welcome Banner */}
      <Paper className="mb-6 md:mb-8 p-6 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-2 rounded-lg shadow-md">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <Typography variant="h4" fontWeight="bold" className="text-gray-800">
              Bonjour 👋
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              Gérez vos rendez-vous médicaux en toute simplicité
            </Typography>
          </div>
        </div>
      </Paper>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="border border-gray-100 shadow-sm">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  {upcomingAppointments.length}
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
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
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

        <Card className="border border-gray-100 shadow-sm">
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  {cancelledAppointments}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Annulés
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <Link href="/search" className="no-underline">
          <Paper className="p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer h-full group">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                <PlusCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <Typography variant="h6" className="font-semibold group-hover:text-blue-600 transition-colors">
                Prendre rendez-vous
              </Typography>
            </div>
            <Typography variant="body2" className="text-gray-600">
              Trouvez un praticien et réservez votre consultation
            </Typography>
          </Paper>
        </Link>

        <Link href="/dashboard/patient/profile" className="no-underline">
          <Paper className="p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer h-full group">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                <UserIcon className="h-6 w-6 text-purple-600" />
              </div>
              <Typography variant="h6" className="font-semibold group-hover:text-purple-600 transition-colors">
                Mon profil
              </Typography>
            </div>
            <Typography variant="body2" className="text-gray-600">
              Gérez vos informations personnelles
            </Typography>
          </Paper>
        </Link>
      </div>

      {/* Appointments List */}
      <Paper className="rounded-xl border border-gray-100 p-6">
        <Typography variant="h6" className="mb-4 font-bold flex items-center gap-2">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          Mes prochains rendez-vous
        </Typography>

        {data && upcomingAppointments.length === 0 && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="bg-gray-100 p-4 rounded-full">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <Typography variant="h6" className="text-gray-500 mb-2">
              Aucun rendez-vous à venir
            </Typography>
            <Typography variant="body2" className="text-gray-400 mb-4">
              Prenez rendez-vous avec un praticien pour commencer
            </Typography>
            <Link href="/search" className="no-underline">
              <Button
                variant="contained"
                startIcon={<PlusCircleIcon className="h-5 w-5" />}
                sx={{
                  background: 'linear-gradient(to right, #2563EB, #3B82F6)',
                  '&:hover': {
                    background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
                  },
                  textTransform: 'none',
                }}
              >
                Trouver un praticien
              </Button>
            </Link>
          </div>
        )}

        {upcomingAppointments.length > 0 && (
          <Stack spacing={3}>
            {upcomingAppointments.map((appointment) => (
              <Paper
                key={appointment.id}
                className="p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200 border border-gray-100"
                elevation={0}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-lg">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <Typography variant="h6" className="font-semibold text-gray-800">
                        Dr {appointment.doctor.first_name} {appointment.doctor.last_name}
                      </Typography>
                      <div className="flex items-center gap-2 mt-1 text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        <Typography variant="body2">
                          {formatDate(appointment.slot.start_time)}
                        </Typography>
                      </div>
                      {appointment.doctor.city && (
                        <div className="flex items-center gap-2 mt-1 text-gray-600">
                          <MapPinIcon className="h-4 w-4" />
                          <Typography variant="body2">
                            {appointment.doctor.city}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </div>
                  <Chip
                    label={statusLabels[appointment.status]}
                    color={statusColors[appointment.status]}
                    size="small"
                  />
                </div>

                {appointment.reason && (
                  <>
                    <Divider className="my-3" />
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Typography variant="body2" className="text-gray-700">
                        <strong>Motif de consultation :</strong> {appointment.reason}
                      </Typography>
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => setCancelDialog({ open: true, appointment })}
                    disabled={cancelAppointmentMutation.isPending || appointment.status === 'cancelled'}
                    sx={{
                      textTransform: 'none',
                    }}
                  >
                    {appointment.status === 'cancelled' ? 'Annulé' : 'Annuler'}
                  </Button>
                </div>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Past Appointments Section */}
        {(completedAppointments > 0 || cancelledAppointments > 0) && (
          <>
            <Divider className="my-6" />
            <Typography variant="h6" className="mb-4 font-bold flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-gray-600" />
              Historique
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {completedAppointments > 0 && (
                <Paper className="p-4 border border-green-100 bg-green-50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <Typography variant="h5" className="font-bold text-green-800">
                      {completedAppointments}
                    </Typography>
                  </div>
                  <Typography variant="body2" className="text-green-700">
                    Consultation{completedAppointments > 1 ? 's' : ''} terminée{completedAppointments > 1 ? 's' : ''}
                  </Typography>
                </Paper>
              )}
              {cancelledAppointments > 0 && (
                <Paper className="p-4 border border-red-100 bg-red-50">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                    <Typography variant="h5" className="font-bold text-red-800">
                      {cancelledAppointments}
                    </Typography>
                  </div>
                  <Typography variant="body2" className="text-red-700">
                    Rendez-vous annulé{cancelledAppointments > 1 ? 's' : ''}
                  </Typography>
                </Paper>
              )}
            </div>
            
            {/* Show past appointments */}
            <Stack spacing={2}>
              {data?.items
                .filter(a => ['completed', 'cancelled'].includes(a.status))
                .slice(0, 3)
                .map((appointment) => (
                  <Paper
                    key={appointment.id}
                    className="p-4 border border-gray-100 opacity-75"
                    elevation={0}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          appointment.status === 'completed' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {appointment.status === 'completed' ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <Typography variant="body1" className="font-semibold text-gray-700">
                            Dr {appointment.doctor.first_name} {appointment.doctor.last_name}
                          </Typography>
                          <div className="flex items-center gap-2 mt-1 text-gray-600">
                            <ClockIcon className="h-4 w-4" />
                            <Typography variant="body2">
                              {formatDate(appointment.slot.start_time)}
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
                  </Paper>
                ))}
            </Stack>
            
            {(data?.items.filter(a => ['completed', 'cancelled'].includes(a.status)).length || 0) > 3 && (
              <div className="text-center mt-4">
                <Typography variant="body2" className="text-gray-500">
                  Et {(data?.items.filter(a => ['completed', 'cancelled'].includes(a.status)).length || 0) - 3} autre{(data?.items.filter(a => ['completed', 'cancelled'].includes(a.status)).length || 0) - 3 > 1 ? 's' : ''} rendez-vous
                </Typography>
              </div>
            )}
          </>
        )}
      </Paper>
    </Container>

    <Dialog
      open={cancelDialog.open}
      onClose={() => {
        if (!cancelAppointmentMutation.isPending) {
          setCancelDialog({ open: false })
          setCancelReason('')
        }
      }}
    >
      <DialogTitle>Annuler le rendez-vous</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {cancelDialog.appointment && (
          <Stack spacing={1} className="mb-3">
            <Typography variant="subtitle1" fontWeight={600}>
              Dr {cancelDialog.appointment.doctor.first_name} {cancelDialog.appointment.doctor.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(cancelDialog.appointment.slot.start_time)}
            </Typography>
          </Stack>
        )}
        <Typography variant="body2" className="mb-3">
          Confirmez-vous l&apos;annulation de ce rendez-vous ? Vous pouvez indiquer un motif (optionnel).
        </Typography>
        <TextField
          label="Motif (optionnel)"
          fullWidth
          multiline
          minRows={2}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          disabled={cancelAppointmentMutation.isPending}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            setCancelDialog({ open: false })
            setCancelReason('')
          }}
          disabled={cancelAppointmentMutation.isPending}
        >
          Retour
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => {
            if (!cancelDialog.appointment) return
            cancelAppointmentMutation.mutate({
              appointmentId: cancelDialog.appointment.id,
              reason: cancelReason,
            })
          }}
          disabled={cancelAppointmentMutation.isPending}
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>

    <Snackbar
      open={!!feedback}
      autoHideDuration={6000}
      onClose={() => setFeedback(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {feedback ? (
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback.type}
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      ) : undefined}
    </Snackbar>
    </DashboardLayout>
  )
}
