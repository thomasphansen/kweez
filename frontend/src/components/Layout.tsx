import { Box, Typography } from '@mui/material'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          flexShrink: 0,
        }}
      >
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Kweez!
        </Typography>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 1,
          px: 2,
          bgcolor: 'grey.900',
          color: 'grey.500',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <Typography variant="caption">
          &copy; 2026 - Thomas Hansen
        </Typography>
      </Box>
    </Box>
  )
}
