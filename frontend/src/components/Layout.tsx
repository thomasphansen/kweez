import { Box, Typography, Select, MenuItem, IconButton, Tooltip, Link as MuiLink } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

const languages = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, logout } = useAuth()

  const isAdminPage = location.pathname.startsWith('/admin')

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 700,
          }}
        >
          Kweez!
        </Typography>

        <Select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          size="small"
          sx={{
            color: 'primary.contrastText',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.7)',
            },
            '.MuiSvgIcon-root': {
              color: 'primary.contrastText',
            },
            minWidth: 120,
          }}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.label}
            </MenuItem>
          ))}
        </Select>

        {isAdminPage && isAdmin && (
          <Tooltip title={t('auth.logout')}>
            <IconButton
              onClick={handleLogout}
              sx={{ color: 'primary.contrastText', ml: 1 }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}
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
          {' · '}
          <MuiLink
            component={Link}
            to="/privacy"
            sx={{
              color: 'grey.500',
              '&:hover': {
                color: 'grey.300',
              },
            }}
          >
            {t('privacy.title')}
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  )
}
