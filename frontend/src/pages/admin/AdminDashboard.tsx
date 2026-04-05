import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import QrCodeIcon from '@mui/icons-material/QrCode'
import PrintIcon from '@mui/icons-material/Print'
import { quizApi, sessionApi } from '../../services/api'
import type { Quiz, Session } from '../../types'

// Supported languages for quiz content
const SUPPORTED_QUIZ_LANGUAGES = [
  { code: 'da', name: 'Dansk' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
]

export default function AdminDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  // New quiz dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [newQuizDescription, setNewQuizDescription] = useState('')
  const [newQuizLanguage, setNewQuizLanguage] = useState('en')

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [quizzesData, sessionsData] = await Promise.all([
        quizApi.getAll(),
        sessionApi.getActive(),
      ])
      setQuizzes(quizzesData)
      setActiveSessions(sessionsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuiz = async () => {
    if (!newQuizTitle.trim()) return

    try {
      const quiz = await quizApi.create({
        title: newQuizTitle.trim(),
        description: newQuizDescription.trim() || undefined,
        defaultLanguage: newQuizLanguage,
      })
      setDialogOpen(false)
      setNewQuizTitle('')
      setNewQuizDescription('')
      setNewQuizLanguage('en')
      navigate(`/admin/quiz/${quiz.id}`)
    } catch (error) {
      console.error('Failed to create quiz:', error)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!deleteId) return

    try {
      await quizApi.delete(deleteId)
      setQuizzes(quizzes.filter((q) => q.id !== deleteId))
      setDeleteId(null)
    } catch (error) {
      console.error('Failed to delete quiz:', error)
    }
  }

  const handleStartSession = async (quizId: string) => {
    try {
      const session = await sessionApi.create(quizId)
      navigate(`/admin/live/${session.id}`)
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        {t('admin.dashboard')}
      </Typography>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.dark' }}>
          <Typography variant="h5" gutterBottom>
            {t('admin.activeSessions')}
          </Typography>
          <List>
            {activeSessions.map((session) => (
              <ListItem 
                key={session.id}
                component="div"
                onClick={() => navigate(`/admin/live/${session.id}`)}
                sx={{ 
                  bgcolor: 'background.paper', 
                  borderRadius: 2, 
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemText
                  primary={session.quizTitle}
                  secondary={`Code: ${session.joinCode} | ${session.participantCount} players | ${session.status}`}
                />
                <Chip 
                  label={session.status} 
                  color={session.status === 'Active' ? 'success' : 'default'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Quizzes */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            {t('admin.quizzes')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            {t('admin.newQuiz')}
          </Button>
        </Box>

        {quizzes.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('admin.noQuizzesYet')}
          </Typography>
        ) : (
          <List>
            {quizzes.map((quiz) => (
              <ListItem 
                key={quiz.id}
                sx={{ bgcolor: 'background.default', borderRadius: 2, mb: 1 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {quiz.title}
                      {quiz.fixedJoinCode && (
                        <Tooltip title={t('admin.fixedCode', { code: quiz.fixedJoinCode })}>
                          <Chip
                            icon={<QrCodeIcon />}
                            label={quiz.fixedJoinCode}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={t('admin.questionsCount', { count: quiz.questionCount })}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    color="primary"
                    onClick={() => handleStartSession(quiz.id)}
                    title={t('admin.startSession')}
                  >
                    <PlayArrowIcon />
                  </IconButton>
                  {quiz.fixedJoinCode && (
                    <IconButton
                      color="secondary"
                      onClick={() => window.open(`/admin/quiz/${quiz.id}/print`, '_blank')}
                      title={t('admin.printQrCodes')}
                    >
                      <PrintIcon />
                    </IconButton>
                  )}
                  <IconButton 
                    onClick={() => navigate(`/admin/quiz/${quiz.id}`)}
                    title={t('admin.edit')}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error"
                    onClick={() => setDeleteId(quiz.id)}
                    title={t('common.delete')}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* FAB for quick add */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* New Quiz Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.createNewQuiz')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t('admin.quizTitle')}
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('admin.descriptionOptional')}
            value={newQuizDescription}
            onChange={(e) => setNewQuizDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="quiz-language-label">{t('admin.quizLanguage')}</InputLabel>
            <Select
              labelId="quiz-language-label"
              value={newQuizLanguage}
              label={t('admin.quizLanguage')}
              onChange={(e) => setNewQuizLanguage(e.target.value)}
            >
              {SUPPORTED_QUIZ_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateQuiz}
            disabled={!newQuizTitle.trim()}
          >
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t('admin.deleteQuiz')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.deleteQuizConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDeleteQuiz}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
