import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ImageIcon from '@mui/icons-material/Image'
import StarIcon from '@mui/icons-material/Star'
import LanguageIcon from '@mui/icons-material/Language'
import { quizApi } from '../../services/api'
import type { Question, QuizLanguage } from '../../types'

const API_URL = import.meta.env.VITE_API_URL || ''

// Supported languages for quiz content
const SUPPORTED_QUIZ_LANGUAGES = [
  { code: 'da', name: 'Dansk' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
]

interface QuestionForm {
  id?: string
  text: string
  imageUrl?: string
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
  const { t } = useTranslation()
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
  const [languages, setLanguages] = useState<QuizLanguage[]>([])
  const [newLanguageCode, setNewLanguageCode] = useState('')

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
      setLanguages(quiz.languages || [])
      setQuestions(
        quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          imageUrl: q.imageUrl,
          timeLimitSeconds: q.timeLimitSeconds,
          answerOptions: q.answerOptions.map((a) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        }))
      )
    } catch (err) {
      setError(t('quizEditor.failedToLoadQuiz'))
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
        setError(t('quizEditor.failedToDeleteQuestion'))
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
      setError(t('quizEditor.questionTextRequired'))
      return
    }
    if (!question.answerOptions.some((a) => a.text.trim())) {
      setError(t('quizEditor.atLeastOneAnswer'))
      return
    }
    if (!question.answerOptions.some((a) => a.isCorrect)) {
      setError(t('quizEditor.markOneCorrect'))
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
      setError(t('quizEditor.failedToSaveQuestion'))
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (index: number, file: File) => {
    const question = questions[index]
    if (!question.id) {
      setError(t('quizEditor.saveQuestionBeforeImage'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await quizApi.uploadQuestionImage(question.id, file)
      const updated = [...questions]
      updated[index] = { ...updated[index], imageUrl: result.imageUrl }
      setQuestions(updated)
    } catch (err) {
      setError(t('quizEditor.failedToUploadImage'))
    } finally {
      setSaving(false)
    }
  }

  const handleImageDelete = async (index: number) => {
    const question = questions[index]
    if (!question.id) return

    setSaving(true)
    setError('')

    try {
      await quizApi.deleteQuestionImage(question.id)
      const updated = [...questions]
      updated[index] = { ...updated[index], imageUrl: undefined }
      setQuestions(updated)
    } catch (err) {
      setError(t('quizEditor.failedToDeleteImage'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddLanguage = async () => {
    if (!newLanguageCode || !id) return
    
    // Check if language already exists
    if (languages.some(l => l.languageCode === newLanguageCode)) {
      setError(t('quizEditor.languageAlreadyExists'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const newLang = await quizApi.addLanguage(id, newLanguageCode)
      setLanguages([...languages, newLang])
      setNewLanguageCode('')
    } catch (err) {
      setError(t('quizEditor.failedToAddLanguage'))
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefaultLanguage = async (languageCode: string) => {
    if (!id) return

    setSaving(true)
    setError('')

    try {
      await quizApi.setDefaultLanguage(id, languageCode)
      setLanguages(languages.map(l => ({
        ...l,
        isDefault: l.languageCode === languageCode
      })))
    } catch (err) {
      setError(t('quizEditor.failedToSetDefaultLanguage'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLanguage = async (languageCode: string) => {
    if (!id) return
    
    // Check if this is the default language
    const lang = languages.find(l => l.languageCode === languageCode)
    if (lang?.isDefault) {
      setError(t('quizEditor.cannotDeleteDefaultLanguage'))
      return
    }

    setSaving(true)
    setError('')

    try {
      await quizApi.deleteLanguage(id, languageCode)
      setLanguages(languages.filter(l => l.languageCode !== languageCode))
    } catch (err) {
      setError(t('quizEditor.failedToDeleteLanguage'))
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
          useFixedJoinCode,
          defaultLanguage: 'en'  // Default to English for new quizzes created directly
        })
        setFixedJoinCode(quiz.fixedJoinCode || null)
        setLanguages(quiz.languages || [])
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
      setError(t('quizEditor.failedToSaveQuiz'))
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
          {isNew ? t('quizEditor.newQuiz') : t('quizEditor.editQuiz')}
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
          label={t('admin.quizTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          rows={2}
          label={t('admin.descriptionOptional')}
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
                  <span>{t('quizEditor.useFixedQrCode')}</span>
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
                {t('quizEditor.fixedJoinCode')}
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
                {t('quizEditor.playersCanJoinAt', { url: `${window.location.origin}/join?code=${fixedJoinCode}` })}
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
          {saving ? t('quizEditor.saving') : t('quizEditor.saveQuiz')}
        </Button>
      </Paper>

      {/* Language Management */}
      {!isNew && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LanguageIcon />
            <Typography variant="h6">{t('quizEditor.languages')}</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('quizEditor.languagesDescription')}
          </Typography>

          {/* Current Languages */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {languages.map((lang) => {
              const langInfo = SUPPORTED_QUIZ_LANGUAGES.find(l => l.code === lang.languageCode)
              return (
                <Chip
                  key={lang.id}
                  label={langInfo?.name || lang.languageCode}
                  icon={lang.isDefault ? <StarIcon /> : undefined}
                  color={lang.isDefault ? 'primary' : 'default'}
                  onDelete={lang.isDefault ? undefined : () => handleDeleteLanguage(lang.languageCode)}
                  onClick={lang.isDefault ? undefined : () => handleSetDefaultLanguage(lang.languageCode)}
                  title={lang.isDefault ? t('quizEditor.defaultLanguage') : t('quizEditor.clickToSetDefault')}
                />
              )
            })}
          </Box>

          {/* Add New Language */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="add-language-label">{t('quizEditor.addLanguage')}</InputLabel>
              <Select
                labelId="add-language-label"
                value={newLanguageCode}
                label={t('quizEditor.addLanguage')}
                onChange={(e) => setNewLanguageCode(e.target.value)}
              >
                {SUPPORTED_QUIZ_LANGUAGES
                  .filter(lang => !languages.some(l => l.languageCode === lang.code))
                  .map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddLanguage}
              disabled={!newLanguageCode || saving}
            >
              {t('common.add')}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Questions */}
      {!isNew && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">{t('quizEditor.questions')}</Typography>
            <Button startIcon={<AddIcon />} onClick={handleAddQuestion}>
              {t('quizEditor.addQuestion')}
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
                    {qIndex + 1}. {question.text || t('quizEditor.noText')}
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
                      label={t('quizEditor.questionText')}
                      value={question.text}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      type="number"
                      label={t('quizEditor.timeLimitSeconds')}
                      value={question.timeLimitSeconds}
                      onChange={(e) => handleQuestionChange(qIndex, 'timeLimitSeconds', parseInt(e.target.value) || 15)}
                      sx={{ mb: 2, width: 200 }}
                    />

                    {/* Image Upload */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {t('quizEditor.questionImage')}
                      </Typography>
                      {question.imageUrl ? (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box
                            component="img"
                            src={`${API_URL}${question.imageUrl}`}
                            alt="Question image"
                            sx={{
                              maxWidth: 200,
                              maxHeight: 150,
                              objectFit: 'contain',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleImageDelete(qIndex)}
                            disabled={saving}
                          >
                            {t('quizEditor.remove')}
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<ImageIcon />}
                          disabled={saving || !question.id}
                        >
                          {question.id ? t('quizEditor.uploadImage') : t('quizEditor.saveQuestionFirst')}
                          <input
                            type="file"
                            hidden
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(qIndex, file)
                              e.target.value = ''
                            }}
                          />
                        </Button>
                      )}
                    </Box>

                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      {t('quizEditor.answersHint')}
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
                          placeholder={t('quizEditor.answerPlaceholder', { number: aIndex + 1 })}
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
                        {saving ? t('quizEditor.saving') : t('quizEditor.saveQuestion')}
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
                {t('quizEditor.noQuestionsYet')}
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddQuestion} sx={{ mt: 2 }}>
                {t('quizEditor.addQuestion')}
              </Button>
            </Paper>
          )}
        </>
      )}
    </Container>
  )
}
