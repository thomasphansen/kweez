import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

// Player pages
import JoinPage from './pages/player/JoinPage'
import WaitPage from './pages/player/WaitPage'
import PlayPage from './pages/player/PlayPage'
import ResultsPage from './pages/player/ResultsPage'
import FinalPage from './pages/player/FinalPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import QuizEditor from './pages/admin/QuizEditor'
import LiveControl from './pages/admin/LiveControl'
import PrintQRCode from './pages/admin/PrintQRCode'

function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Routes>
        {/* Player routes */}
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/wait" element={<WaitPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/final" element={<FinalPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/quiz/:id?" element={<QuizEditor />} />
        <Route path="/admin/quiz/:id/print" element={<PrintQRCode />} />
        <Route path="/admin/live/:sessionId" element={<LiveControl />} />
      </Routes>
    </Box>
  )
}

export default App
