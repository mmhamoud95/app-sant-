"use client"
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthedAxios } from '@/hooks/useAuthedAxios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Paper,
  Typography,
  Container,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Box,
  Chip,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
} from '@mui/material'
import {
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

type Message = {
  id: number
  sender_id: number
  sender_name: string
  sender_role: 'patient' | 'doctor'
  content: string
  created_at: string
  read: boolean
  attachment_url?: string | null
}

type Conversation = {
  doctor_id: number
  doctor_name: string
  last_message: string
  last_message_date: string
  unread_count: number
}

export default function MessagesPage() {
  const { status } = useSession()
  const axios = useAuthedAxios()
  const queryClient = useQueryClient()
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [uploadDialog, setUploadDialog] = useState(false)

  // Mock data for now - will be replaced with real API calls
  const mockConversations: Conversation[] = [
    {
      doctor_id: 1,
      doctor_name: 'Dr. Martin Dupont',
      last_message: 'Bonjour, comment allez-vous?',
      last_message_date: new Date().toISOString(),
      unread_count: 2,
    },
  ]

  const mockMessages: Message[] = [
    {
      id: 1,
      sender_id: 1,
      sender_name: 'Dr. Martin Dupont',
      sender_role: 'doctor',
      content: 'Bonjour, comment allez-vous?',
      created_at: new Date().toISOString(),
      read: false,
    },
  ]

  if (status !== 'authenticated') {
    return (
      <DashboardLayout userRole="patient">
        <Container maxWidth="lg" className="py-8">
          <Alert severity="info">Veuillez vous connecter pour accéder à vos messages.</Alert>
        </Container>
      </DashboardLayout>
    )
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 1) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Hier'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' })
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <DashboardLayout userRole="patient">
      <Container maxWidth="lg" className="py-4 md:py-8 px-4 md:px-6">
        <Paper className="rounded-xl border border-gray-100 overflow-hidden" style={{ height: '75vh' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={`${selectedDoctor ? 'hidden md:block' : 'block'} w-full md:w-1/3 border-r border-gray-200 overflow-y-auto`}>
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500">
                <div className="flex items-center gap-3">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
                  <Typography variant="h5" className="font-bold text-white">
                    Messages
                  </Typography>
                </div>
              </div>

              <List>
                {mockConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                    <Typography variant="body2" color="text.secondary">
                      Aucune conversation
                    </Typography>
                  </div>
                ) : (
                  mockConversations.map((conv) => (
                    <div key={conv.doctor_id}>
                      <ListItem
                        disablePadding
                      >
                        <ListItemButton
                          selected={selectedDoctor === conv.doctor_id}
                          onClick={() => setSelectedDoctor(conv.doctor_id)}
                          className={`hover:bg-blue-50 ${selectedDoctor === conv.doctor_id ? 'bg-blue-50' : ''}`}
                        >
                          <ListItemAvatar>
                            <Badge badgeContent={conv.unread_count} color="error">
                              <Avatar className="bg-blue-100">
                                <UserCircleIcon className="h-6 w-6 text-blue-600" />
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" className="font-semibold">
                                {conv.doctor_name}
                              </Typography>
                            }
                            secondary={
                              <div className="flex justify-between items-center">
                                <Typography variant="body2" className="text-gray-600 truncate">
                                  {conv.last_message}
                                </Typography>
                                <Typography variant="caption" className="text-gray-500 ml-2">
                                  {formatDate(conv.last_message_date)}
                                </Typography>
                              </div>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </div>
                  ))
                )}
              </List>
            </div>

            {/* Messages Panel */}
            <div className={`${selectedDoctor ? 'block' : 'hidden md:block'} w-full md:w-2/3 flex flex-col`}>
              {!selectedDoctor ? (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <ChatBubbleLeftRightIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                    <Typography variant="h6" className="text-gray-500">
                      Sélectionnez une conversation
                    </Typography>
                    <Typography variant="body2" className="text-gray-400">
                      Choisissez un praticien pour voir vos messages
                    </Typography>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
                    <IconButton 
                      className="md:hidden" 
                      onClick={() => setSelectedDoctor(null)}
                    >
                      <ArrowLeftIcon className="h-5 w-5" />
                    </IconButton>
                    <Avatar className="bg-blue-100">
                      <UserCircleIcon className="h-6 w-6 text-blue-600" />
                    </Avatar>
                    <div>
                      <Typography variant="subtitle1" className="font-semibold">
                        {mockConversations.find(c => c.doctor_id === selectedDoctor)?.doctor_name}
                      </Typography>
                      <Typography variant="caption" className="text-gray-500">
                        En ligne
                      </Typography>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {mockMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`mb-4 flex ${msg.sender_role === 'patient' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-xl p-3 ${
                            msg.sender_role === 'patient'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          <Typography variant="body2">{msg.content}</Typography>
                          {msg.attachment_url && (
                            <div className="mt-2 p-2 bg-white/10 rounded flex items-center gap-2">
                              <PaperClipIcon className="h-4 w-4" />
                              <Typography variant="caption">Document joint</Typography>
                            </div>
                          )}
                          <Typography
                            variant="caption"
                            className={`block mt-1 ${
                              msg.sender_role === 'patient' ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatDate(msg.created_at)}
                          </Typography>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex gap-2">
                      <IconButton onClick={() => setUploadDialog(true)} color="primary">
                        <PaperClipIcon className="h-5 w-5" />
                      </IconButton>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Écrivez votre message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && messageText.trim()) {
                            // Send message
                            setMessageText('')
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        disabled={!messageText.trim()}
                        sx={{
                          background: 'linear-gradient(to right, #2563EB, #3B82F6)',
                          '&:hover': {
                            background: 'linear-gradient(to right, #1D4ED8, #2563EB)',
                          },
                        }}
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Paper>

        {/* Upload Dialog */}
        <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)}>
          <DialogTitle>Joindre un document</DialogTitle>
          <DialogContent>
            <Typography variant="body2" className="mb-4">
              Sélectionnez un document médical à envoyer (ordonnance, compte rendu, examen, etc.)
            </Typography>
            <Button variant="outlined" component="label" fullWidth>
              Choisir un fichier
              <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" />
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialog(false)}>Annuler</Button>
            <Button variant="contained">Envoyer</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  )
}
