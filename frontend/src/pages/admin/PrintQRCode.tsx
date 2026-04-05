import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { quizApi } from '../../services/api'

export default function PrintQRCode() {
  const { id } = useParams<{ id: string }>()
  const [quizTitle, setQuizTitle] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const joinUrl = `${window.location.origin}/join?code=${joinCode}`

  useEffect(() => {
    if (id) {
      loadQuiz(id)
    }
  }, [id])

  const loadQuiz = async (quizId: string) => {
    try {
      const quiz = await quizApi.getById(quizId)
      if (!quiz.fixedJoinCode) {
        setError('This quiz does not have a fixed QR code')
        return
      }
      setQuizTitle(quiz.title)
      setJoinCode(quiz.fixedJoinCode)
    } catch (err) {
      setError('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  // Auto-print when loaded
  useEffect(() => {
    if (!loading && !error && joinCode) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, error, joinCode])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  // Create 8 QR code cards
  const cards = Array(8).fill(null)

  return (
    <>
      {/* Print styles */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .print-container {
              width: 194mm !important;
              height: 281mm !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
          
          @media screen {
            .print-container {
              max-width: 194mm;
              margin: 0 auto;
              padding: 8mm;
              background: white;
            }
          }
        `}
      </style>

      <Box
        className="print-container"
        sx={{
          width: '194mm', // A4 width minus margins (210 - 2*8)
          height: '281mm', // A4 height minus margins (297 - 2*8)
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: '2mm',
            height: '100%',
            width: '100%',
          }}
        >
          {cards.map((_, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2mm',
                border: '1px dashed #ccc',
                borderRadius: '2mm',
                boxSizing: 'border-box',
                overflow: 'hidden',
                '@media print': {
                  border: '1px dashed #999',
                },
              }}
            >
              {/* Quiz Title */}
              <Typography
                sx={{
                  fontSize: '12pt',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: 'black',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  lineHeight: 1.2,
                }}
              >
                {quizTitle}
              </Typography>

              {/* QR Code */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <QRCodeSVG
                  value={joinUrl}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
                
                {/* URL under QR code */}
                <Typography
                  sx={{
                    fontSize: '7pt',
                    color: '#666',
                    textAlign: 'center',
                    marginTop: '1mm',
                    wordBreak: 'break-all',
                    maxWidth: '90%',
                    lineHeight: 1.2,
                  }}
                >
                  {joinUrl}
                </Typography>
              </Box>

              {/* Have fun! */}
              <Typography
                sx={{
                  fontSize: '10pt',
                  fontWeight: 'bold',
                  fontStyle: 'italic',
                  color: '#333',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                Have fun!
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  )
}
