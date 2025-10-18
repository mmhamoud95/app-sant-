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
  TextField,
  Box,
  Chip,
} from '@mui/material'
import {
  UserIcon,
  CheckCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

type DoctorProfile = {
  user_id: number
  first_name: string
  last_name: string
  phone?: string | null
  bio?: string | null
  verified: boolean
  clinic_name?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  specialties: string[]
  languages: string[]
}

export default function DoctorProfilePage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<DoctorProfile>>({})

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    enabled: status === 'authenticated',
    queryKey: ['doctor', 'profile'],
    queryFn: async () => {
      const res = await axios.get<DoctorProfile>('/doctors/me')
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<DoctorProfile>) => {
      const res = await axios.put<DoctorProfile>('/doctors/me', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'profile'] })
      setIsEditing(false)
      setFormData({})
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
        bio: profile.bio || '',
        city: profile.city || '',
        region: profile.region || '',
        country: profile.country || '',
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
    <DashboardLayout userRole="doctor">
      <Container maxWidth="lg" className="py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-green-500 p-2 rounded-lg shadow-lg">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <Typography variant="h4" fontWeight="bold" className="text-gray-800">
                  Mon profil
                </Typography>
                <Typography variant="body1" className="text-gray-600">
                  Gérez vos informations professionnelles
                </Typography>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="contained"
                startIcon={<PencilIcon className="h-5 w-5" />}
                onClick={handleEdit}
                sx={{
                  background: 'linear-gradient(to right, #10B981, #059669)',
                  '&:hover': {
                    background: 'linear-gradient(to right, #059669, #047857)',
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
            {/* Verification Status */}
            <Box className="mb-6 p-4 rounded-lg" sx={{ backgroundColor: profile.verified ? '#D1FAE5' : '#FEF3C7' }}>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className={`h-6 w-6 ${profile.verified ? 'text-green-700' : 'text-yellow-700'}`} />
                <Typography variant="body1" fontWeight="600" sx={{ color: profile.verified ? '#065F46' : '#92400E' }}>
                  {profile.verified ? 'Profil vérifié' : 'En attente de vérification'}
                </Typography>
              </div>
              <Typography variant="body2" sx={{ color: profile.verified ? '#047857' : '#78350F', mt: 1 }}>
                {profile.verified 
                  ? 'Votre profil a été vérifié par notre équipe'
                  : 'Votre profil est en cours de vérification par notre équipe'}
              </Typography>
            </Box>

            {isEditing ? (
              <Stack spacing={3}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Prénom"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Nom"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    fullWidth
                  />
                </div>

                <TextField
                  label="Téléphone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Biographie"
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Présentez votre parcours et vos spécialités..."
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TextField
                    label="Ville"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Région"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Pays"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    fullWidth
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outlined" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    sx={{
                      background: 'linear-gradient(to right, #10B981, #059669)',
                      '&:hover': {
                        background: 'linear-gradient(to right, #059669, #047857)',
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
                        Dr. {profile.first_name} {profile.last_name}
                      </Typography>
                    </div>
                    {profile.phone && (
                      <div>
                        <Typography variant="body2" className="text-gray-500">Téléphone</Typography>
                        <Typography variant="body1">{profile.phone}</Typography>
                      </div>
                    )}
                    {profile.bio && (
                      <div>
                        <Typography variant="body2" className="text-gray-500">Biographie</Typography>
                        <Typography variant="body1">{profile.bio}</Typography>
                      </div>
                    )}
                  </div>
                </div>

                {(profile.clinic_name || profile.city || profile.region || profile.country) && (
                  <div>
                    <Typography variant="overline" className="text-gray-600">
                      Lieu d&apos;exercice
                    </Typography>
                    <div className="mt-2 space-y-3">
                      {profile.clinic_name && (
                        <div>
                          <Typography variant="body2" className="text-gray-500">Clinique</Typography>
                          <Typography variant="body1">{profile.clinic_name}</Typography>
                        </div>
                      )}
                      {(profile.city || profile.region || profile.country) && (
                        <div>
                          <Typography variant="body2" className="text-gray-500">Localisation</Typography>
                          <Typography variant="body1">
                            {[profile.city, profile.region, profile.country].filter(Boolean).join(', ')}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(profile.specialties.length > 0 || profile.languages.length > 0) && (
                  <div>
                    <Typography variant="overline" className="text-gray-600">
                      Compétences
                    </Typography>
                    <div className="mt-2 space-y-3">
                      {profile.specialties.length > 0 && (
                        <div>
                          <Typography variant="body2" className="text-gray-500 mb-2">Spécialités</Typography>
                          <div className="flex flex-wrap gap-2">
                            {profile.specialties.map((specialty) => (
                              <Chip key={specialty} label={specialty} color="success" />
                            ))}
                          </div>
                        </div>
                      )}
                      {profile.languages.length > 0 && (
                        <div>
                          <Typography variant="body2" className="text-gray-500 mb-2">Langues</Typography>
                          <div className="flex flex-wrap gap-2">
                            {profile.languages.map((language) => (
                              <Chip key={language} label={language} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Stack>
            )}
          </Paper>
        )}
      </Container>
    </DashboardLayout>
  )
}
