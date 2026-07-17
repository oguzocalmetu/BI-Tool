import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2, Plus, Edit2, Trash2, Sparkles, Calendar, PenLine, Zap, Search, LayoutGrid, List } from 'lucide-react'
import api from '@/lib/api'

interface Dashboard {
  id: number
  name: string
  description?: string
  is_ai_generated: boolean
  created_at: string
}

const MINI_BARS = [35, 58, 42, 76, 51, 68, 88, 60]

export default function DashboardsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: dashboards = [], isLoading } = useQuery<Dashboard[]>({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/dashboards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dashboards'] }); setDeleteId(null) },
  })

  const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })

  const filtered = dashboards.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboardlar</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {dashboards.length} dashboard · {dashboards.filter(d => d.is_ai_generated).length} AI oluşturdu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/ai-generator')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI ile Oluştur
            </button>
            <button onClick={() => navigate('/builder')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Plus className="w-4 h-4" /> Yeni Dashboard
            </button>
          </div>
        </div>

        {/* Search + view toggle */}
        {dashboards.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dashboard ara…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all" />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-8 py-6">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-1 bg-gray-200" />
                <div className="h-24 bg-gray-100 mx-4 mt-3 rounded-lg" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && dashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
              <LayoutGrid className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Henüz dashboard yok</h2>
            <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
              İlk dashboardunuzu oluşturun. Manuel builder veya AI ile saniyeler içinde hazır.
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/builder')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <PenLine className="w-4 h-4" /> Manuel Oluştur
              </button>
              <button onClick={() => navigate('/ai-generator')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
                <Sparkles className="w-4 h-4 text-indigo-500" /> AI ile Oluştur
              </button>
            </div>
          </div>
        )}

        {/* No results */}
        {!isLoading && dashboards.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">"{search}" için sonuç bulunamadı</p>
          </div>
        )}

        {/* Grid view */}
        {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((d, idx) => (
              <div key={d.id} onClick={() => navigate(`/dashboards/${d.id}`)}
                className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer overflow-hidden">
                {/* Top gradient bar */}
                <div className="h-1" style={{ background: d.is_ai_generated ? 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' : 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />

                {/* Hover actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10">
                  <button onClick={e => { e.stopPropagation(); navigate(`/builder/${d.id}`) }}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                    title="Builder'da Düzenle">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteId(d.id); setDeleteName(d.name) }}
                    className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                    title="Sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mini bar chart preview */}
                <div className="flex items-end gap-0.5 mx-4 mt-3 mb-0 h-16">
                  {MINI_BARS.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${(h + (idx * 7 + i * 3) % 25) % 100}%`,
                        background: d.is_ai_generated
                          ? `rgba(99,102,241,${0.12 + i * 0.08})`
                          : `rgba(59,130,246,${0.12 + i * 0.08})`,
                      }} />
                  ))}
                </div>

                <div className="p-4 pt-2">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate pr-8 group-hover:text-indigo-600 transition-colors">
                      {d.name}
                    </h3>
                    {d.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{d.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    {d.is_ai_generated && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
                        <Zap className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
                      <Calendar className="w-3 h-3" /> {fmt(d.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && filtered.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map(d => (
                <div key={d.id} onClick={() => navigate(`/dashboards/${d.id}`)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: d.is_ai_generated ? 'linear-gradient(135deg, #eef2ff, #ede9fe)' : '#eff6ff' }}>
                    {d.is_ai_generated ? <Sparkles className="w-4 h-4 text-indigo-500" /> : <BarChart2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{d.name}</p>
                    {d.description && <p className="text-xs text-gray-400 truncate">{d.description}</p>}
                  </div>
                  {d.is_ai_generated && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">AI</span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">{fmt(d.created_at)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={e => { e.stopPropagation(); navigate(`/builder/${d.id}`) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(d.id); setDeleteName(d.name) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Dashboardı Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>"{deleteName}"</strong> silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                İptal
              </button>
              <button onClick={() => deleteMutation.mutate(deleteId!)} disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all">
                {deleteMutation.isPending ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
