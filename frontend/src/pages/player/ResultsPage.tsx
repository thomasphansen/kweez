import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip, Grid, Button } from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useSession } from '../../context/SessionContext'
import { answerColors } from '../../theme'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function ResultsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playerSession, questionResults, lastQuestion, lastSelectedAnswerId, leaderboard } = useSession()

  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
    }
  }, [playerSession, navigate])

  if (!playerSession || !questionResults) {
    return null
  }

  const myEntry = leaderboard.find((e) => e.participantId === playerSession.participantId)
  const isCorrect = lastSelectedAnswerId === questionResults.correctAnswerId
  const didAnswer = lastSelectedAnswerId !== null

  return (
    <>
      <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
        <Box sx={{ maxWidth: 'sm', mx: 'auto' }}>
          <Typography variant="h5" align="center" gutterBottom>
            {t('results.questionResults', { number: questionResults.questionIndex + 1 })}
          </Typography>

          {/* Correct/Wrong feedback */}
          {didAnswer && (
            <Paper 
              sx={{ 
                p: 2, 
                mb: 2, 
                textAlign: 'center', 
                bgcolor: isCorrect ? 'success.main' : 'error.main',
                color: 'white',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                {isCorrect ? (
                  <CheckIcon fontSize="large" />
                ) : (
                  <CloseIcon fontSize="large" />
                )}
                <Typography variant="h5">
                  {isCorrect ? t('results.correct') : t('results.wrong')}
                </Typography>
              </Box>
              {myEntry?.lastQuestionScore !== undefined && myEntry.lastQuestionScore > 0 && (
                <Typography variant="h6">
                  {t('results.plusPoints', { points: myEntry.lastQuestionScore })}
                </Typography>
              )}
            </Paper>
          )}

          {/* Show the answers with correct one highlighted */}
          {lastQuestion && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {lastQuestion.text}
              </Typography>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {lastQuestion.answers.map((answer, index) => {
                  const isThisCorrect = answer.id === questionResults.correctAnswerId
                  const wasSelected = answer.id === lastSelectedAnswerId
                  // Darken wrong answers by mixing with black instead of using opacity
                  const baseColor = answerColors[index]
                  const bgColor = isThisCorrect 
                    ? baseColor 
                    : `color-mix(in srgb, ${baseColor} 40%, black)`

                  return (
                    <Grid item xs={6} key={answer.id}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled
                        sx={{
                          py: { xs: 2, sm: 2.5 },
                          px: 1,
                          minHeight: { xs: 60, sm: 70 },
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          fontWeight: 600,
                          bgcolor: bgColor,
                          color: isThisCorrect ? 'white' : 'rgba(255,255,255,0.6)',
                          border: isThisCorrect 
                            ? '4px solid #4caf50'
                            : 'none',
                          boxShadow: isThisCorrect 
                            ? '0 0 16px 4px rgba(76, 175, 80, 0.6)' 
                            : 'none',
                          '&:disabled': {
                            bgcolor: bgColor,
                            color: isThisCorrect ? 'white' : 'rgba(255,255,255,0.6)',
                          },
                          position: 'relative',
                          lineHeight: 1.3,
                        }}
                      >
                        {answer.text}
                        {/* Player's answer indicator - large icon overlay */}
                        {wasSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              right: 6,
                              transform: 'translateY(-50%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: isThisCorrect ? 'success.main' : 'error.main',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          >
                            {isThisCorrect ? (
                              <CheckIcon sx={{ fontSize: '1.1rem', color: 'white' }} />
                            ) : (
                              <CloseIcon sx={{ fontSize: '1.1rem', color: 'white' }} />
                            )}
                          </Box>
                        )}
                      </Button>
                    </Grid>
                  )
                })}
              </Grid>
            </Paper>
          )}

          {/* My score */}
          {myEntry && (
            <Paper sx={{ p: 2, mb: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="body1">{t('results.yourPosition')}</Typography>
              <Typography variant="h3" sx={{ my: 0.5 }}>
                #{myEntry.rank}
              </Typography>
              <Typography variant="h6">
                {myEntry.totalScore} {t('common.points')}
              </Typography>
            </Paper>
          )}

          {/* Leaderboard */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('results.leaderboard')}
            </Typography>
            <List dense disablePadding>
              {leaderboard.slice(0, 5).map((entry) => (
                <ListItem 
                  key={entry.participantId}
                  disablePadding
                  sx={{
                    bgcolor: entry.participantId === playerSession.participantId 
                      ? 'action.selected' 
                      : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    px: 1,
                    py: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        width: 30, 
                        textAlign: 'center',
                        color: entry.rank <= 3 ? 'warning.main' : 'text.primary',
                      }}
                    >
                      {entry.rank <= 3 ? <EmojiEventsIcon fontSize="small" /> : entry.rank}
                    </Typography>
                    <ListItemText 
                      primary={entry.name}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondary={
                        entry.lastQuestionScore !== undefined && entry.lastQuestionScore > 0
                          ? `+${entry.lastQuestionScore}`
                          : undefined
                      }
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {entry.totalScore}
                    </Typography>
                    {entry.participantId === playerSession.participantId && (
                      <Chip label={t('common.you')} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2, pb: 1 }}>
            {t('results.waitingForNextQuestion')}
          </Typography>
        </Box>
      </Box>
    
      <ConnectionStatus />
    </>
  )
}
