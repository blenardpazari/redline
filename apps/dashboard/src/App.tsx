import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isAuthenticated } from './lib/token'
import { ServerProvider } from './context/ServerContext'
import { ThemeProvider } from './context/ThemeContext'
import AlertHistory from './pages/AlertHistory'
import AlertSettings from './pages/AlertSettings'
import Analytics from './pages/Analytics'
import Dashboard from './pages/Dashboard'
import Health from './pages/Health'
import Clustering from './pages/Clustering'
import Insights from './pages/Insights'
import IpInspector from './pages/IpInspector'
import LogExplorer from './pages/LogExplorer'
import Login from './pages/Login'
import Sites from './pages/Sites'
import ThreatBreakdown from './pages/ThreatBreakdown'
import ThreatMap from './pages/ThreatMap'
import Users from './pages/Users'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ServerProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/"          element={<Protected><Dashboard /></Protected>} />
            <Route path="/map"       element={<Protected><ThreatMap /></Protected>} />
            <Route path="/insights"   element={<Protected><Insights /></Protected>} />
            <Route path="/clustering" element={<Protected><Clustering /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/ip/:ip"    element={<Protected><IpInspector /></Protected>} />
            <Route path="/logs"      element={<Protected><LogExplorer /></Protected>} />
            <Route path="/breakdown" element={<Protected><ThreatBreakdown /></Protected>} />
            <Route path="/settings"  element={<Protected><AlertSettings /></Protected>} />
            <Route path="/sites"     element={<Protected><Sites /></Protected>} />
            <Route path="/alerts"    element={<Protected><AlertHistory /></Protected>} />
            <Route path="/users"     element={<Protected><Users /></Protected>} />
            <Route path="/health"    element={<Protected><Health /></Protected>} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </ServerProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
