import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isAuthenticated } from './lib/token'
import AlertSettings from './pages/AlertSettings'
import Analytics from './pages/Analytics'
import Connectors from './pages/Connectors'
import Dashboard from './pages/Dashboard'
import Insights from './pages/Insights'
import IpInspector from './pages/IpInspector'
import LogExplorer from './pages/LogExplorer'
import Login from './pages/Login'
import ThreatBreakdown from './pages/ThreatBreakdown'
import ThreatMap from './pages/ThreatMap'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><ThreatMap /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/ip/:ip" element={<ProtectedRoute><IpInspector /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute><LogExplorer /></ProtectedRoute>} />
        <Route path="/breakdown" element={<ProtectedRoute><ThreatBreakdown /></ProtectedRoute>} />
        <Route path="/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AlertSettings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
