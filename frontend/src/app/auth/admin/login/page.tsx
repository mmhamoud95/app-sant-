"use client"
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import { 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  Stack, 
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Container
} from '@mui/material'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Importations directes des icônes heroicons
import { 
  ShieldCheckIcon, 
  EyeIcon, 
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'

export const dynamic = 'force-dynamic'

type FormValues = { 
  email: string
  password: string 
}

// Header simple
function Header() {
  return (
    <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6">
      <div className="container mx-auto flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="bg-white/20 p-1 rounded-lg">
            <HeartIcon className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl">App Santé</span>
        </Link>
      </div>
    </header>
  )
}

// Footer simple
function Footer() {
  return (
    <footer className="mt-auto py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
      <div className="container mx-auto text-center">
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-xl">
            <HeartIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-gray-800 font-bold">App Santé</span>
        </div>
        <Typography variant="body2" className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} App Santé. Tous droits réservés.
        </Typography>
      </div>
    </footer>
  )
}

export default function AdminLoginPage() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<FormValues>({
    mode: 'onBlur',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)

    try {
      const res = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (res?.error) {
        if (res.error === 'CredentialsSignin') {
          setError('Email ou mot de passe incorrect')
        } else {
          setError('Une erreur est survenue. Veuillez réessayer.')
        }
        setLoading(false)
        return
      }

      if (res?.ok) {
        router.push('/dashboard/admin')
        router.refresh()
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <Header />
      
      <Container maxWidth="lg" className="flex-grow flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
                <ShieldCheckIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <Typography variant="h4" fontWeight="bold" className="mb-2 text-gray-800">
              Espace Administration
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              Connectez-vous pour accéder au panneau d&apos;administration
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
                className="mb-4"
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                {/* Email Field */}
                <TextField
                  label="Adresse email administrateur"
                  type="email"
                  placeholder="admin@example.com"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email', { 
                    required: 'L\'email est requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Veuillez entrer un email valide'
                    }
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password Field */}
                <TextField
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  {...register('password', { 
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères'
                    }
                  })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || isSubmitting}
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <ShieldCheckIcon className="h-5 w-5" />
                    )
                  }
                  sx={{
                    background: 'linear-gradient(to right, #9333EA, #4F46E5)',
                    '&:hover': {
                      background: 'linear-gradient(to right, #7E22CE, #4338CA)',
                    },
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem',
                    textTransform: 'none',
                  }}
                >
                  {loading ? 'Connexion en cours...' : 'Se connecter'}
                </Button>
              </Stack>
            </form>

            {/* Info Footer */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg mt-0.5">
                  <ShieldCheckIcon className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <Typography variant="body2" className="text-purple-900 font-semibold mb-1">
                    Accès réservé aux administrateurs
                  </Typography>
                  <Typography variant="caption" className="text-purple-700">
                    Cet espace est strictement réservé au personnel administratif autorisé.
                  </Typography>
                </div>
              </div>
            </div>
          </Paper>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <Typography variant="body2" className="text-gray-500">
              <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium">
                Retour à l&apos;accueil
              </Link>
            </Typography>
          </div>
        </div>
      </Container>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
