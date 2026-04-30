import { createTheme } from '@mui/material/styles'

// Fresh & Vibrant Light Theme
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00897B', // Teal 600
      light: '#4DB6AC', // Teal 300
      dark: '#00695C', // Teal 800
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF7043', // Deep Orange 400 (coral accent)
      light: '#FF8A65', // Deep Orange 300
      dark: '#F4511E', // Deep Orange 600
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF5350', // Red 400
      light: '#E57373', // Red 300
      dark: '#E53935', // Red 600
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFA726', // Orange 400
      light: '#FFB74D', // Orange 300
      dark: '#FB8C00', // Orange 600
      contrastText: '#000000',
    },
    success: {
      main: '#66BB6A', // Green 400
      light: '#81C784', // Green 300
      dark: '#43A047', // Green 600
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#29B6F6', // Light Blue 400
      light: '#4FC3F7', // Light Blue 300
      dark: '#039BE5', // Light Blue 600
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F5F5', // Grey 100
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121', // Grey 900
      secondary: '#757575', // Grey 600
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          padding: '12px 24px',
          fontSize: '1rem',
        },
        sizeLarge: {
          padding: '16px 32px',
          fontSize: '1.25rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
})

// Answer button colors (Kahoot-style) - kept unchanged
export const answerColors = [
  '#E21B3C', // Red
  '#1368CE', // Blue
  '#D89E00', // Yellow
  '#26890C', // Green
]
