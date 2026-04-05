import { Routes, Route, Navigate } from 'react-router-dom'

// Components
import Layout from './components/Layout'

// Player pages
import JoinPage from './pages/player/JoinPage'
import WaitPage from './pages/player/WaitPage'
import StartedPage from './pages/player/StartedPage'
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
    <Routes>
      {/* Print route - no header/footer */}
      <Route path="/admin/quiz/:id/print" element={<PrintQRCode />} />

      {/* All other routes with Layout */}
      <Route path="*" element={
        <Layout>
          <Routes>
            {/* Player routes */}
            <Route path="/" element={<Navigate to="/join" replace />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/wait" element={<WaitPage />} />
            <Route path="/started" element={<StartedPage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/final" element={<FinalPage />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/quiz/:id?" element={<QuizEditor />} />
            <Route path="/admin/live/:sessionId" element={<LiveControl />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App
