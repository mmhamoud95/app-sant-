"use client"
import { useSession, signIn } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query'
import {
  Paper,
  Typography,
  Stack,
  Skeleton,
  Alert,
  Button,
  Container,
  TextField,
  Box,
} from '@mui/material'
import {
  UserIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

type PatientProfile = {
  user_id: number
  first_name: string
  last_name: string
  phone?: string | null
  preferred_language?: string | null
}

export default function PatientProfilePage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<PatientProfile>>({})

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['patient', 'profile'],
    queryFn: async () => {
      const res = await axios.get<PatientProfile>('/patients/me')
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PatientProfile>) => {
      const res = await axios.put<PatientProfile>('/patients/me', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'profile'] })
      setIsEditing(false)
      setFormData({})
    },
  })

  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <Paper elevation={3} className="p-8 rounded-xl">
          <Typography variant="h5" gutterBottom className="font-bold">
            Espace Patient
          </Typography>
          <Typography color="text.secondary" className="mb-4">
            Vous devez vous connecter pour accéder à votre profil.
          </Typography>
          <Button variant="contained" onClick={() => signIn()}>
            Se connecter
          </Button>
        </Paper>
      </Container>
    )
  }

  const handleEdit = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone || '',
        preferred_language: profile.preferred_language || '',
      })
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-2 rounded-lg shadow-lg">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  Mon profil
                </Typography>
                <Typography variant="body1" className="text-gray-600">
                  Gérez vos informations personnelles
                </Typography>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="contained"
                startIcon={<PencilIcon className="h-5 w-5" />}
                onClick={handleEdit}
                sx={{
                  background: 'linear-gradient(to right, #2563EB, #3B82F6)',
                  '&:hover': {
                    background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
                  },
                }}
              >
                Modifier
              </Button>
            )}
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
            Une erreur est survenue lors du chargement du profil.
          </Alert>
        )}

        {!isLoading && profile && (
          <Paper className="rounded-xl border border-gray-100 p-6">
            {isEditing ? (
              <Stack spacing={3}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Prénom"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Nom"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    fullWidth
                    required
                  />
                </div>

                <TextField
                  label="Téléphone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  fullWidth
                  placeholder="+33 1 23 45 67 89"
                />

                <TextField
                  label="Langue préférée"
                  value={formData.preferred_language || ''}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  fullWidth
                  placeholder="fr, en, etc."
                  helperText="Code ISO de la langue (ex: fr pour français, en pour anglais)"
                />

                <div className="flex gap-2 justify-end">
                  <Button variant="outlined" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    sx={{
                      background: 'linear-gradient(to right, #2563EB, #3B82F6)',
                      '&:hover': {
                        background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
                      },
                    }}
                  >
                    {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>

                {updateMutation.isError && (
                  <Alert severity="error">
                    Une erreur est survenue lors de la mise à jour du profil.
                  </Alert>
                )}
              </Stack>
            ) : (
              <Stack spacing={4}>
                <div>
                  <Typography variant="overline" className="text-gray-600">
                    Informations personnelles
                  </Typography>
                  <div className="mt-2 space-y-3">
                    <div>
                      <Typography variant="body2" className="text-gray-500">Nom complet</Typography>
                      <Typography variant="body1" fontWeight="600">
                        {profile.first_name} {profile.last_name}
                      </Typography>
                    </div>
                    {profile.phone && (
                      <div>
                        <Typography variant="body2" className="text-gray-500">Téléphone</Typography>
                        <Typography variant="body1">{profile.phone}</Typography>
                      </div>
                    )}
                    {profile.preferred_language && (
                      <div>
                        <Typography variant="body2" className="text-gray-500">Langue préférée</Typography>
                        <Typography variant="body1">{profile.preferred_language.toUpperCase()}</Typography>
                      </div>
                    )}
                  </div>
                </div>

                <Box className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <Typography variant="body2" className="text-blue-900">
                    <strong>💡 Conseil :</strong> Gardez vos informations à jour pour faciliter la prise de contact par les praticiens.
                  </Typography>
                </Box>
              </Stack>
            )}
          </Paper>
        )}
      </Container>
    </DashboardLayout>
  )
}
