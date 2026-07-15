import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import DashboardHome from '@/pages/DashboardHome'
import ConnectionsPage from '@/pages/ConnectionsPage'
import DatasetsPage from '@/pages/DatasetsPage'
import DatasetDetailPage from '@/pages/DatasetDetailPage'
import DashboardsPage from '@/pages/DashboardsPage'
import DashboardViewPage from '@/pages/DashboardViewPage'
import DashboardBuilderPage from '@/pages/DashboardBuilderPage'
import AIGeneratorPage from '@/pages/AIGeneratorPage'
import Layout from '@/components/shared/Layout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardHome />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="datasets/:id" element={<DatasetDetailPage />} />
        <Route path="dashboards" element={<DashboardsPage />} />
        <Route path="dashboards/:id" element={<DashboardViewPage />} />
        <Route path="ai-generator" element={<AIGeneratorPage />} />
      </Route>
      {/* Builder lives outside main Layout (full-screen editor) */}
      <Route path="/builder" element={<RequireAuth><DashboardBuilderPage /></RequireAuth>} />
      <Route path="/builder/:id" element={<RequireAuth><DashboardBuilderPage /></RequireAuth>} />
    </Routes>
  )
}
