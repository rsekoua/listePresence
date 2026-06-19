import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ActiviteDetailPage = lazy(() => import('./pages/ActiviteDetailPage').then((m) => ({ default: m.ActiviteDetailPage })))
const ParticipantsGlobalPage = lazy(() => import('./pages/ParticipantsGlobalPage').then((m) => ({ default: m.ParticipantsGlobalPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })))
const PublicFormPage = lazy(() => import('./pages/PublicFormPage').then((m) => ({ default: m.PublicFormPage })))

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/form/:token" element={<PublicFormPage />} />

        {/* Routes protégées (tableau de bord organisateur) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/participants" element={<ParticipantsGlobalPage />} />
            <Route path="/utilisateurs" element={<UsersPage />} />
            <Route path="/journal" element={<AuditPage />} />
            <Route path="/activites/:id" element={<ActiviteDetailPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/aide" element={<HelpPage />} />
          </Route>
        </Route>

        {/* Redirections par défaut */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
