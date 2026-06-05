import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ActiviteDetailPage } from './pages/ActiviteDetailPage'
import { ParticipantsGlobalPage } from './pages/ParticipantsGlobalPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import { AboutPage } from './pages/AboutPage'
import { HelpPage } from './pages/HelpPage'
import { PublicFormPage } from './pages/PublicFormPage'

function App() {
  return (
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
  )
}

export default App
