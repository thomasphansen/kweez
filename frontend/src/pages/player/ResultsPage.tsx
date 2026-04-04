import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useSession } from '../../context/SessionContext'
import ConnectionStatus from '../../components/ConnectionStatus'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { playerSession, questionResults, leaderboard } = useSession()

  useEffect(() => {
    if (!playerSession) {
      navigate('/join')
    }
  }, [playerSession, navigate])

  if (!playerSession || !questionResults) {
    return null
  }

  const myEntry = leaderboard.find((e) => e.participantId === playerSession.participantId)

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Question {questionResults.questionIndex + 1} Results
      </Typography>

      {/* My score */}
      {myEntry && (
        <Paper sx={{ p: 3, mb: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Typography variant="h6">Your Position</Typography>
          <Typography variant="h2" sx={{ my: 1 }}>
            #{myEntry.rank}
          </Typography>
          <Typography variant="h5">
            {myEntry.totalScore} points
          </Typography>
          {myEntry.lastQuestionScore !== undefined && myEntry.lastQuestionScore > 0 && (
            <Typography variant="body1" sx={{ mt: 1 }}>
              +{myEntry.lastQuestionScore} this question
            </Typography>
          )}
        </Paper>
      )}

      {/* Leaderboard */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Leaderboard
        </Typography>
        <List>
          {leaderboard.slice(0, 10).map((entry) => (
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
                <Typography 
                  variant="h6" 
                  sx={{ 
                    width: 40, 
                    textAlign: 'center',
                    color: entry.rank <= 3 ? 'warning.main' : 'text.primary',
                  }}
                >
                  {entry.rank <= 3 ? <EmojiEventsIcon /> : entry.rank}
                </Typography>
                <ListItemText 
                  primary={entry.name}
                  secondary={
                    entry.lastQuestionScore !== undefined && entry.lastQuestionScore > 0
                      ? `+${entry.lastQuestionScore}`
                      : undefined
                  }
                />
                <Typography variant="h6">
                  {entry.totalScore}
                </Typography>
                {entry.participantId === playerSession.participantId && (
                  <Chip label="You" size="small" color="primary" />
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
        Waiting for next question...
      </Typography>
    </Container>
    
    <ConnectionStatus />
    </>
  )
}
