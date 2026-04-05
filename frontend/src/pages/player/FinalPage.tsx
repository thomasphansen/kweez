import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, Button, Chip } from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useSession } from '../../context/SessionContext'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function FinalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playerSession, leaderboard, setPlayerSession, clearGameState, disconnect } = useSession()

  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
    }
  }, [playerSession, navigate])

  const handlePlayAgain = async () => {
    await disconnect()
    setPlayerSession(null)
    clearGameState()
    navigate('/join')
  }

  if (!playerSession) {
    return null
  }

  const myEntry = leaderboard.find((e) => e.participantId === playerSession.participantId)
  const winner = leaderboard[0]

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        {t('final.quizComplete')}
      </Typography>

      {/* Winner announcement */}
      {winner && (
        <Paper 
          sx={{ 
            p: 4, 
            mb: 4, 
            textAlign: 'center', 
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 60, mb: 1 }} />
          <Typography variant="h5">{t('final.winner')}</Typography>
          <Typography variant="h3" sx={{ my: 1 }}>
            {winner.name}
          </Typography>
          <Typography variant="h5">
            {winner.totalScore} {t('common.points')}
          </Typography>
        </Paper>
      )}

      {/* My result */}
      {myEntry && myEntry.rank !== 1 && (
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6">{t('final.yourFinalPosition')}</Typography>
          <Typography variant="h2" color="primary" sx={{ my: 1 }}>
            #{myEntry.rank}
          </Typography>
          <Typography variant="h5">
            {myEntry.totalScore} {t('common.points')}
          </Typography>
        </Paper>
      )}

      {/* Full leaderboard */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('final.finalStandings')}
        </Typography>
        <List>
          {leaderboard.map((entry) => (
            <ListItem 
              key={entry.participantId}
              sx={{
                bgcolor: entry.participantId === playerSession.participantId 
                  ? 'action.selected' 
                  : 'transparent',
                borderRadius: 2,
                mb: 0.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: entry.rank === 1 ? 'warning.main' : 
                             entry.rank === 2 ? 'grey.400' :
                             entry.rank === 3 ? '#CD7F32' : 'grey.700',
                    color: entry.rank <= 3 ? 'white' : 'text.primary',
                    fontWeight: 'bold',
                  }}
                >
                  {entry.rank}
                </Box>
                <ListItemText primary={entry.name} />
                <Typography variant="h6">
                  {entry.totalScore}
                </Typography>
                {entry.participantId === playerSession.participantId && (
                  <Chip label={t('common.you')} size="small" color="primary" />
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Button 
        fullWidth 
        variant="contained" 
        size="large" 
        onClick={handlePlayAgain}
      >
        {t('final.playAgain')}
      </Button>
    </Container>
    
    <ConnectionStatus />
    </>
  )
}
