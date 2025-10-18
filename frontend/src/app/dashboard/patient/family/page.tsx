"use client"
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Paper,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Menu,
} from '@mui/material'
import {
  UserGroupIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  UserCircleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

type FamilyProfile = {
  id: number
  firstName: string
  lastName: string
  relationship: string
  dateOfBirth: string
  isPrimary: boolean
}

export default function FamilyProfilesPage() {
  const { status } = useSession()
  const [profiles, setProfiles] = useState<FamilyProfile[]>([
    {
      id: 1,
      firstName: 'Jean',
      lastName: 'Dupont',
      relationship: 'Titulaire',
      dateOfBirth: '1985-05-15',
      isPrimary: true,
    },
    {
      id: 2,
      firstName: 'Marie',
      lastName: 'Dupont',
      relationship: 'Conjoint(e)',
      dateOfBirth: '1987-08-22',
      isPrimary: false,
    },
    {
      id: 3,
      firstName: 'Lucas',
      lastName: 'Dupont',
      relationship: 'Enfant',
      dateOfBirth: '2015-03-10',
      isPrimary: false,
    },
  ])
  const [addDialog, setAddDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<FamilyProfile | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<FamilyProfile | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ anchor: HTMLElement; profile: FamilyProfile } | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    dateOfBirth: '',
  })

  if (status !== 'authenticated') {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="info">Veuillez vous connecter pour gérer vos profils familiaux.</Alert>
        </Container>
      </DashboardLayout>
    )
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleAddProfile = () => {
    const newProfile: FamilyProfile = {
      id: Date.now(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      relationship: formData.relationship,
      dateOfBirth: formData.dateOfBirth,
      isPrimary: false,
    }
    setProfiles([...profiles, newProfile])
    setAddDialog(false)
    setFormData({ firstName: '', lastName: '', relationship: '', dateOfBirth: '' })
  }

  const handleEditProfile = () => {
    if (!editDialog) return
    setProfiles(
      profiles.map((p) =>
        p.id === editDialog.id
          ? {
              ...p,
              firstName: formData.firstName,
              lastName: formData.lastName,
              relationship: formData.relationship,
              dateOfBirth: formData.dateOfBirth,
            }
          : p
      )
    )
    setEditDialog(null)
    setFormData({ firstName: '', lastName: '', relationship: '', dateOfBirth: '' })
  }

  const handleDeleteProfile = () => {
    if (!deleteDialog) return
    setProfiles(profiles.filter((p) => p.id !== deleteDialog.id))
    setDeleteDialog(null)
  }

  const openEditDialog = (profile: FamilyProfile) => {
    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      relationship: profile.relationship,
      dateOfBirth: profile.dateOfBirth,
    })
    setEditDialog(profile)
    setMenuAnchor(null)
  }

  const relationshipOptions = [
    'Titulaire',
    'Conjoint(e)',
    'Enfant',
    'Parent',
    'Frère/Sœur',
    'Autre',
  ]

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-4 md:py-8 px-4 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-green-500 p-3 rounded-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <Typography variant="h4" className="font-bold text-gray-800">
                  Profils Familiaux
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Gérez les rendez-vous de votre famille
                </Typography>
              </div>
            </div>
            <Button
              variant="contained"
              startIcon={<PlusIcon className="h-5 w-5" />}
              onClick={() => setAddDialog(true)}
              sx={{
                background: 'linear-gradient(to right, #10B981, #059669)',
                '&:hover': {
                  background: 'linear-gradient(to right, #059669, #047857)',
                },
                textTransform: 'none',
              }}
            >
              Ajouter un profil
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert severity="info" className="mb-6">
          <Typography variant="body2">
            Ajoutez les membres de votre famille pour prendre des rendez-vous en leur nom. Chaque profil a son propre historique médical.
          </Typography>
        </Alert>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className={`border transition-all hover:shadow-lg ${
                profile.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <Avatar
                    className={`${
                      profile.isPrimary ? 'bg-blue-600' : 'bg-green-600'
                    } w-14 h-14`}
                  >
                    <UserCircleIcon className="h-8 w-8" />
                  </Avatar>
                  {!profile.isPrimary && (
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchor({ anchor: e.currentTarget, profile })}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </IconButton>
                  )}
                </div>

                <Typography variant="h6" className="font-semibold mb-1">
                  {profile.firstName} {profile.lastName}
                </Typography>

                <div className="space-y-2">
                  <Chip
                    label={profile.relationship}
                    size="small"
                    color={profile.isPrimary ? 'primary' : 'default'}
                  />
                  <Typography variant="body2" className="text-gray-600">
                    {calculateAge(profile.dateOfBirth)} ans
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Né(e) le {new Date(profile.dateOfBirth).toLocaleDateString('fr-FR')}
                  </Typography>
                </div>

                {profile.isPrimary && (
                  <div className="mt-3 p-2 bg-blue-100 rounded">
                    <Typography variant="caption" className="text-blue-800 font-semibold">
                      Profil principal
                    </Typography>
                  </div>
                )}

                {!profile.isPrimary && (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    className="mt-4"
                    sx={{ textTransform: 'none' }}
                  >
                    Prendre rendez-vous
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor?.anchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => menuAnchor && openEditDialog(menuAnchor.profile)}
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Modifier
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                setDeleteDialog(menuAnchor.profile)
                setMenuAnchor(null)
              }
            }}
          >
            <TrashIcon className="h-5 w-5 mr-2 text-red-600" />
            <span className="text-red-600">Supprimer</span>
          </MenuItem>
        </Menu>

        {/* Add Profile Dialog */}
        <Dialog
          open={addDialog}
          onClose={() => setAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Ajouter un profil familial</DialogTitle>
          <DialogContent>
            <div className="space-y-4 mt-2">
              <TextField
                fullWidth
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Nom"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                select
                label="Relation"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                required
              >
                {relationshipOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                type="date"
                label="Date de naissance"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialog(false)}>Annuler</Button>
            <Button
              variant="contained"
              onClick={handleAddProfile}
              disabled={
                !formData.firstName ||
                !formData.lastName ||
                !formData.relationship ||
                !formData.dateOfBirth
              }
            >
              Ajouter
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog
          open={!!editDialog}
          onClose={() => setEditDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogContent>
            <div className="space-y-4 mt-2">
              <TextField
                fullWidth
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Nom"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                select
                label="Relation"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                required
              >
                {relationshipOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                type="date"
                label="Date de naissance"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(null)}>Annuler</Button>
            <Button variant="contained" onClick={handleEditProfile}>
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Profile Dialog */}
        <Dialog
          open={!!deleteDialog}
          onClose={() => setDeleteDialog(null)}
        >
          <DialogTitle>Supprimer ce profil ?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Êtes-vous sûr de vouloir supprimer le profil de{' '}
              <strong>
                {deleteDialog?.firstName} {deleteDialog?.lastName}
              </strong>{' '}
              ? Cette action est irréversible et supprimera également l&apos;historique des rendez-vous associé.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(null)}>Annuler</Button>
            <Button variant="contained" color="error" onClick={handleDeleteProfile}>
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  )
}
