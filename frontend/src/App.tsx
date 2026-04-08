import { Routes, Route, Navigate } from 'react-router-dom'

// Components
import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'

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
import LoginPage from './pages/admin/LoginPage'

// Display page (for projector)
import DisplayPage from './pages/display/DisplayPage'

function App() {
  return (
    <Routes>
      {/* Print route - no header/footer */}
      <Route path="/admin/quiz/:id/print" element={<PrintQRCode />} />

      {/* Display route - no header/footer (for projector) */}
      <Route path="/display/:sessionId" element={<DisplayPage />} />

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
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/quiz/:id?" element={<AdminRoute><QuizEditor /></AdminRoute>} />
            <Route path="/admin/live/:sessionId" element={<AdminRoute><LiveControl /></AdminRoute>} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App
