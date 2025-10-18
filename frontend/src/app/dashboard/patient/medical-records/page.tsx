"use client"
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Paper,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  DocumentTextIcon,
  HeartIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  FolderIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

type MedicalDocument = {
  id: number
  type: 'prescription' | 'test_result' | 'certificate' | 'report'
  title: string
  date: string
  doctor_name: string
  file_url?: string
}

type MedicalHistory = {
  allergies: string[]
  chronic_conditions: string[]
  current_medications: string[]
  past_surgeries: string[]
}

export default function MedicalRecordsPage() {
  const { status } = useSession()
  const [currentTab, setCurrentTab] = useState(0)
  const [viewDocument, setViewDocument] = useState<MedicalDocument | null>(null)

  // Mock data
  const medicalHistory: MedicalHistory = {
    allergies: ['Pénicilline', 'Pollen'],
    chronic_conditions: ['Hypertension'],
    current_medications: ['Lisinopril 10mg (1x/jour)', 'Aspirine 100mg (1x/jour)'],
    past_surgeries: ['Appendicectomie (2015)'],
  }

  const mockDocuments: MedicalDocument[] = [
    {
      id: 1,
      type: 'prescription',
      title: 'Ordonnance - Antibiotiques',
      date: new Date().toISOString(),
      doctor_name: 'Dr. Martin Dupont',
    },
    {
      id: 2,
      type: 'test_result',
      title: 'Analyse de sang complète',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      doctor_name: 'Dr. Sophie Bernard',
    },
    {
      id: 3,
      type: 'certificate',
      title: 'Certificat médical - Sport',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      doctor_name: 'Dr. Pierre Lefebvre',
    },
  ]

  const pastConsultations = [
    {
      id: 1,
      date: new Date().toISOString(),
      doctor: 'Dr. Martin Dupont',
      specialty: 'Médecin généraliste',
      reason: 'Consultation de suivi',
      notes: 'Patient en bonne santé générale',
    },
    {
      id: 2,
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      doctor: 'Dr. Sophie Bernard',
      specialty: 'Cardiologue',
      reason: 'Contrôle tension artérielle',
      notes: 'Tension stable, continuer traitement',
    },
  ]

  if (status !== 'authenticated') {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="info">Veuillez vous connecter pour accéder à votre dossier médical.</Alert>
        </Container>
      </DashboardLayout>
    )
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'prescription':
        return <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
      case 'test_result':
        return <BeakerIcon className="h-6 w-6 text-green-600" />
      case 'certificate':
        return <DocumentTextIcon className="h-6 w-6 text-purple-600" />
      case 'report':
        return <FolderIcon className="h-6 w-6 text-orange-600" />
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-600" />
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prescription: 'Ordonnance',
      test_result: 'Résultat d\'analyse',
      certificate: 'Certificat',
      report: 'Compte rendu',
    }
    return labels[type] || type
  }

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-4 md:py-8 px-4 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 rounded-lg">
              <HeartIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <Typography variant="h4" className="font-bold text-gray-800">
                Dossier Médical
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Consultez votre historique de santé et vos documents
              </Typography>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Paper className="mb-6 rounded-xl border border-gray-100">
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab label="Aperçu" />
            <Tab label="Documents" />
            <Tab label="Consultations" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {currentTab === 0 && (
          <Grid container spacing={3}>
            {/* Medical History Card */}
            <Grid item xs={12} md={6}>
              <Card className="h-full border border-gray-100">
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    <Typography variant="h6" className="font-semibold">
                      Allergies
                    </Typography>
                  </div>
                  {medicalHistory.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {medicalHistory.allergies.map((allergy, index) => (
                        <Chip
                          key={index}
                          label={allergy}
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </div>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune allergie connue
                    </Typography>
                  )}

                  <Divider className="my-4" />

                  <div className="flex items-center gap-2 mb-3">
                    <HeartIcon className="h-5 w-5 text-blue-600" />
                    <Typography variant="subtitle2" className="font-semibold">
                      Conditions chroniques
                    </Typography>
                  </div>
                  {medicalHistory.chronic_conditions.length > 0 ? (
                    <List dense>
                      {medicalHistory.chronic_conditions.map((condition, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={condition} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune condition chronique
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Current Medications Card */}
            <Grid item xs={12} md={6}>
              <Card className="h-full border border-gray-100">
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <BeakerIcon className="h-6 w-6 text-green-600" />
                    <Typography variant="h6" className="font-semibold">
                      Traitements en cours
                    </Typography>
                  </div>
                  {medicalHistory.current_medications.length > 0 ? (
                    <List dense>
                      {medicalHistory.current_medications.map((med, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={med} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucun traitement en cours
                    </Typography>
                  )}

                  <Divider className="my-4" />

                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600" />
                    <Typography variant="subtitle2" className="font-semibold">
                      Antécédents chirurgicaux
                    </Typography>
                  </div>
                  {medicalHistory.past_surgeries.length > 0 ? (
                    <List dense>
                      {medicalHistory.past_surgeries.map((surgery, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={surgery} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune chirurgie
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Documents */}
            <Grid item xs={12}>
              <Card className="border border-gray-100">
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Typography variant="h6" className="font-semibold">
                      Documents récents
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setCurrentTab(1)}
                      sx={{ textTransform: 'none' }}
                    >
                      Voir tout
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {mockDocuments.slice(0, 3).map((doc) => (
                      <Paper key={doc.id} className="p-4 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                              {getDocumentIcon(doc.type)}
                            </div>
                            <div>
                              <Typography variant="subtitle2" className="font-semibold">
                                {doc.title}
                              </Typography>
                              <Typography variant="caption" className="text-gray-500">
                                {doc.doctor_name} • {formatDate(doc.date)}
                              </Typography>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <IconButton size="small" color="primary">
                              <EyeIcon className="h-5 w-5" />
                            </IconButton>
                            <IconButton size="small" color="primary">
                              <ArrowDownTrayIcon className="h-5 w-5" />
                            </IconButton>
                          </div>
                        </div>
                      </Paper>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {currentTab === 1 && (
          <Paper className="p-6 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <Typography variant="h6" className="font-semibold">
                Mes documents
              </Typography>
              <Button
                variant="contained"
                sx={{
                  background: 'linear-gradient(to right, #2563EB, #3B82F6)',
                  '&:hover': {
                    background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
                  },
                  textTransform: 'none',
                }}
              >
                Téléverser un document
              </Button>
            </div>

            <div className="space-y-3">
              {mockDocuments.map((doc) => (
                <Paper key={doc.id} className="p-4 border border-gray-100 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                        {getDocumentIcon(doc.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Typography variant="subtitle1" className="font-semibold">
                            {doc.title}
                          </Typography>
                          <Chip
                            label={getDocumentTypeLabel(doc.type)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </div>
                        <Typography variant="body2" className="text-gray-600">
                          {doc.doctor_name}
                        </Typography>
                        <div className="flex items-center gap-1 mt-1">
                          <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                          <Typography variant="caption" className="text-gray-500">
                            {formatDate(doc.date)}
                          </Typography>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EyeIcon className="h-4 w-4" />}
                        onClick={() => setViewDocument(doc)}
                        sx={{ textTransform: 'none' }}
                      >
                        Voir
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                        sx={{ textTransform: 'none' }}
                      >
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </Paper>
              ))}
            </div>
          </Paper>
        )}

        {currentTab === 2 && (
          <Paper className="p-6 rounded-xl border border-gray-100">
            <Typography variant="h6" className="font-semibold mb-6">
              Historique des consultations
            </Typography>
            <div className="space-y-4">
              {pastConsultations.map((consultation) => (
                <Card key={consultation.id} className="border border-gray-100">
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Typography variant="h6" className="font-semibold">
                          {consultation.doctor}
                        </Typography>
                        <Typography variant="body2" color="primary" className="mb-1">
                          {consultation.specialty}
                        </Typography>
                        <div className="flex items-center gap-1">
                          <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                          <Typography variant="caption" className="text-gray-500">
                            {formatDate(consultation.date)}
                          </Typography>
                        </div>
                      </div>
                    </div>
                    <Divider className="my-3" />
                    <div className="mb-2">
                      <Typography variant="subtitle2" className="font-semibold mb-1">
                        Motif de consultation
                      </Typography>
                      <Typography variant="body2" className="text-gray-700">
                        {consultation.reason}
                      </Typography>
                    </div>
                    {consultation.notes && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <Typography variant="subtitle2" className="font-semibold mb-1">
                          Notes
                        </Typography>
                        <Typography variant="body2" className="text-gray-700">
                          {consultation.notes}
                        </Typography>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </Paper>
        )}

        {/* Document Viewer Dialog */}
        <Dialog
          open={!!viewDocument}
          onClose={() => setViewDocument(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <div className="flex items-center gap-3">
              {viewDocument && getDocumentIcon(viewDocument.type)}
              <div>
                <Typography variant="h6">{viewDocument?.title}</Typography>
                <Typography variant="caption" className="text-gray-500">
                  {viewDocument && formatDate(viewDocument.date)}
                </Typography>
              </div>
            </div>
          </DialogTitle>
          <DialogContent>
            <div className="bg-gray-100 p-8 rounded text-center">
              <DocumentTextIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <Typography variant="body2" className="text-gray-600">
                Prévisualisation du document disponible ici
              </Typography>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDocument(null)}>Fermer</Button>
            <Button
              variant="contained"
              startIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
            >
              Télécharger
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  )
}
