import { createTheme } from '@mui/material/styles'

// Material Design 3 inspired theme
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D0BCFF', // Purple
      contrastText: '#381E72',
    },
    secondary: {
      main: '#CCC2DC',
      contrastText: '#332D41',
    },
    error: {
      main: '#F2B8B5',
      contrastText: '#601410',
    },
    success: {
      main: '#A8DAB5',
      contrastText: '#0D3818',
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
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
  },
})

// Answer button colors (Kahoot-style)
export const answerColors = [
  '#E21B3C', // Red
  '#1368CE', // Blue
  '#D89E00', // Yellow
  '#26890C', // Green
]
