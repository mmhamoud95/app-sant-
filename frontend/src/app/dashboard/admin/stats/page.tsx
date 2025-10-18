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
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@mui/material'
import {
  UsersIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  XCircleIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export const dynamic = 'force-dynamic'

type CancellationSummary = {
  id: number
  name: string
  cancellation_count: number
}

type AdminStatsResponse = {
  total_patients: number
  total_doctors: number
  verified_doctors: number
  pending_doctors: number
  total_appointments: number
  cancelled_appointments: number
  patient_cancellations: CancellationSummary[]
  doctor_cancellations: CancellationSummary[]
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdminStatsPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await axios.get<AdminStatsResponse>('/admin/stats')
      return res.data
    },
  })

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
          <Button 
            variant="contained" 
            onClick={() => signIn()}
            sx={{
              background: 'linear-gradient(to right, #9333EA, #4F46E5)',
              '&:hover': {
                background: 'linear-gradient(to right, #7E22CE, #4338CA)',
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
      <DashboardLayout userRole="admin">
        <Container maxWidth="lg" className="py-8">
          <Typography variant="h4" className="mb-6">Statistiques</Typography>
          <Stack spacing={2}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={200} className="rounded-xl" />
            ))}
          </Stack>
        </Container>
      </DashboardLayout>
    )
  }

  if (isError || !stats) {
    return (
      <DashboardLayout userRole="admin">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="error">
            Une erreur est survenue lors du chargement des statistiques.
          </Alert>
        </Container>
      </DashboardLayout>
    )
  }

  // Prepare chart data
  const overviewData = [
    { name: 'Patients', value: stats.total_patients, color: '#3B82F6' },
    { name: 'Praticiens', value: stats.total_doctors, color: '#10B981' },
  ]

  const doctorStatusData = [
    { name: 'Vérifiés', value: stats.verified_doctors },
    { name: 'En attente', value: stats.pending_doctors },
  ]

  const appointmentData = [
    { name: 'Total', value: stats.total_appointments, color: '#10B981' },
    { name: 'Annulés', value: stats.cancelled_appointments, color: '#EF4444' },
  ]

  return (
    <DashboardLayout userRole="admin">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Statistiques globales
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Aperçu détaillé de la plateforme
              </Typography>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-blue-700">
                    {stats.total_patients}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Patients
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-600 p-2 rounded-lg">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-green-700">
                    {stats.total_doctors}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Praticiens
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-teal-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-teal-50 to-white">
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-teal-600 p-2 rounded-lg">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h3" fontWeight="bold" className="text-teal-700">
                    {stats.total_appointments}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Rendez-vous
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
                    {stats.cancelled_appointments}
                  </Typography>
                  <Typography variant="body2" className="text-gray-700 font-medium">
                    Annulations
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Overview Chart */}
          <Paper className="p-6 rounded-xl border border-gray-100">
            <Typography variant="h6" className="mb-4 font-bold">
              Répartition des utilisateurs
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overviewData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {overviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* Doctor Status Chart */}
          <Paper className="p-6 rounded-xl border border-gray-100">
            <Typography variant="h6" className="mb-4 font-bold">
              Statut des praticiens
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={doctorStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </div>

        {/* Cancellations Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Cancellations */}
          <Paper className="rounded-xl border border-red-100">
            <Box className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
              <Typography variant="h6" className="font-bold flex items-center gap-2">
                <XCircleIcon className="h-6 w-6 text-red-600" />
                Annulations par patient
              </Typography>
              <Typography variant="body2" className="text-gray-600 mt-1">
                Top patients avec le plus d&apos;annulations
              </Typography>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {stats.patient_cancellations.length === 0 ? (
                <Box className="p-8 text-center">
                  <Typography variant="body2" className="text-gray-500">
                    Aucune annulation enregistrée
                  </Typography>
                </Box>
              ) : (
                <List>
                  {stats.patient_cancellations.map((item, index) => (
                    <div key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="600">
                              {item.name}
                            </Typography>
                          }
                          secondary={`ID: ${item.id}`}
                        />
                        <Box
                          sx={{
                            bgcolor: '#FEE2E2',
                            color: '#991B1B',
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            fontWeight: 600,
                          }}
                        >
                          {item.cancellation_count} annulation{item.cancellation_count > 1 ? 's' : ''}
                        </Box>
                      </ListItem>
                      {index < stats.patient_cancellations.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>
              )}
            </Box>
          </Paper>

          {/* Doctor Cancellations */}
          <Paper className="rounded-xl border border-orange-100">
            <Box className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
              <Typography variant="h6" className="font-bold flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-orange-600" />
                Annulations par praticien
              </Typography>
              <Typography variant="body2" className="text-gray-600 mt-1">
                Praticiens avec le plus d&apos;annulations
              </Typography>
            </Box>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {stats.doctor_cancellations.length === 0 ? (
                <Box className="p-8 text-center">
                  <Typography variant="body2" className="text-gray-500">
                    Aucune annulation enregistrée
                  </Typography>
                </Box>
              ) : (
                <List>
                  {stats.doctor_cancellations.map((item, index) => (
                    <div key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="600">
                              {item.name}
                            </Typography>
                          }
                          secondary={`ID: ${item.id}`}
                        />
                        <Box
                          sx={{
                            bgcolor: '#FED7AA',
                            color: '#92400E',
                            px: 2,
                            py: 1,
                            borderRadius: '8px',
                            fontWeight: 600,
                          }}
                        >
                          {item.cancellation_count} annulation{item.cancellation_count > 1 ? 's' : ''}
                        </Box>
                      </ListItem>
                      {index < stats.doctor_cancellations.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </div>
      </Container>
    </DashboardLayout>
  )
}
