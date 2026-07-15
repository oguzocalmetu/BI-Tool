import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Database, Link2, Sparkles, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function DashboardHome() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: dashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(r => r.data),
  })

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then(r => r.data),
  })

  const stats = [
    { label: 'Dashboards', value: dashboards?.length ?? 0, icon: BarChart2, color: 'bg-blue-500' },
    { label: 'Datasets', value: datasets?.length ?? 0, icon: Database, color: 'bg-green-500' },
    { label: 'Connections', value: connections?.length ?? 0, icon: Link2, color: 'bg-purple-500' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Your BI platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/ai-generator')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 text-left hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          <Sparkles className="w-6 h-6 mb-3" />
          <h3 className="font-semibold text-lg">Generate with AI</h3>
          <p className="text-blue-100 text-sm mt-1">Describe your goal, AI creates the dashboard</p>
          <ArrowRight className="w-4 h-4 mt-3" />
        </button>

        <button
          onClick={() => navigate('/connections')}
          className="bg-white rounded-xl p-6 text-left hover:shadow-md transition-all shadow-sm border border-gray-100"
        >
          <Link2 className="w-6 h-6 mb-3 text-blue-600" />
          <h3 className="font-semibold text-lg text-gray-900">Add Data Source</h3>
          <p className="text-gray-500 text-sm mt-1">Connect PostgreSQL, MySQL, CSV and more</p>
          <ArrowRight className="w-4 h-4 mt-3 text-gray-400" />
        </button>
      </div>

      {/* Recent dashboards */}
      {dashboards?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Dashboards</h2>
          <div className="grid grid-cols-2 gap-4">
            {dashboards.slice(0, 4).map((d: { id: number; name: string; description?: string; is_ai_generated: boolean }) => (
              <div
                key={d.id}
                onClick={() => navigate(`/dashboards/${d.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">{d.name}</h3>
                  {d.is_ai_generated && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI</span>
                  )}
                </div>
                {d.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{d.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
