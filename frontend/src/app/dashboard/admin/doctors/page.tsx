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
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

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

export default function AdminDoctorsPage() {
  const { status } = useSession()
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <DashboardLayout userRole="admin">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Gestion des praticiens
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Vérifiez et gérez les comptes praticiens
              </Typography>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Paper className="p-4 rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-white">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-yellow-700">
                  {pendingDoctors?.total || 0}
                </Typography>
                <Typography variant="body2" className="text-gray-700">
                  En attente
                </Typography>
              </div>
            </div>
          </Paper>

          <Paper className="p-4 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-green-700">
                  {verifiedDoctors?.total || 0}
                </Typography>
                <Typography variant="body2" className="text-gray-700">
                  Vérifiés
                </Typography>
              </div>
            </div>
          </Paper>

          <Paper className="p-4 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center gap-3">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-purple-600" />
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-purple-700">
                  {(pendingDoctors?.total || 0) + (verifiedDoctors?.total || 0)}
                </Typography>
                <Typography variant="body2" className="text-gray-700">
                  Total
                </Typography>
              </div>
            </div>
          </Paper>
        </div>

        {/* Tabs */}
        <Paper className="rounded-xl border border-purple-100 shadow-md">
          <Box 
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              background: 'linear-gradient(to right, rgba(147, 51, 234, 0.05), rgba(99, 102, 241, 0.05))',
            }}
          >
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: '64px',
                },
                '& .Mui-selected': {
                  color: '#9333EA',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#9333EA',
                  height: '3px',
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
                  <Skeleton key={i} variant="rectangular" height={80} className="rounded-xl" />
                ))}
              </Stack>
            )}

            {errorPending && (
              <Alert severity="error" className="m-4 rounded-xl">
                Une erreur est survenue lors du chargement des praticiens en attente.
              </Alert>
            )}

            {!loadingPending && pendingDoctors && pendingDoctors.items.length === 0 && (
              <div className="text-center py-16">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircleIcon className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <Typography variant="h6" className="text-gray-500 mb-2 font-semibold">
                  Aucun praticien en attente
                </Typography>
                <Typography variant="body2" className="text-gray-400">
                  Tous les praticiens ont été vérifiés ✓
                </Typography>
              </div>
            )}

            {!loadingPending && pendingDoctors && pendingDoctors.items.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                      <TableCell><Typography variant="body2" fontWeight="700">Praticien</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Email</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Clinique</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Localisation</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Date d&apos;inscription</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight="700">Actions</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingDoctors.items.map((doctor) => (
                      <TableRow 
                        key={doctor.id} 
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(147, 51, 234, 0.05)',
                          },
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-2 rounded-lg">
                              <UserIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <Typography variant="body2" fontWeight="600" className="text-gray-800">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </Typography>
                          </div>
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
                              onClick={() => handleVerify(doctor.id, true)}
                              disabled={verifyMutation.isPending}
                              sx={{
                                color: '#10B981',
                                '&:hover': {
                                  backgroundColor: '#D1FAE5',
                                },
                              }}
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rejeter">
                            <IconButton
                              onClick={() => handleVerify(doctor.id, false)}
                              disabled={verifyMutation.isPending}
                              sx={{
                                color: '#EF4444',
                                '&:hover': {
                                  backgroundColor: '#FEE2E2',
                                },
                              }}
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
                  <Skeleton key={i} variant="rectangular" height={80} className="rounded-xl" />
                ))}
              </Stack>
            )}

            {errorVerified && (
              <Alert severity="error" className="m-4 rounded-xl">
                Une erreur est survenue lors du chargement des praticiens vérifiés.
              </Alert>
            )}

            {!loadingVerified && verifiedDoctors && verifiedDoctors.items.length === 0 && (
              <div className="text-center py-16">
                <div className="flex justify-center mb-4">
                  <div className="bg-yellow-100 p-4 rounded-full">
                    <ClockIcon className="h-12 w-12 text-yellow-600" />
                  </div>
                </div>
                <Typography variant="h6" className="text-gray-500 mb-2 font-semibold">
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
                    <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                      <TableCell><Typography variant="body2" fontWeight="700">Praticien</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Email</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Clinique</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Localisation</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight="700">Date d&apos;inscription</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2" fontWeight="700">Statut</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {verifiedDoctors.items.map((doctor) => (
                      <TableRow 
                        key={doctor.id} 
                        hover
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                          },
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-green-100 to-green-50 p-2 rounded-lg">
                              <UserIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <Typography variant="body2" fontWeight="600" className="text-gray-800">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </Typography>
                          </div>
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
                            label="✓ Vérifié"
                            size="small"
                            sx={{
                              backgroundColor: '#D1FAE5',
                              color: '#065F46',
                              fontWeight: 600,
                            }}
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
    </DashboardLayout>
  )
}
