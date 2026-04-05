import { useTranslation } from 'react-i18next'
import { Box, Typography, CircularProgress, Fade } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import { useSession } from '../context/SessionContext'

export default function ConnectionStatus() {
  const { t } = useTranslation()
  const { connectionStatus } = useSession()

  // Only show overlay when disconnected or reconnecting
  const showOverlay = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting'

  return (
    <Fade in={showOverlay}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9999,
          display: showOverlay ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        {connectionStatus === 'reconnecting' ? (
          <>
            <CircularProgress size={64} sx={{ color: 'primary.main' }} />
            <Typography variant="h5" color="white">
              {t('connection.reconnecting')}
            </Typography>
            <Typography variant="body1" color="grey.400">
              {t('connection.pleaseWait')}
            </Typography>
          </>
        ) : (
          <>
            <WifiOffIcon sx={{ fontSize: 64, color: 'error.main' }} />
            <Typography variant="h5" color="white">
              {t('connection.connectionLost')}
            </Typography>
            <Typography variant="body1" color="grey.400">
              {t('connection.tryingToReconnect')}
            </Typography>
            <CircularProgress size={32} sx={{ color: 'grey.500', mt: 2 }} />
          </>
        )}
      </Box>
    </Fade>
  )
}
