import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { quizApi, sessionApi } from '../../services/api'
import type { Quiz, Session } from '../../types'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  // New quiz dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newQuizTitle, setNewQuizTitle] = useState('')
  const [newQuizDescription, setNewQuizDescription] = useState('')

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
      })
      setDialogOpen(false)
      setNewQuizTitle('')
      setNewQuizDescription('')
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
        Admin Dashboard
      </Typography>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.dark' }}>
          <Typography variant="h5" gutterBottom>
            Active Sessions
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
            Quizzes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Quiz
          </Button>
        </Box>

        {quizzes.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No quizzes yet. Create your first quiz!
          </Typography>
        ) : (
          <List>
            {quizzes.map((quiz) => (
              <ListItem 
                key={quiz.id}
                sx={{ bgcolor: 'background.default', borderRadius: 2, mb: 1 }}
              >
                <ListItemText
                  primary={quiz.title}
                  secondary={`${quiz.questionCount} questions`}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    color="primary"
                    onClick={() => handleStartSession(quiz.id)}
                    title="Start Session"
                  >
                    <PlayArrowIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => navigate(`/admin/quiz/${quiz.id}`)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error"
                    onClick={() => setDeleteId(quiz.id)}
                    title="Delete"
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
        <DialogTitle>Create New Quiz</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Quiz Title"
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description (optional)"
            value={newQuizDescription}
            onChange={(e) => setNewQuizDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateQuiz}
            disabled={!newQuizTitle.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Quiz?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete the quiz and all its questions. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteQuiz}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
