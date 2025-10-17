"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Stack,
  Divider,
  Alert,
  InputAdornment,
  CircularProgress,
  Container
} from '@mui/material'
// Importations directes des icônes heroicons
import { 
  UserPlusIcon,
  UserIcon,
  ClipboardDocumentCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import { API_BASE } from '@/lib/env'

export const dynamic = 'force-dynamic'

// Types d'utilisateurs
type UserType = 'patient' | 'doctor' | null

// Étapes du formulaire d'inscription
const steps = ['Type de compte', 'Informations personnelles', 'Finalisation']

// Footer simple
function Footer() {
  return (
    <footer className="mt-16 text-center py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
      <div className="flex justify-center items-center gap-2 mb-4">
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
          <HeartIcon className="h-5 w-5 text-white" />
        </div>
        <span className="text-gray-800 font-bold">App Santé</span>
      </div>
      <Typography variant="body2" className="text-gray-600 text-sm">
        &copy; {new Date().getFullYear()} App Santé. Tous droits réservés.
      </Typography>
    </footer>
  )
}

// Header simple
function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6">
      <div className="container mx-auto flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="bg-white/20 p-1 rounded-lg">
            <HeartIcon className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl">App Santé</span>
        </Link>
        <div className="ml-auto flex gap-4 items-center">
          <Link href="/auth/login" className="text-white hover:text-blue-100 transition">
            Connexion
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [userType, setUserType] = useState<UserType>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    acceptTerms: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handlers
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate password matches backend requirements
      if (formData.password.length < 12) {
        setError("Le mot de passe doit contenir au moins 12 caractères")
        setIsSubmitting(false)
        return
      }

      if (formData.password !== formData.passwordConfirm) {
        setError("Les mots de passe ne correspondent pas")
        setIsSubmitting(false)
        return
      }

      if (!userType) {
        setError("Veuillez sélectionner un type de compte")
        setIsSubmitting(false)
        return
      }

      // Call the appropriate registration endpoint based on user type
      const endpoint = userType === 'patient' 
        ? `${API_BASE}/auth/patient/register`
        : `${API_BASE}/auth/doctor/register`

      const payload: any = {
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim() || null,
      }

      // Add patient-specific fields
      if (userType === 'patient') {
        payload.preferred_language = 'fr' // Default language
      }

      // Add doctor-specific fields
      if (userType === 'doctor') {
        payload.bio = null
        payload.clinic_name = null
        payload.clinic_city = null
        payload.clinic_region = null
        payload.clinic_country = null
        payload.specialties = []
        payload.languages = []
      }

      await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      })

      // Redirection vers la page de connexion avec message de succès
      router.push('/auth/login?registered=success')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail || err.response?.data?.message
        
        if (status === 400) {
          if (detail && detail.includes('already registered')) {
            setError("Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.")
          } else {
            setError(detail || "Les données fournies sont invalides. Veuillez vérifier le formulaire.")
          }
        } else if (status === 422) {
          // Validation error from Pydantic
          const errors = err.response?.data?.errors
          if (errors) {
            const messages = Object.values(errors).flat()
            setError(messages[0] as string || "Données invalides")
          } else {
            setError(detail || "Les données fournies sont invalides. Le mot de passe doit contenir au moins 12 caractères.")
          }
        } else if (status === 429) {
          setError("Trop de tentatives. Veuillez réessayer dans quelques minutes.")
        } else if (status && status >= 500) {
          setError("Le service est temporairement indisponible. Veuillez réessayer plus tard.")
        } else {
          setError(detail || "Une erreur s'est produite lors de l'inscription. Veuillez réessayer.")
        }
      } else {
        setError("Une erreur inattendue s'est produite. Veuillez vérifier votre connexion internet.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validation de base (à améliorer avec zod ou yup)
  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return userType !== null
      case 1:
        return (
          formData.firstName.trim() !== '' &&
          formData.lastName.trim() !== '' &&
          formData.email.includes('@') &&
          formData.phone.trim() !== ''
        )
      case 2:
        return (
          formData.password.length >= 12 &&
          formData.password === formData.passwordConfirm &&
          formData.acceptTerms
        )
      default:
        return false
    }
  }

  // Rendu conditionnel des étapes du formulaire
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="py-6">
            <Typography variant="h6" className="mb-4 font-medium text-gray-800">
              Sélectionnez votre type de compte :
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  userType === 'patient' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
                onClick={() => handleUserTypeSelect('patient')}
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full ${userType === 'patient' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <UserIcon className={`h-6 w-6 ${userType === 'patient' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <Typography variant="h6" className="ml-4 font-semibold">
                    Patient
                  </Typography>
                </div>
                <Typography variant="body2" className="text-gray-600">
                  Créez un compte patient pour prendre rendez-vous avec des praticiens et gérer votre dossier médical.
                </Typography>
              </div>
              
              <div 
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  userType === 'doctor' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                }`}
                onClick={() => handleUserTypeSelect('doctor')}
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full ${userType === 'doctor' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <ClipboardDocumentCheckIcon className={`h-6 w-6 ${userType === 'doctor' ? 'text-green-600' : 'text-gray-600'}`} />
                  </div>
                  <Typography variant="h6" className="ml-4 font-semibold">
                    Praticien
                  </Typography>
                </div>
                <Typography variant="body2" className="text-gray-600">
                  Créez un compte praticien pour gérer vos rendez-vous, vos patients et votre cabinet.
                </Typography>
              </div>
            </div>
          </div>
        )
      
      case 1:
        return (
          <div className="py-6">
            <Typography variant="h6" className="mb-6 font-medium text-gray-800">
              Informations personnelles
            </Typography>
            <Stack spacing={3}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Prénom"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="Votre prénom"
                />
                <TextField
                  label="Nom"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="Votre nom"
                />
              </div>
              
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="exemple@email.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="Téléphone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="06 12 34 56 78"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    </InputAdornment>
                  ),
                }}
              />
              
              {userType === 'doctor' && (
                <Alert severity="info" className="mt-2">
                  En tant que praticien, vous devrez vérifier votre identité et fournir vos informations professionnelles après l&apos;inscription.
                </Alert>
              )}
            </Stack>
          </div>
        )
      
      case 2:
        return (
          <div className="py-6">
            <Typography variant="h6" className="mb-6 font-medium text-gray-800">
              Sécurisation de votre compte
            </Typography>
            <Stack spacing={3}>
              <TextField
                label="Mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="Minimum 12 caractères"
                helperText="Le mot de passe doit contenir au moins 12 caractères"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                label="Confirmer le mot de passe"
                name="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="Confirmez votre mot de passe"
              />
              
              <div className="mt-4">
                <FormControlLabel
                  control={
                    <Checkbox
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      J&apos;accepte les <Link href="/terms" className="text-blue-600 hover:underline">conditions d&apos;utilisation</Link> et la <Link href="/privacy" className="text-blue-600 hover:underline">politique de confidentialité</Link>
                    </Typography>
                  }
                />
              </div>
              
              {formData.password && formData.password.length < 12 && (
                <Box className="flex items-center gap-2 text-amber-600 mt-2">
                  <ExclamationCircleIcon className="h-5 w-5" />
                  <Typography variant="caption">
                    Le mot de passe doit contenir au moins 12 caractères
                  </Typography>
                </Box>
              )}
              
              {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                <Box className="flex items-center gap-2 text-red-600 mt-2">
                  <ExclamationCircleIcon className="h-5 w-5" />
                  <Typography variant="caption">
                    Les mots de passe ne correspondent pas
                  </Typography>
                </Box>
              )}
            </Stack>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <Header />

      <Container maxWidth="lg">
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl">
                  <UserPlusIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <Typography variant="h4" fontWeight="bold" className="mb-2 text-gray-800">
                Créez votre compte
              </Typography>
              <Typography variant="body1" className="text-gray-600">
                Rejoignez notre plateforme de santé en quelques étapes
              </Typography>
            </div>

            {/* Form Card */}
            <Paper 
              elevation={6} 
              className="p-8 rounded-2xl border border-gray-100"
            >
              {/* Error Alert */}
              {error && (
                <Alert 
                  severity="error" 
                  className="mb-6"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}
              
              {/* Stepper */}
              <Stepper activeStep={activeStep} alternativeLabel className="mb-8">
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Form Steps */}
              <form onSubmit={activeStep === steps.length - 1 ? handleSubmit : undefined}>
                {renderStepContent()}
                
                <Divider className="my-6" />
                
                <div className="flex justify-between">
                  <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    variant="outlined"
                    sx={{
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      color: '#1F2937',
                      '&:hover': {
                        borderWidth: 2,
                        borderColor: '#2563EB',
                        backgroundColor: '#EFF6FF',
                      },
                    }}
                  >
                    Retour
                  </Button>
                  
                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!isStepValid() || isSubmitting}
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <CheckCircleIcon className="h-5 w-5" />
                        )
                      }
                      sx={{
                        background: isStepValid() 
                          ? 'linear-gradient(to right, #2563EB, #10B981)' 
                          : 'linear-gradient(to right, #94A3B8, #94A3B8)',
                        '&:hover': {
                          background: 'linear-gradient(to right, #1D4ED8, #059669)',
                        },
                        py: 1,
                        px: 4,
                        fontWeight: 600,
                      }}
                    >
                      {isSubmitting ? "Création en cours..." : "Créer mon compte"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isStepValid()}
                      variant="contained"
                      sx={{
                        background: isStepValid() 
                          ? 'linear-gradient(to right, #2563EB, #10B981)' 
                          : 'linear-gradient(to right, #94A3B8, #94A3B8)',
                        '&:hover': {
                          background: 'linear-gradient(to right, #1D4ED8, #059669)',
                        },
                        py: 1,
                        px: 4,
                        fontWeight: 600,
                      }}
                    >
                      Suivant
                    </Button>
                  )}
                </div>
              </form>
            </Paper>
            
            {/* Already have account */}
            <div className="mt-6 text-center">
              <Typography variant="body2" className="text-gray-600">
                Vous avez déjà un compte ?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  Connectez-vous ici
                </Link>
              </Typography>
            </div>
          </div>
        </div>
      </Container>

      {/* Footer */}
      <Footer />
    </div>
  )
}