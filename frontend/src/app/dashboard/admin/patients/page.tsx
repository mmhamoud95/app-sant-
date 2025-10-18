"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Container,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Stack,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material'
import { useState } from 'react'
import {
  UsersIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

type PatientItem = {
  id: number
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  date_of_birth?: string | null
  created_at: string
}

type PatientListResponse = {
  items: PatientItem[]
  total: number
  page: number
  limit: number
}

export default function AdminPatientsPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: patients,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['admin', 'patients'],
    queryFn: async () => {
      const res = await axios.get<PatientListResponse>('/admin/patients')
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const filteredPatients = patients?.items.filter(patient => {
    const query = searchQuery.toLowerCase()
    return (
      patient.email.toLowerCase().includes(query) ||
      patient.first_name?.toLowerCase().includes(query) ||
      patient.last_name?.toLowerCase().includes(query) ||
      patient.phone?.includes(query)
    )
  })

  return (
    <DashboardLayout userRole="admin">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg shadow-lg">
              <UsersIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                Gestion des patients
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Vue d&apos;ensemble et gestion des comptes patients
              </Typography>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Paper className="p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <Typography variant="h3" fontWeight="bold" className="text-blue-700">
                  {patients?.total || 0}
                </Typography>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  Patients inscrits
                </Typography>
              </div>
            </div>
          </Paper>

          <Paper className="p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-600 p-2 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <Typography variant="h3" fontWeight="bold" className="text-green-700">
                  {filteredPatients?.length || 0}
                </Typography>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  Affichés
                </Typography>
              </div>
            </div>
          </Paper>

          <Paper className="p-6 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600 p-2 rounded-lg">
                <UserCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <Typography variant="h3" fontWeight="bold" className="text-purple-700">
                  {patients?.items.filter(p => p.first_name && p.last_name).length || 0}
                </Typography>
                <Typography variant="body2" className="text-gray-700 font-medium">
                  Profils complets
                </Typography>
              </div>
            </div>
          </Paper>
        </div>

        {/* Search Bar */}
        <Paper className="p-4 mb-6 rounded-xl border border-gray-100">
          <TextField
            fullWidth
            placeholder="Rechercher un patient par nom, email ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
              },
            }}
          />
        </Paper>

        {/* Patients Table */}
        <Paper className="rounded-xl border border-purple-100 shadow-md">
          <Box 
            sx={{ 
              p: 3,
              borderBottom: '1px solid #E5E7EB',
              background: 'linear-gradient(to right, rgba(147, 51, 234, 0.05), rgba(99, 102, 241, 0.05))',
            }}
          >
            <Typography variant="h6" fontWeight="700" className="text-gray-800">
              Liste des patients ({filteredPatients?.length || 0})
            </Typography>
          </Box>

          {isLoading && (
            <Stack spacing={2} className="p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={60} className="rounded-xl" />
              ))}
            </Stack>
          )}

          {isError && (
            <Alert severity="error" className="m-4 rounded-xl">
              Une erreur est survenue lors du chargement des patients.
            </Alert>
          )}

          {!isLoading && !isError && filteredPatients && filteredPatients.length === 0 && (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 p-4 rounded-full">
                  <UsersIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <Typography variant="h6" className="text-gray-500 mb-2 font-semibold">
                Aucun patient trouvé
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                {searchQuery ? 'Essayez une autre recherche' : 'Aucun patient inscrit pour le moment'}
              </Typography>
            </div>
          )}

          {!isLoading && !isError && filteredPatients && filteredPatients.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                    <TableCell><Typography variant="body2" fontWeight="700">Patient</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight="700">Email</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight="700">Téléphone</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight="700">Date de naissance</Typography></TableCell>
                    <TableCell><Typography variant="body2" fontWeight="700">Date d&apos;inscription</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" fontWeight="700">Statut</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow 
                      key={patient.id} 
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(147, 51, 234, 0.05)',
                        },
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 rounded-lg">
                            <UserCircleIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <Typography variant="body2" fontWeight="600" className="text-gray-800">
                            {patient.first_name && patient.last_name 
                              ? `${patient.first_name} ${patient.last_name}`
                              : 'Non renseigné'}
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          <Typography variant="body2" className="text-gray-600">
                            {patient.email}
                          </Typography>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {patient.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {patient.date_of_birth 
                            ? new Date(patient.date_of_birth).toLocaleDateString('fr-FR')
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {formatDate(patient.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={patient.first_name && patient.last_name ? "Complet" : "Incomplet"}
                          size="small"
                          sx={{
                            backgroundColor: patient.first_name && patient.last_name ? '#D1FAE5' : '#FEF3C7',
                            color: patient.first_name && patient.last_name ? '#065F46' : '#92400E',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
    </DashboardLayout>
  )
}
