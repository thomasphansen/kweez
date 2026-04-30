import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert,
  Switch,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import TranslateIcon from '@mui/icons-material/Translate'
import { quizApi, translationApi } from '../../services/api'
import type { QuizLanguage, QuizWithTranslations, QuestionWithTranslations, QuestionTranslationContent } from '../../types'

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
  imageUrl?: string
  timeLimitSeconds: number
  correctAnswerIndex: number
  answerOptionIds: string[]
  translations: Record<string, QuestionTranslationContent>
}

const createEmptyTranslations = (languages: QuizLanguage[]): Record<string, QuestionTranslationContent> => {
  const translations: Record<string, QuestionTranslationContent> = {}
  for (const lang of languages) {
    translations[lang.languageCode] = {
      questionText: '',
      answerTexts: ['', '', '', ''],
    }
  }
  return translations
}

const defaultQuestion = (languages: QuizLanguage[]): QuestionForm => ({
  timeLimitSeconds: 15,
  correctAnswerIndex: 0,
  answerOptionIds: [],
  translations: createEmptyTranslations(languages),
})

interface SortableQuestionItemProps {
  question: QuestionForm
  qIndex: number
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  getQuestionPreviewText: (question: QuestionForm) => string
  children: React.ReactNode
}

function SortableQuestionItem({
  question,
  qIndex,
  isExpanded,
  onToggleExpand,
  onDelete,
  getQuestionPreviewText,
  children,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id || `new-${qIndex}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper ref={setNodeRef} style={style} sx={{ mb: 2 }}>
      <ListItem
        component="div"
        sx={{ cursor: 'pointer' }}
      >
        <IconButton
          {...attributes}
          {...listeners}
          sx={{ 
            cursor: 'grab',
            mr: 1,
            '&:active': { cursor: 'grabbing' },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DragIndicatorIcon />
        </IconButton>
        <Typography 
          sx={{ flex: 1 }} 
          onClick={onToggleExpand}
        >
          {qIndex + 1}. {getQuestionPreviewText(question)}
        </Typography>
        <IconButton
          color="error"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <DeleteIcon />
        </IconButton>
      </ListItem>

      {isExpanded && children}
    </Paper>
  )
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
  const [selectedLanguageTabs, setSelectedLanguageTabs] = useState<Record<number, string>>({})

  // Translation feature state
  const [translationAvailable, setTranslationAvailable] = useState(false)
  const [translatingQuestion, setTranslatingQuestion] = useState<number | null>(null)
  const [autoTranslateOnAdd, setAutoTranslateOnAdd] = useState(false)
  const [addingLanguageWithTranslation, setAddingLanguageWithTranslation] = useState(false)
  const [confirmTranslateDialog, setConfirmTranslateDialog] = useState<{
    open: boolean
    questionIndex: number
    targetLang: string
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (id) {
      loadQuiz(id)
    }
  }, [id])

  // Check if translation service is available
  useEffect(() => {
    const checkTranslationStatus = async () => {
      try {
        const status = await translationApi.getStatus()
        setTranslationAvailable(status.configured)
      } catch {
        setTranslationAvailable(false)
      }
    }
    checkTranslationStatus()
  }, [])

  const loadQuiz = async (quizId: string) => {
    try {
      const quiz: QuizWithTranslations = await quizApi.getWithTranslations(quizId)
      setTitle(quiz.title)
      setDescription(quiz.description || '')
      setFixedJoinCode(quiz.fixedJoinCode || null)
      setUseFixedJoinCode(!!quiz.fixedJoinCode)
      setLanguages(quiz.languages || [])
      setQuestions(
        quiz.questions.map((q: QuestionWithTranslations) => ({
          id: q.id,
          imageUrl: q.imageUrl,
          timeLimitSeconds: q.timeLimitSeconds,
          correctAnswerIndex: q.correctAnswerIndex,
          answerOptionIds: q.answerOptionIds,
          translations: q.translations,
        }))
      )
    } catch (err) {
      setError(t('quizEditor.failedToLoadQuiz'))
    } finally {
      setLoading(false)
    }
  }

  const getDefaultLanguage = (): string => {
    return languages.find(l => l.isDefault)?.languageCode || languages[0]?.languageCode || 'en'
  }

  const getSelectedLanguageTab = (questionIndex: number): string => {
    return selectedLanguageTabs[questionIndex] || getDefaultLanguage()
  }

  const handleLanguageTabChange = (questionIndex: number, languageCode: string) => {
    setSelectedLanguageTabs(prev => ({
      ...prev,
      [questionIndex]: languageCode,
    }))
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, defaultQuestion(languages)])
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = questions.findIndex(q => (q.id || `new-${questions.indexOf(q)}`) === active.id)
    const newIndex = questions.findIndex(q => (q.id || `new-${questions.indexOf(q)}`) === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newQuestions = arrayMove(questions, oldIndex, newIndex)
    setQuestions(newQuestions)

    // Update expanded question index if it was moved
    if (expandedQuestion !== null) {
      if (expandedQuestion === oldIndex) {
        setExpandedQuestion(newIndex)
      } else if (oldIndex < expandedQuestion && newIndex >= expandedQuestion) {
        setExpandedQuestion(expandedQuestion - 1)
      } else if (oldIndex > expandedQuestion && newIndex <= expandedQuestion) {
        setExpandedQuestion(expandedQuestion + 1)
      }
    }

    // Persist the new order to the backend (only for saved questions)
    const savedQuestionIds = newQuestions
      .filter(q => q.id)
      .map(q => q.id!)

    if (savedQuestionIds.length > 0 && id) {
      try {
        await quizApi.reorderQuestions(id, savedQuestionIds)
      } catch (err) {
        setError(t('quizEditor.failedToReorderQuestions'))
        // Revert on error
        setQuestions(questions)
      }
    }
  }

  const handleTimeLimitChange = (index: number, value: number) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], timeLimitSeconds: value }
    setQuestions(updated)
  }

  const handleCorrectAnswerChange = (index: number, answerIndex: number) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], correctAnswerIndex: answerIndex }
    setQuestions(updated)
  }

  const handleQuestionTextChange = (qIndex: number, languageCode: string, text: string) => {
    const updated = [...questions]
    const translations = { ...updated[qIndex].translations }
    translations[languageCode] = {
      ...translations[languageCode],
      questionText: text,
    }
    updated[qIndex] = { ...updated[qIndex], translations }
    setQuestions(updated)
  }

  const handleAnswerTextChange = (qIndex: number, languageCode: string, aIndex: number, text: string) => {
    const updated = [...questions]
    const translations = { ...updated[qIndex].translations }
    const answerTexts = [...(translations[languageCode]?.answerTexts || ['', '', '', ''])]
    answerTexts[aIndex] = text
    translations[languageCode] = {
      ...translations[languageCode],
      answerTexts,
    }
    updated[qIndex] = { ...updated[qIndex], translations }
    setQuestions(updated)
  }

  const handleSaveQuestion = async (index: number) => {
    const question = questions[index]
    const defaultLang = getDefaultLanguage()
    const defaultTranslation = question.translations[defaultLang]
    
    if (!defaultTranslation?.questionText.trim()) {
      setError(t('quizEditor.questionTextRequired'))
      return
    }
    if (!defaultTranslation?.answerTexts.some((a) => a.trim())) {
      setError(t('quizEditor.atLeastOneAnswer'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const requestData = {
        timeLimitSeconds: question.timeLimitSeconds,
        correctAnswerIndex: question.correctAnswerIndex,
        translations: question.translations,
      }

      if (question.id) {
        // Update existing question
        const result = await quizApi.updateQuestionTranslations(question.id, requestData)
        const updated = [...questions]
        updated[index] = {
          ...updated[index],
          translations: result.translations,
          correctAnswerIndex: result.correctAnswerIndex,
        }
        setQuestions(updated)
      } else if (id) {
        // Add new question to existing quiz
        const result = await quizApi.addQuestionWithTranslations(id, requestData)
        const updated = [...questions]
        updated[index] = {
          ...question,
          id: result.id,
          answerOptionIds: result.answerOptionIds,
          translations: result.translations,
        }
        setQuestions(updated)
      }
      setExpandedQuestion(null)
    } catch (err) {
      setError(t('quizEditor.failedToSaveQuestion'))
    } finally {
      setSaving(false)
    }
  }

  const handleTranslateQuestion = async (questionIndex: number, targetLang: string, skipConfirmation = false) => {
    const question = questions[questionIndex]
    const defaultLang = getDefaultLanguage()
    const defaultTranslation = question.translations[defaultLang]
    const targetTranslation = question.translations[targetLang]

    // Check if target has existing content and show confirmation
    if (!skipConfirmation) {
      const hasExistingContent = targetTranslation && (
        targetTranslation.questionText.trim() ||
        targetTranslation.answerTexts.some(a => a.trim())
      )
      
      if (hasExistingContent) {
        setConfirmTranslateDialog({
          open: true,
          questionIndex,
          targetLang,
        })
        return
      }
    }

    // Close confirmation dialog if open
    setConfirmTranslateDialog(null)

    if (!defaultTranslation?.questionText.trim()) {
      setError(t('quizEditor.noSourceTextToTranslate'))
      return
    }

    setTranslatingQuestion(questionIndex)
    setError('')

    try {
      // Combine question text and answers into one array
      const textsToTranslate = [
        defaultTranslation.questionText,
        ...defaultTranslation.answerTexts
      ]

      const response = await translationApi.translate(textsToTranslate, defaultLang, targetLang)
      
      // Update the question with translated content
      const updated = [...questions]
      const translations = { ...updated[questionIndex].translations }
      translations[targetLang] = {
        questionText: response.translations[0],
        answerTexts: response.translations.slice(1),
      }
      updated[questionIndex] = { ...updated[questionIndex], translations }
      setQuestions(updated)
    } catch (err) {
      setError(t('quizEditor.translationFailed'))
    } finally {
      setTranslatingQuestion(null)
    }
  }

  const getTranslateButtonTooltip = (question: QuestionForm, lang: QuizLanguage): string => {
    if (!question.id) {
      return t('quizEditor.saveQuestionBeforeTranslate')
    }
    if (!translationAvailable) {
      return t('quizEditor.translationNotConfigured')
    }
    if (lang.isDefault) {
      return t('quizEditor.cannotTranslateDefaultLanguage')
    }
    return ''
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
      const updatedLanguages = [...languages, newLang]
      setLanguages(updatedLanguages)
      
      const defaultLang = getDefaultLanguage()
      const shouldAutoTranslate = autoTranslateOnAdd && translationAvailable && questions.some(q => q.id)

      if (shouldAutoTranslate) {
        setAddingLanguageWithTranslation(true)
        
        // Get saved questions that have content in default language
        const questionsToTranslate = questions.filter(q => 
          q.id && q.translations[defaultLang]?.questionText.trim()
        )

        if (questionsToTranslate.length > 0) {
          try {
            const bulkRequest = questionsToTranslate.map(q => ({
              questionId: q.id!,
              questionText: q.translations[defaultLang].questionText,
              answerTexts: q.translations[defaultLang].answerTexts,
            }))

            const response = await translationApi.translateBulk(bulkRequest, defaultLang, newLanguageCode)
            
            // Update questions with translations
            setQuestions(questions.map(q => {
              if (!q.id) {
                // New unsaved question - copy from default
                const defaultTranslation = q.translations[defaultLang]
                return {
                  ...q,
                  translations: {
                    ...q.translations,
                    [newLanguageCode]: {
                      questionText: defaultTranslation?.questionText || '',
                      answerTexts: [...(defaultTranslation?.answerTexts || ['', '', '', ''])],
                    },
                  },
                }
              }

              const translatedResult = response.results.find(r => r.questionId === q.id)
              if (translatedResult && translatedResult.success) {
                return {
                  ...q,
                  translations: {
                    ...q.translations,
                    [newLanguageCode]: {
                      questionText: translatedResult.questionText,
                      answerTexts: translatedResult.answerTexts,
                    },
                  },
                }
              } else {
                // Translation failed for this question - copy from default
                const defaultTranslation = q.translations[defaultLang]
                return {
                  ...q,
                  translations: {
                    ...q.translations,
                    [newLanguageCode]: {
                      questionText: defaultTranslation?.questionText || '',
                      answerTexts: [...(defaultTranslation?.answerTexts || ['', '', '', ''])],
                    },
                  },
                }
              }
            }))

            // Report any errors
            if (response.errors.length > 0) {
              setError(t('quizEditor.someTranslationsFailed', { 
                count: response.errors.length,
                total: response.totalCount 
              }))
            }
          } catch (translationErr) {
            // Translation failed, but language was added - copy from default
            setQuestions(questions.map(q => {
              const defaultTranslation = q.translations[defaultLang]
              return {
                ...q,
                translations: {
                  ...q.translations,
                  [newLanguageCode]: {
                    questionText: defaultTranslation?.questionText || '',
                    answerTexts: [...(defaultTranslation?.answerTexts || ['', '', '', ''])],
                  },
                },
              }
            }))
            setError(t('quizEditor.autoTranslationFailed'))
          }
        }
        
        setAddingLanguageWithTranslation(false)
      } else {
        // No auto-translate - just copy from default language
        setQuestions(questions.map(q => {
          const defaultTranslation = q.translations[defaultLang]
          return {
            ...q,
            translations: {
              ...q.translations,
              [newLanguageCode]: {
                questionText: defaultTranslation?.questionText || '',
                answerTexts: [...(defaultTranslation?.answerTexts || ['', '', '', ''])],
              },
            },
          }
        }))
      }
      
      setNewLanguageCode('')
      setAutoTranslateOnAdd(false)
    } catch (err) {
      setError(t('quizEditor.failedToAddLanguage'))
    } finally {
      setSaving(false)
      setAddingLanguageWithTranslation(false)
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
      
      // Remove translations for the deleted language from all questions
      setQuestions(questions.map(q => {
        const translations = { ...q.translations }
        delete translations[languageCode]
        return { ...q, translations }
      }))
      
      // Reset selected tabs if they were on the deleted language
      setSelectedLanguageTabs(prev => {
        const updated = { ...prev }
        for (const key of Object.keys(updated)) {
          if (updated[parseInt(key)] === languageCode) {
            delete updated[parseInt(key)]
          }
        }
        return updated
      })
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

  const getQuestionPreviewText = (question: QuestionForm): string => {
    const defaultLang = getDefaultLanguage()
    return question.translations[defaultLang]?.questionText || t('quizEditor.noText')
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
                bgcolor: 'grey.100',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.main',
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
                {t('quizEditor.playersCanJoinAt', { url: `${window.location.origin}/join?session=${fixedJoinCode}` })}
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
              startIcon={addingLanguageWithTranslation ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleAddLanguage}
              disabled={!newLanguageCode || saving || addingLanguageWithTranslation}
            >
              {addingLanguageWithTranslation ? t('quizEditor.translating') : t('common.add')}
            </Button>
          </Box>
          
          {/* Auto-translate option */}
          {newLanguageCode && translationAvailable && questions.some(q => q.id) && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoTranslateOnAdd}
                    onChange={(e) => setAutoTranslateOnAdd(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {t('quizEditor.autoTranslateQuestions', { 
                        language: SUPPORTED_QUIZ_LANGUAGES.find(l => l.code === getDefaultLanguage())?.name || getDefaultLanguage()
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('quizEditor.autoTranslateDescription')}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map((q, i) => q.id || `new-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <List>
                {questions.map((question, qIndex) => (
                  <SortableQuestionItem
                    key={question.id || `new-${qIndex}`}
                    question={question}
                    qIndex={qIndex}
                    isExpanded={expandedQuestion === qIndex}
                    onToggleExpand={() => setExpandedQuestion(expandedQuestion === qIndex ? null : qIndex)}
                    onDelete={() => handleDeleteQuestion(qIndex)}
                    getQuestionPreviewText={getQuestionPreviewText}
                  >
                    <Box sx={{ p: 3, pt: 0 }}>
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Shared fields - above tabs */}
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          {t('quizEditor.sharedSettings')}
                        </Typography>
                        
                        <TextField
                          type="number"
                          label={t('quizEditor.timeLimitSeconds')}
                          value={question.timeLimitSeconds}
                          onChange={(e) => handleTimeLimitChange(qIndex, parseInt(e.target.value) || 15)}
                          sx={{ mb: 2, width: 200 }}
                          size="small"
                        />

                        {/* Image Upload */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
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
                              size="small"
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

                        {/* Correct Answer Selector */}
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {t('quizEditor.correctAnswer')}
                          </Typography>
                          <RadioGroup
                            row
                            value={question.correctAnswerIndex}
                            onChange={(e) => handleCorrectAnswerChange(qIndex, parseInt(e.target.value))}
                          >
                            {[0, 1, 2, 3].map((index) => (
                              <FormControlLabel
                                key={index}
                                value={index}
                                control={<Radio size="small" color="success" />}
                                label={t('quizEditor.answerNumber', { number: index + 1 })}
                              />
                            ))}
                          </RadioGroup>
                        </Box>
                      </Box>

                      {/* Language Tabs */}
                      {languages.length > 0 && (
                        <>
                          <Tabs
                            value={getSelectedLanguageTab(qIndex)}
                            onChange={(_, value) => handleLanguageTabChange(qIndex, value)}
                            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                          >
                            {/* Sort languages so default appears first */}
                            {[...languages].sort((a, b) => {
                              if (a.isDefault) return -1
                              if (b.isDefault) return 1
                              return 0
                            }).map((lang) => {
                              const langInfo = SUPPORTED_QUIZ_LANGUAGES.find(l => l.code === lang.languageCode)
                              return (
                                <Tab
                                  key={lang.languageCode}
                                  value={lang.languageCode}
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      {langInfo?.name || lang.languageCode}
                                      {lang.isDefault && <StarIcon fontSize="small" sx={{ fontSize: 14 }} />}
                                    </Box>
                                  }
                                />
                              )
                            })}
                          </Tabs>

                          {/* Tab Content - Translatable fields */}
                          {languages.map((lang) => {
                            const isActive = getSelectedLanguageTab(qIndex) === lang.languageCode
                            const translation = question.translations[lang.languageCode] || {
                              questionText: '',
                              answerTexts: ['', '', '', ''],
                            }
                            const isTranslating = translatingQuestion === qIndex
                            const translateTooltip = getTranslateButtonTooltip(question, lang)
                            const canTranslate = question.id && translationAvailable && !lang.isDefault
                            const defaultLangName = SUPPORTED_QUIZ_LANGUAGES.find(
                              l => l.code === getDefaultLanguage()
                            )?.name || getDefaultLanguage()
                            
                            return (
                              <Box
                                key={lang.languageCode}
                                sx={{ display: isActive ? 'block' : 'none' }}
                              >
                                {/* Translate button for non-default languages */}
                                {!lang.isDefault && (
                                  <Box sx={{ mb: 2 }}>
                                    <Tooltip title={translateTooltip || ''}>
                                      <span>
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          startIcon={isTranslating ? <CircularProgress size={16} /> : <TranslateIcon />}
                                          onClick={() => handleTranslateQuestion(qIndex, lang.languageCode)}
                                          disabled={!canTranslate || isTranslating}
                                        >
                                          {isTranslating 
                                            ? t('quizEditor.translating')
                                            : t('quizEditor.translateFromDefault', { language: defaultLangName })
                                          }
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                )}

                                <TextField
                                  fullWidth
                                  label={t('quizEditor.questionText')}
                                  value={translation.questionText}
                                  onChange={(e) => handleQuestionTextChange(qIndex, lang.languageCode, e.target.value)}
                                  sx={{ mb: 2 }}
                                />
                                
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  {t('quizEditor.answerTexts')}
                                </Typography>
                                {[0, 1, 2, 3].map((aIndex) => (
                                  <Box key={aIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        bgcolor: question.correctAnswerIndex === aIndex ? 'success.main' : 'grey.300',
                                        color: question.correctAnswerIndex === aIndex ? 'white' : 'text.secondary',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {aIndex + 1}
                                    </Box>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder={t('quizEditor.answerPlaceholder', { number: aIndex + 1 })}
                                      value={translation.answerTexts[aIndex] || ''}
                                      onChange={(e) => handleAnswerTextChange(qIndex, lang.languageCode, aIndex, e.target.value)}
                                    />
                                  </Box>
                                ))}
                              </Box>
                            )
                          })}
                        </>
                      )}

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
                  </SortableQuestionItem>
                ))}
              </List>
            </SortableContext>
          </DndContext>

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

      {/* Confirmation Dialog for Translation Overwrite */}
      <Dialog
        open={confirmTranslateDialog?.open ?? false}
        onClose={() => setConfirmTranslateDialog(null)}
      >
        <DialogTitle>{t('quizEditor.confirmTranslateTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('quizEditor.confirmTranslateMessage')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTranslateDialog(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              if (confirmTranslateDialog) {
                handleTranslateQuestion(
                  confirmTranslateDialog.questionIndex,
                  confirmTranslateDialog.targetLang,
                  true // skip confirmation
                )
              }
            }}
            variant="contained"
            color="primary"
          >
            {t('common.continue')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
