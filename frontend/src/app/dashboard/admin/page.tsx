"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

type DoctorItem = {
  id: number
  email: string
  first_name: string
  last_name: string
  verified: boolean
  clinic_name?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  created_at: string
}

type DoctorListResponse = {
  items: DoctorItem[]
  total: number
  page: number
  limit: number
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { status, data: session } = useSession()
  const axios = useAuthedAxios()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)

  const {
    data: pendingDoctors,
    isLoading: loadingPending,
    isError: errorPending,
    refetch: refetchPending,
  } = useQuery({
    enabled: status === 'authenticated' && activeTab === 0,
    queryKey: ['admin', 'doctors', 'pending'],
    queryFn: async () => {
      const res = await axios.get<DoctorListResponse>('/admin/doctors?status=pending')
      return res.data
    },
  })

  const {
    data: verifiedDoctors,
    isLoading: loadingVerified,
    isError: errorVerified,
    refetch: refetchVerified,
  } = useQuery({
    enabled: status === 'authenticated' && activeTab === 1,
    queryKey: ['admin', 'doctors', 'verified'],
    queryFn: async () => {
      const res = await axios.get<DoctorListResponse>('/admin/doctors?status=verified')
      return res.data
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ doctorId, verified }: { doctorId: number; verified: boolean }) => {
      return axios.post(`/admin/doctors/${doctorId}/verify`, { verified })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      refetchPending()
      refetchVerified()
    },
  })

  const handleVerify = (doctorId: number, verified: boolean) => {
    verifyMutation.mutate({ doctorId, verified })
  }

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
            Vous devez vous connecter avec un compte administrateur pour accéder à cette page.
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <Container maxWidth="lg" className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <Typography variant="h4" fontWeight="bold" className="text-gray-800">
            Panneau d&apos;administration
          </Typography>
        </div>
        <Typography variant="body1" className="text-gray-600">
          Gérez les praticiens et supervisez la plateforme
        </Typography>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Paper className="p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                {pendingDoctors?.total || 0}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                En attente
              </Typography>
            </div>
          </div>
        </Paper>

        <Paper className="p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                {verifiedDoctors?.total || 0}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Vérifiés
              </Typography>
            </div>
          </div>
        </Paper>

        <Paper className="p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                {(pendingDoctors?.total || 0) + (verifiedDoctors?.total || 0)}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Total praticiens
              </Typography>
            </div>
          </div>
        </Paper>
      </div>

      {/* Tabs */}
      <Paper className="rounded-xl border border-gray-100">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              },
            }}
          >
            <Tab 
              label={`En attente (${pendingDoctors?.total || 0})`} 
              icon={<ClockIcon className="h-5 w-5" />}
              iconPosition="start"
            />
            <Tab 
              label={`Vérifiés (${verifiedDoctors?.total || 0})`}
              icon={<CheckCircleIcon className="h-5 w-5" />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Pending Doctors Tab */}
        <TabPanel value={activeTab} index={0}>
          {loadingPending && (
            <Stack spacing={2} className="p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={80} />
              ))}
            </Stack>
          )}

          {errorPending && (
            <Alert severity="error" className="m-4">
              Une erreur est survenue lors du chargement des praticiens en attente.
            </Alert>
          )}

          {!loadingPending && pendingDoctors && pendingDoctors.items.length === 0 && (
            <div className="text-center py-12">
              <Typography variant="h6" className="text-gray-500 mb-2">
                Aucun praticien en attente
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                Tous les praticiens ont été vérifiés
              </Typography>
            </div>
          )}

          {!loadingPending && pendingDoctors && pendingDoctors.items.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Praticien</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Clinique</strong></TableCell>
                    <TableCell><strong>Localisation</strong></TableCell>
                    <TableCell><strong>Date d&apos;inscription</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingDoctors.items.map((doctor) => (
                    <TableRow key={doctor.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {doctor.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {doctor.clinic_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {[doctor.city, doctor.region, doctor.country]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {formatDate(doctor.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Approuver">
                          <IconButton
                            color="success"
                            onClick={() => handleVerify(doctor.id, true)}
                            disabled={verifyMutation.isPending}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeter">
                          <IconButton
                            color="error"
                            onClick={() => handleVerify(doctor.id, false)}
                            disabled={verifyMutation.isPending}
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Verified Doctors Tab */}
        <TabPanel value={activeTab} index={1}>
          {loadingVerified && (
            <Stack spacing={2} className="p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={80} />
              ))}
            </Stack>
          )}

          {errorVerified && (
            <Alert severity="error" className="m-4">
              Une erreur est survenue lors du chargement des praticiens vérifiés.
            </Alert>
          )}

          {!loadingVerified && verifiedDoctors && verifiedDoctors.items.length === 0 && (
            <div className="text-center py-12">
              <Typography variant="h6" className="text-gray-500 mb-2">
                Aucun praticien vérifié
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                Commencez par vérifier les praticiens en attente
              </Typography>
            </div>
          )}

          {!loadingVerified && verifiedDoctors && verifiedDoctors.items.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Praticien</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Clinique</strong></TableCell>
                    <TableCell><strong>Localisation</strong></TableCell>
                    <TableCell><strong>Date d&apos;inscription</strong></TableCell>
                    <TableCell align="center"><strong>Statut</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verifiedDoctors.items.map((doctor) => (
                    <TableRow key={doctor.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {doctor.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {doctor.clinic_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {[doctor.city, doctor.region, doctor.country]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {formatDate(doctor.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="Vérifié"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon className="h-4 w-4" />}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
    </Container>
  )
}

