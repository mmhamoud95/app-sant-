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
  Divider,
  Link as MuiLink,
  Container
} from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Importations directes des icônes heroicons
import { 
  ArrowRightOnRectangleIcon, 
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
    <header className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6">
      <div className="container mx-auto flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="bg-white/20 p-1 rounded-lg">
            <HeartIcon className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl">App Santé</span>
        </Link>
        <div className="ml-auto flex gap-4 items-center">
          <Link href="/auth/register" className="text-white hover:text-blue-100 transition">
            Inscription
          </Link>
        </div>
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
          <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
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

// Mappe les erreurs NextAuth/back-end vers des messages clairs et des actions suggérées
function mapAuthError(err?: string) {
  if (!err) return null

  const raw = String(err)

  const includes = (s: string) => raw.toLowerCase().includes(s.toLowerCase())

  // Normalisation d’erreurs fréquentes
  if (raw === 'CredentialsSignin' || includes('invalid credentials') || includes('invalid email or password') || includes('email ou mot de passe')) {
    return {
      severity: 'error' as const,
      title: 'Identifiants incorrects',
      message: 'Adresse email ou mot de passe incorrect. Vérifiez vos informations et réessayez.',
      showForgot: true,
    }
  }

  if (includes('not verified') || includes('unverified') || includes('verify your email') || includes('email non vérifié')) {
    return {
      severity: 'warning' as const,
      title: 'Compte non vérifié',
      message: 'Votre compte existe mais n’a pas encore été vérifié. Consultez votre boîte mail ou renvoyez un email de vérification.',
      showResendVerification: true,
    }
  }

  if (includes('locked') || includes('disabled') || includes('suspended') || includes('bloqué')) {
    return {
      severity: 'error' as const,
      title: 'Compte bloqué',
      message: 'Votre compte est temporairement bloqué. Contactez le support si le problème persiste.',
    }
  }

  if (includes('too many') || includes('rate limit') || includes('trop de tentatives')) {
    return {
      severity: 'warning' as const,
      title: 'Trop de tentatives',
      message: 'Vous avez effectué trop de tentatives. Patientez quelques minutes avant de réessayer.',
    }
  }

  if (includes('oauthaccountnotlinked')) {
    return {
      severity: 'warning' as const,
      title: 'Compte non lié',
      message: 'Cette adresse email est déjà utilisée avec une autre méthode de connexion. Connectez-vous avec votre fournisseur d’origine ou réinitialisez votre mot de passe.',
      showForgot: true,
    }
  }

  if (includes('network') || includes('fetch') || includes('failed to fetch')) {
    return {
      severity: 'error' as const,
      title: 'Problème réseau',
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez.',
    }
  }

  // Par défaut: afficher le message brut si disponible
  return {
    severity: 'error' as const,
    title: 'Impossible de se connecter',
    message: raw,
  }
}

export default function LoginPage() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting, isValid },
    watch,
    setError: setFieldError,
  } = useForm<FormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: { email: '', password: '' },
  })

  const emailValue = watch('email')
  const passwordValue = watch('password')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const alertRef = useRef<HTMLDivElement | null>(null)

  // Messages de succès possibles depuis d’autres parcours
  useEffect(() => {
    if (searchParams.get('registered') === 'success') {
      setSuccess('Inscription réussie ! Vous pouvez maintenant vous connecter.')
    }
    if (searchParams.get('reset') === 'success') {
      setSuccess('Mot de passe mis à jour. Vous pouvez maintenant vous connecter.')
    }
    if (searchParams.get('verified') === 'true') {
      setSuccess('Email vérifié avec succès. Vous pouvez vous connecter.')
    }
    // Propagation d’une erreur éventuelle via query param (?error=...)
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(urlError)
    }
  }, [searchParams])

  // Effacer l’erreur générale quand l’utilisateur modifie les champs
  useEffect(() => {
    if (error) {
      setError(null)
    }
  }, [emailValue, passwordValue])

  // Focus automatique sur l’alerte pour l’accessibilité
  useEffect(() => {
    if (error && alertRef.current) {
      alertRef.current.focus()
    }
  }, [error])

  const friendlyError = useMemo(() => mapAuthError(error || undefined), [error])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)

    try {
      const res = await signIn('credentials', {
        email: values.email.trim(),
        password: values.password,
        redirect: false,
      })

      if (res?.error) {
        setError(res.error)
        setLoading(false)
        return
      }

      if (res?.ok) {
        try {
          // Récupère la session pour rediriger selon le rôle
          const sessionResponse = await fetch('/api/auth/session')
          const session = await sessionResponse.json()
          
          if (session?.user?.role === 'patient') {
            router.push('/dashboard/patient')
          } else if (session?.user?.role === 'doctor') {
            router.push('/dashboard/doctor')
          } else if (session?.user?.role === 'admin') {
            router.push('/dashboard/admin')
          } else {
            router.push('/')
          }
          router.refresh()
        } catch {
          // Fallback si la session n’est pas récupérable
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Une erreur inattendue est survenue'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <Header />
      
      <Container maxWidth="lg" className="flex-grow flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl">
                <ArrowRightOnRectangleIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <Typography variant="h4" fontWeight="bold" className="mb-2 text-gray-800">
              Bienvenue !
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              Connectez-vous pour accéder à votre espace
            </Typography>
          </div>

          {/* Form Card */}
          <Paper 
            elevation={6} 
            className="p-8 rounded-2xl border border-gray-100"
          >
            {/* Success Alert */}
            {success && (
              <Alert 
                severity="success" 
                className="mb-4"
                onClose={() => setSuccess(null)}
                role="status"
              >
                {success}
              </Alert>
            )}

            {/* Error Alert (claire et actionnable) */}
            {friendlyError && (
              <Alert
                ref={alertRef}
                tabIndex={-1}
                severity={friendlyError.severity}
                className="mb-4"
                onClose={() => setError(null)}
                aria-live="assertive"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{friendlyError.title}</span>
                  <span>{friendlyError.message}</span>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {friendlyError.showForgot && (
                      <Link href="/auth/forgot-password" className="text-blue-700 hover:underline font-medium">
                        Mot de passe oublié ?
                      </Link>
                    )}
                    {friendlyError.showResendVerification && emailValue && (
                      <Link
                        href={`/auth/verify/resend?email=${encodeURIComponent(emailValue)}`}
                        className="text-blue-700 hover:underline font-medium"
                      >
                        Renvoyer l’email de vérification
                      </Link>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={3}>
                {/* Email Field */}
                <TextField
                  label="Adresse email"
                  type="email"
                  placeholder="exemple@email.com"
                  fullWidth
                  autoComplete="email"
                  inputProps={{ inputMode: 'email', 'aria-label': 'Adresse email', maxLength: 254 }}
                  error={!!errors.email}
                  helperText={errors.email?.message || "Nous n'utiliserons jamais votre email pour du spam."}
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
                <div>
                  <TextField
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez votre mot de passe"
                    fullWidth
                    autoComplete="current-password"
                    inputProps={{ 'aria-label': 'Mot de passe', maxLength: 128 }}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    {...register('password', { 
                      required: 'Le mot de passe est requis',
                      minLength: {
                        value: 12,
                        message: 'Le mot de passe doit contenir au moins 12 caractères'
                      }
                    })}
                    onKeyDown={(e) => {
                      // Détection du Caps Lock
                      // getModifierState existe sur KeyboardEvent
                      const isOn = (e as any).getModifierState?.('CapsLock')
                      setCapsLockOn(!!isOn)
                    }}
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
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                  {capsLockOn && (
                    <Typography variant="caption" className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1 inline-block">
                      Attention: la touche Verr. Maj est activée.
                    </Typography>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <Link href="/auth/forgot-password" passHref legacyBehavior>
                    <MuiLink 
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                      underline="hover"
                    >
                      Mot de passe oublié ?
                    </MuiLink>
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || isSubmitting || !isValid}
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    )
                  }
                  sx={{
                    background: 'linear-gradient(to right, #2563EB, #10B981)',
                    '&:hover': {
                      background: 'linear-gradient(to right, #1D4ED8, #059669)',
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

            <Divider className="my-6">
              <Typography variant="body2" className="text-gray-500">
                OU
              </Typography>
            </Divider>

            {/* Register Link */}
            <div className="text-center">
              <Typography variant="body2" className="text-gray-600 mb-2">
                Vous n&apos;avez pas encore de compte ?
              </Typography>
              <Link href="/auth/register" passHref legacyBehavior>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderWidth: 2,
                    borderColor: '#E5E7EB',
                    color: '#1F2937',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: '#2563EB',
                      backgroundColor: '#EFF6FF',
                    },
                  }}
                >
                  Créer un compte
                </Button>
              </Link>
            </div>

            {/* Info Footer */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg mt-0.5">
                  <HeartIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <Typography variant="body2" className="text-blue-900 font-semibold mb-1">
                    Première connexion ?
                  </Typography>
                  <Typography variant="caption" className="text-blue-700">
                    Créez votre compte en quelques minutes et accédez à tous nos services de santé.
                  </Typography>
                </div>
              </div>
            </div>
          </Paper>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <Typography variant="body2" className="text-gray-500">
              En vous connectant, vous acceptez nos{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                conditions d&apos;utilisation
              </Link>
              {' '}et notre{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                politique de confidentialité
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