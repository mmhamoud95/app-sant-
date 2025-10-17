"use client"

import { useSearchParams } from 'next/navigation'
import { Alert, Button, Container, Paper, Typography } from '@mui/material'
import Link from 'next/link'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const getErrorMessage = () => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Email ou mot de passe incorrect'
      case 'AccessDenied':
        return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.'
      case 'SessionRequired':
        return 'Vous devez être connecté pour accéder à cette page.'
      default:
        return 'Une erreur d\'authentification s\'est produite.'
    }
  }

  return (
    <Container maxWidth="sm" className="py-16">
      <Paper elevation={3} className="p-8 rounded-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <Typography variant="h5" component="h1" className="text-center mb-4">
          Problème d'authentification
        </Typography>
        <Alert severity="error" className="mb-6">
          {getErrorMessage()}
        </Alert>
        <Typography className="mb-6 text-center text-gray-600">
          Veuillez réessayer ou contacter le support si le problème persiste.
        </Typography>
        <div className="flex justify-center gap-4">
          <Button 
            component={Link} 
            href="/auth/login" 
            variant="contained" 
            color="primary"
          >
            Retour à la connexion
          </Button>
          <Button 
            component={Link} 
            href="/" 
            variant="outlined"
          >
            Accueil
          </Button>
        </div>
      </Paper>
    </Container>
  )
}