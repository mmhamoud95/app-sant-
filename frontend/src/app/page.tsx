"use client"
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { API_BASE } from '@/lib/env'
import { PageLayout } from '@/components/page-layout'
import {
  UserIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  StarIcon,
  MapPinIcon,
  CheckBadgeIcon,
  UserCircleIcon,
  LanguageIcon,
  SparklesIcon,
  FunnelIcon,
  XMarkIcon
} from '@/components/medical-icons'
import {
  TextField,
  Button,
  Stack,
  Paper,
  Typography,
  Chip,
  Pagination,
  Skeleton,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material'

type DoctorSummary = {
  id: number
  email: string
  first_name: string
  last_name: string
  city?: string
  region?: string
  country?: string
  verified: boolean
  specialties: { id: number; name: string; slug: string }[]
  languages: { id: number; code: string; name: string }[]
}

type PaginatedDoctorResponse = {
  items: DoctorSummary[]
  total: number
  page: number
  limit: number
}

export default function HomePage() {
  const [city, setCity] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [page, setPage] = useState(1)
  const [showResults, setShowResults] = useState(false)

  const queryEnabled = useMemo(() => city.length > 0 || specialty.length > 0, [city, specialty])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', city, specialty, page],
    queryFn: async () => {
      const res = await axios.get<PaginatedDoctorResponse>(`${API_BASE}/doctors`, {
        params: {
          city: city || undefined,
          specialty: specialty || undefined,
          limit: 10,
          page,
        },
      })
      return res.data
    },
    enabled: queryEnabled,
    placeholderData: (prev: PaginatedDoctorResponse | undefined) => prev,
  })

  const handleSearch = () => {
    setPage(1)
    setShowResults(true)
    refetch()
  }

  const handleClearFilters = () => {
    setCity('')
    setSpecialty('')
    setPage(1)
    setShowResults(false)
  }

  const hasActiveFilters = city.length > 0 || specialty.length > 0

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-2xl shadow-lg animate-pulse">
                <HeartIcon className="h-14 w-14 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent mb-6 leading-tight">
              Votre Santé, Notre Priorité
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-6 font-medium">
              Prenez rendez-vous avec les meilleurs praticiens en quelques clics
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Plateforme moderne et sécurisée pour gérer vos consultations médicales. 
              Simple, rapide et disponible 24h/24.
            </p>
            
            {/* Integrated Search Bar */}
            <div className="max-w-3xl mx-auto mt-8">
              <Paper elevation={6} className="p-6 rounded-2xl bg-white border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
                  <Typography variant="h6" fontWeight="600" className="text-gray-800">
                    Rechercher un praticien
                  </Typography>
                </div>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems="stretch"
                  className="mb-4"
                >
                  <TextField
                    fullWidth
                    label="Ville"
                    placeholder="Ex: Paris, Lyon, Marseille..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MapPinIcon className="h-5 w-5 text-blue-500" />
                        </InputAdornment>
                      ),
                      endAdornment: city && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setCity('')}>
                            <XMarkIcon className="h-4 w-4" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Spécialité"
                    placeholder="Ex: cardiologue, dentiste..."
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SparklesIcon className="h-5 w-5 text-green-500" />
                        </InputAdornment>
                      ),
                      endAdornment: specialty && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSpecialty('')}>
                            <XMarkIcon className="h-4 w-4" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    sx={{ 
                      minWidth: 150,
                      background: 'linear-gradient(to right, #2563EB, #10B981)',
                      '&:hover': {
                        background: 'linear-gradient(to right, #1D4ED8, #059669)',
                      },
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                    }}
                    onClick={handleSearch}
                    startIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                  >
                    Rechercher
                  </Button>
                </Stack>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Typography variant="body2" className="text-gray-600">
                      Filtres actifs:
                    </Typography>
                    {city && (
                      <Chip 
                        label={`Ville: ${city}`} 
                        onDelete={() => setCity('')}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {specialty && (
                      <Chip 
                        label={`Spécialité: ${specialty}`} 
                        onDelete={() => setSpecialty('')}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    <Button 
                      size="small" 
                      onClick={handleClearFilters}
                      sx={{ textTransform: 'none', ml: 'auto' }}
                    >
                      Tout effacer
                    </Button>
                  </div>
                )}
              </Paper>

              <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-2">
                <StarIcon className="h-4 w-4 text-yellow-500" />
                Plus de 10 000 praticiens disponibles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {showResults && (
        <section className="py-8 bg-white/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {isLoading && (
                <Stack spacing={3}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={140} className="rounded-xl" />
                  ))}
                </Stack>
              )}

              {isError && (
                <Paper className="p-8 text-center rounded-xl border border-red-200 bg-red-50">
                  <Typography color="error" variant="h6" className="mb-2">
                    ⚠️ Une erreur est survenue
                  </Typography>
                  <Typography color="text.secondary">
                    Impossible de charger les résultats. Veuillez réessayer.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => refetch()}
                    className="mt-4"
                  >
                    Réessayer
                  </Button>
                </Paper>
              )}

              {!isLoading && data?.items?.length === 0 && queryEnabled && (
                <Paper className="p-12 text-center rounded-xl border border-gray-200">
                  <Typography variant="h6" fontWeight="600" className="mb-2 text-gray-800">
                    😔 Aucun résultat trouvé
                  </Typography>
                  <Typography color="text.secondary" className="mb-4">
                    Aucun praticien ne correspond à votre recherche. Essayez d&apos;élargir vos critères.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={handleClearFilters}
                    sx={{ textTransform: 'none' }}
                  >
                    Réinitialiser les filtres
                  </Button>
                </Paper>
              )}

              {data && data.items.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <Typography variant="body1" className="text-gray-700 font-medium">
                      {data.total} praticien{data.total > 1 ? 's' : ''} trouvé{data.total > 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      Page {page} sur {Math.ceil(data.total / data.limit)}
                    </Typography>
                  </div>

                  <Stack spacing={3}>
                    {data.items.map((d) => (
                      <Link key={d.id} href={`/doctor/${d.id}`} className="no-underline">
                        <Paper
                          elevation={2}
                          className="p-6 hover:shadow-xl transition-all duration-300 rounded-xl border border-gray-100 hover:border-blue-300 cursor-pointer group"
                        >
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="bg-gradient-to-br from-blue-100 to-green-100 p-4 rounded-full group-hover:scale-110 transition-transform">
                              <UserCircleIcon className="h-12 w-12 text-blue-600" />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Typography variant="h6" fontWeight="bold" className="text-gray-800">
                                  Dr. {d.first_name} {d.last_name}
                                </Typography>
                                {d.verified && (
                                  <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    <CheckBadgeIcon className="h-4 w-4" />
                                    <span className="text-xs font-semibold">Vérifié</span>
                                  </div>
                                )}
                              </div>

                              {/* Location */}
                              {(d.city || d.region || d.country) && (
                                <div className="flex items-center gap-2 mb-3 text-gray-600">
                                  <MapPinIcon className="h-4 w-4" />
                                  <Typography variant="body2">
                                    {[d.city, d.region, d.country].filter(Boolean).join(', ')}
                                  </Typography>
                                </div>
                              )}

                              <Divider className="my-3" />

                              {/* Specialties & Languages */}
                              <div className="flex flex-wrap gap-2">
                                {d.specialties.map((s) => (
                                  <Chip
                                    key={s.id}
                                    label={s.name}
                                    size="small"
                                    sx={{
                                      background: 'linear-gradient(to right, #DBEAFE, #D1FAE5)',
                                      color: '#065F46',
                                      fontWeight: 600,
                                    }}
                                  />
                                ))}
                                {d.languages.map((l) => (
                                  <Chip
                                    key={l.id}
                                    icon={<LanguageIcon className="h-4 w-4" />}
                                    label={l.code.toUpperCase()}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: '#9CA3AF',
                                      color: '#4B5563',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Arrow indicator */}
                            <div className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </Paper>
                      </Link>
                    ))}
                  </Stack>
                </>
              )}

              {data && data.total > data.limit && (
                <Stack alignItems="center" className="mt-8">
                  <Pagination
                    count={Math.ceil(data.total / data.limit)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    size="large"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        fontWeight: 600,
                      },
                    }}
                  />
                </Stack>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-12 bg-white/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Pourquoi choisir App Santé ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 p-4 rounded-full">
                <CalendarDaysIcon className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-800 mb-2">Réservation instantanée</h3>
                <p className="text-sm text-gray-600">
                  Prenez rendez-vous en temps réel avec confirmation immédiate, sans appel téléphonique
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-green-100 p-4 rounded-full">
                <ShieldCheckIcon className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-800 mb-2">100% sécurisé</h3>
                <p className="text-sm text-gray-600">
                  Vos données médicales sont protégées et conformes aux normes RGPD et de confidentialité
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 p-4 rounded-full">
                <ClockIcon className="h-10 w-10 text-purple-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-800 mb-2">Disponibilité 24/7</h3>
                <p className="text-sm text-gray-600">
                  Consultez les disponibilités et gérez vos rendez-vous à tout moment, jour et nuit
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Cards Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Accédez à votre espace
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Patients Card */}
            <div className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                  <UserIcon className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <div className="bg-white/20 backdrop-blur-sm w-fit p-3 rounded-xl mb-4">
                    <UserIcon className="h-10 w-10" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Espace Patient</h2>
                  <p className="text-blue-100">
                    Gérez vos consultations et suivez votre parcours de santé
                  </p>
                </div>
              </div>
              <div className="p-8">
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/auth/login"
                      className="group/btn flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 font-semibold px-6 py-4 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                        <span>Se connecter</span>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/register"
                      className="group/btn flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserPlusIcon className="h-6 w-6" />
                        <span>Créer un compte</span>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/search"
                      className="group/btn flex items-center justify-between border-2 border-blue-200 text-blue-900 font-semibold px-6 py-4 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <MagnifyingGlassIcon className="h-6 w-6" />
                        <span>Trouver un praticien</span>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    <span className="font-semibold">Nouveau sur App Santé ?</span><br />
                    Créez votre compte gratuitement en 2 minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Praticiens Card */}
            <div className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                  <ClipboardDocumentCheckIcon className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <div className="bg-white/20 backdrop-blur-sm w-fit p-3 rounded-xl mb-4">
                    <ClipboardDocumentCheckIcon className="h-10 w-10" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Espace Praticien</h2>
                  <p className="text-green-100">
                    Optimisez la gestion de votre cabinet médical
                  </p>
                </div>
              </div>
              <div className="p-8">
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/dashboard/doctor"
                      className="group/btn flex items-center justify-between bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardDocumentCheckIcon className="h-6 w-6" />
                        <span>Accéder au Dashboard</span>
                      </div>
                      <ArrowRightIcon className="h-5 w-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                      <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Agenda intelligent</h4>
                      <p className="text-xs text-gray-600">Gérez vos créneaux et rendez-vous</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                      <UserIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Dossiers patients</h4>
                      <p className="text-xs text-gray-600">Accédez aux historiques médicaux</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg mt-1">
                      <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Sécurité maximale</h4>
                      <p className="text-xs text-gray-600">Données conformes aux normes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}