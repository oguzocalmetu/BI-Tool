import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Sparkles, Plus } from 'lucide-react'
import api from '@/lib/api'

export default function DashboardsPage() {
  const navigate = useNavigate()
  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(r => r.data),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage your dashboards</p>
        </div>
        <button
          onClick={() => navigate('/ai-generator')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Dashboard
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No dashboards yet.</p>
          <button onClick={() => navigate('/ai-generator')} className="btn-primary">
            <Sparkles className="w-4 h-4 inline mr-2" />Create with AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {dashboards.map((d: { id: number; name: string; description?: string; is_ai_generated: boolean; created_at: string }) => (
            <div
              key={d.id}
              onClick={() => navigate(`/dashboards/${d.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                </div>
                {d.is_ai_generated && (
                  <span className="flex items-center gap-1 text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" /> AI
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              {d.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{d.description}</p>}
              <p className="text-xs text-gray-400 mt-3">{new Date(d.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
