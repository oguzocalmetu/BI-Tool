import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2, Plus, Edit2, Trash2, Sparkles, Calendar, LayoutGrid, PenLine } from 'lucide-react'
import api from '@/lib/api'

interface Dashboard {
  id: number
  name: string
  description?: string
  is_ai_generated: boolean
  created_at: string
  updated_at?: string
}

export default function DashboardsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      setDeleteId(null)
    },
  })

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboardlar</h1>
          <p className="text-gray-500 text-sm mt-1">
            {dashboards.length > 0 ? `${dashboards.length} dashboard` : 'Dashboardlarınızı yönetin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/ai-generator')}
            className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI ile Oluştur
          </button>
          <button
            onClick={() => navigate('/builder')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Dashboard
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && dashboards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <LayoutGrid className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Henüz dashboard yok</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            İlk dashboardunuzu oluşturun. Manuel builder veya AI ile saniyeler içinde hazır.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <PenLine className="w-4 h-4" /> Manuel Oluştur
            </button>
            <button
              onClick={() => navigate('/ai-generator')}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI ile Oluştur
            </button>
          </div>
        </div>
      )}

      {/* Dashboard grid */}
      {!isLoading && dashboards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dashboards.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/dashboards/${d.id}`)}
              className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
            >
              {/* Top stripe */}
              <div className={`h-1 ${d.is_ai_generated ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-blue-500'}`} />

              {/* Action buttons – visible on hover */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/builder/${d.id}`) }}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
                  title="Builder'da Düzenle"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteId(d.id); setDeleteName(d.name) }}
                  className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {d.is_ai_generated
                      ? <Sparkles className="w-4 h-4 text-indigo-500" />
                      : <BarChart2 className="w-4 h-4 text-blue-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate pr-12">{d.name}</h3>
                    {d.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  {d.is_ai_generated && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
                    <Calendar className="w-3 h-3" />
                    {fmt(d.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Dashboardı Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>"{deleteName}"</strong> dashboardunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
