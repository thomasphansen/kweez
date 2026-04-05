import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  Checkbox,
  Divider,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { quizApi } from '../../services/api'
import type { Question } from '../../types'

interface QuestionForm {
  id?: string
  text: string
  timeLimitSeconds: number
  answerOptions: {
    id?: string
    text: string
    isCorrect: boolean
  }[]
}

const defaultQuestion: QuestionForm = {
  text: '',
  timeLimitSeconds: 15,
  answerOptions: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
}

export default function QuizEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [useFixedJoinCode, setUseFixedJoinCode] = useState(false)
  const [fixedJoinCode, setFixedJoinCode] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionForm[]>([])
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      loadQuiz(id)
    }
  }, [id])

  const loadQuiz = async (quizId: string) => {
    try {
      const quiz = await quizApi.getById(quizId)
      setTitle(quiz.title)
      setDescription(quiz.description || '')
      setFixedJoinCode(quiz.fixedJoinCode || null)
      setUseFixedJoinCode(!!quiz.fixedJoinCode)
      setQuestions(
        quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          timeLimitSeconds: q.timeLimitSeconds,
          answerOptions: q.answerOptions.map((a) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        }))
      )
    } catch (err) {
      setError('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, { ...defaultQuestion, answerOptions: defaultQuestion.answerOptions.map(a => ({...a})) }])
    setExpandedQuestion(questions.length)
  }

  const handleDeleteQuestion = async (index: number) => {
    const question = questions[index]
    if (question.id) {
      try {
        await quizApi.deleteQuestion(question.id)
      } catch (err) {
        setError('Failed to delete question')
        return
      }
    }
    setQuestions(questions.filter((_, i) => i !== index))
    setExpandedQuestion(null)
  }

  const handleQuestionChange = (index: number, field: keyof QuestionForm, value: unknown) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleAnswerChange = (qIndex: number, aIndex: number, field: 'text' | 'isCorrect', value: unknown) => {
    const updated = [...questions]
    const answers = [...updated[qIndex].answerOptions]
    
    if (field === 'isCorrect' && value === true) {
      // Only one correct answer
      answers.forEach((a, i) => {
        a.isCorrect = i === aIndex
      })
    } else {
      answers[aIndex] = { ...answers[aIndex], [field]: value }
    }
    
    updated[qIndex].answerOptions = answers
    setQuestions(updated)
  }

  const handleSaveQuestion = async (index: number) => {
    const question = questions[index]
    if (!question.text.trim()) {
      setError('Question text is required')
      return
    }
    if (!question.answerOptions.some((a) => a.text.trim())) {
      setError('At least one answer is required')
      return
    }
    if (!question.answerOptions.some((a) => a.isCorrect)) {
      setError('Mark one answer as correct')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (question.id) {
        // Update existing
        await quizApi.updateQuestion(question.id, {
          text: question.text,
          timeLimitSeconds: question.timeLimitSeconds,
          answerOptions: question.answerOptions.filter((a) => a.text.trim()),
        })
      } else if (id) {
        // Add new question to existing quiz
        const result = await quizApi.addQuestion(id, {
          text: question.text,
          timeLimitSeconds: question.timeLimitSeconds,
          answerOptions: question.answerOptions
            .filter((a) => a.text.trim())
            .map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        }) as Question
        // Update with returned ID
        const updated = [...questions]
        updated[index] = { ...question, id: result.id }
        setQuestions(updated)
      }
      setExpandedQuestion(null)
    } catch (err) {
      setError('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      setError('Quiz title is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isNew) {
        const quiz = await quizApi.create({ 
          title, 
          description: description || undefined,
          useFixedJoinCode 
        })
        setFixedJoinCode(quiz.fixedJoinCode || null)
        navigate(`/admin/quiz/${quiz.id}`, { replace: true })
      } else {
        const quiz = await quizApi.update(id!, { 
          title, 
          description: description || undefined,
          useFixedJoinCode 
        })
        setFixedJoinCode(quiz.fixedJoinCode || null)
      }
    } catch (err) {
      setError('Failed to save quiz')
    } finally {
      setSaving(false)
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {isNew ? 'New Quiz' : 'Edit Quiz'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Quiz Details */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          label="Quiz Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        {/* Fixed QR Code Option */}
        <Box sx={{ mb: 2 }}>
          <Tooltip title="Enable this to use a permanent QR code that you can print in advance. The same code will be used every time you start this quiz.">
            <FormControlLabel
              control={
                <Switch
                  checked={useFixedJoinCode}
                  onChange={(e) => setUseFixedJoinCode(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCodeIcon fontSize="small" />
                  <span>Use fixed QR code (for printing)</span>
                </Box>
              }
            />
          </Tooltip>
          
          {fixedJoinCode && (
            <Box 
              sx={{ 
                mt: 1, 
                p: 2, 
                bgcolor: 'primary.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Fixed Join Code:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 'bold',
                    letterSpacing: 2
                  }}
                >
                  {fixedJoinCode}
                </Typography>
                <IconButton 
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(fixedJoinCode)
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Players can join at: {window.location.origin}/join?code={fixedJoinCode}
              </Typography>
            </Box>
          )}
        </Box>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveQuiz}
          disabled={saving || !title.trim()}
        >
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </Paper>

      {/* Questions */}
      {!isNew && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Questions</Typography>
            <Button startIcon={<AddIcon />} onClick={handleAddQuestion}>
              Add Question
            </Button>
          </Box>

          <List>
            {questions.map((question, qIndex) => (
              <Paper key={question.id || qIndex} sx={{ mb: 2 }}>
                <ListItem
                  component="div"
                  onClick={() => setExpandedQuestion(expandedQuestion === qIndex ? null : qIndex)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography sx={{ flex: 1 }}>
                    {qIndex + 1}. {question.text || '(No text)'}
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteQuestion(qIndex)
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItem>

                {expandedQuestion === qIndex && (
                  <Box sx={{ p: 3, pt: 0 }}>
                    <Divider sx={{ mb: 2 }} />
                    <TextField
                      fullWidth
                      label="Question Text"
                      value={question.text}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      type="number"
                      label="Time Limit (seconds)"
                      value={question.timeLimitSeconds}
                      onChange={(e) => handleQuestionChange(qIndex, 'timeLimitSeconds', parseInt(e.target.value) || 15)}
                      sx={{ mb: 2, width: 200 }}
                    />

                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Answers (check the correct one):
                    </Typography>
                    {question.answerOptions.map((answer, aIndex) => (
                      <Box key={aIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Checkbox
                          checked={answer.isCorrect}
                          onChange={(e) => handleAnswerChange(qIndex, aIndex, 'isCorrect', e.target.checked)}
                          color="success"
                        />
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`Answer ${aIndex + 1}`}
                          value={answer.text}
                          onChange={(e) => handleAnswerChange(qIndex, aIndex, 'text', e.target.value)}
                        />
                      </Box>
                    ))}

                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => handleSaveQuestion(qIndex)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Question'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            ))}
          </List>

          {questions.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No questions yet. Add your first question!
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddQuestion} sx={{ mt: 2 }}>
                Add Question
              </Button>
            </Paper>
          )}
        </>
      )}
    </Container>
  )
}
