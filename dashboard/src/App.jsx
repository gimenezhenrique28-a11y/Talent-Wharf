import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Dashboard from './components/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import CandidatesList from './pages/CandidatesList.jsx'
import CandidateForm from './pages/CandidateForm.jsx'
import CandidateDetail from './pages/CandidateDetail.jsx'
import CandidatesImport from './pages/CandidatesImport.jsx'
import Analytics from './pages/Analytics.jsx'
import Settings from './pages/Settings.jsx'
import EmailTemplates from './pages/EmailTemplates.jsx'
import Pipeline from './pages/Pipeline.jsx'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="candidates" element={<CandidatesList />} />
          <Route path="candidates/new" element={<CandidateForm />} />
          <Route path="candidates/import" element={<CandidatesImport />} />
          <Route path="candidates/:id" element={<CandidateDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="templates" element={<EmailTemplates />} />
          <Route path="pipeline" element={<Pipeline />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
