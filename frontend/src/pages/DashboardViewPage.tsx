import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ArrowLeft, Sparkles, Filter, X, Edit2, Eye, Save, GripHorizontal, PenLine } from 'lucide-react'
import api from '@/lib/api'
import ChartWidget from '@/components/charts/ChartWidget'
import { Widget, DashboardFilter } from '@/types'

export default function DashboardViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [filterParams, setFilterParams] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editLayout, setEditLayout] = useState<Layout[]>([])
  const [layoutChanged, setLayoutChanged] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-detail', id],
    queryFn: () => api.get(`/dashboards/${id}`).then(r => r.data),
    onSuccess: (d: any) => {
      const widgets: Widget[] = d?.widgets || []
      setEditLayout(widgets.map(w => ({
        i: String(w.id),
        x: w.position_json?.x ?? 0,
        y: w.position_json?.y ?? 0,
        w: w.position_json?.w ?? 4,
        h: w.position_json?.h ?? 4,
      })))
    },
  })

  const dashboard = data?.dashboard
  const widgets: Widget[] = data?.widgets || []
  const filters: DashboardFilter[] = data?.filters || []

  const viewLayout: Layout[] = widgets.map(w => ({
    i: String(w.id),
    x: w.position_json?.x ?? 0,
    y: w.position_json?.y ?? 0,
    w: w.position_json?.w ?? 4,
    h: w.position_json?.h ?? 4,
    static: true,
  }))

  const saveLayoutMutation = useMutation({
    mutationFn: async (positions: Layout[]) => {
      await api.patch(`/dashboards/${id}/layout`, {
        positions: positions.map(p => ({
          widget_id: Number(p.i),
          x: p.x, y: p.y, w: p.w, h: p.h,
        })),
      })
    },
    onSuccess: () => {
      setLayoutChanged(false)
    },
  })

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setEditLayout(newLayout)
    setLayoutChanged(true)
  }, [])

  const handleToggleEdit = () => {
    if (isEditMode && layoutChanged) {
      saveLayoutMutation.mutate(editLayout)
    }
    setIsEditMode(v => !v)
  }

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterParams(prev => ({ ...prev, [key]: value }))
  }, [])

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Dashboard yükleniyor…</p>
      </div>
    </div>
  )

  if (!dashboard) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">Dashboard bulunamadı.</p>
      <button onClick={() => navigate('/dashboards')} className="text-blue-600 hover:underline text-sm">
        ← Dashboardlara dön
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboards')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Dashboardlara dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">{dashboard.name}</h1>
              {dashboard.is_ai_generated && (
                <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              )}
            </div>
            {dashboard.description && (
              <p className="text-xs text-gray-500">{dashboard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" /> Filtreler
            </button>
          )}

          {/* Save button (edit mode only) */}
          {isEditMode && layoutChanged && (
            <button
              onClick={() => saveLayoutMutation.mutate(editLayout)}
              disabled={saveLayoutMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saveLayoutMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          )}

          {/* Edit / View toggle */}
          <button
            onClick={handleToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              isEditMode
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {isEditMode ? <><Eye className="w-3.5 h-3.5" /> Görüntüle</> : <><Edit2 className="w-3.5 h-3.5" /> Düzenle</>}
          </button>

          {/* Open in Builder */}
          <button
            onClick={() => navigate(`/builder/${id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" /> Builder
          </button>
        </div>
      </div>

      {/* ── Edit mode banner ── */}
      {isEditMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-xs flex-shrink-0">
          <GripHorizontal className="w-3.5 h-3.5" />
          <span>Düzenleme modu açık — widgetları sürükleyip boyutlandırabilirsiniz.</span>
          {layoutChanged && <span className="ml-1 font-medium">• Değişiklikler kaydedilmedi.</span>}
        </div>
      )}

      {/* ── Filter bar ── */}
      {showFilters && filters.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0 flex-wrap">
          {filters.map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">{f.filter_name}:</label>
              {f.filter_type === 'date_range' && (
                <div className="flex items-center gap-1">
                  <input type="date" className="text-xs border border-gray-200 rounded px-2 py-1"
                    onChange={e => handleFilterChange('start_date', e.target.value)} />
                  <span className="text-gray-400 text-xs">—</span>
                  <input type="date" className="text-xs border border-gray-200 rounded px-2 py-1"
                    onChange={e => handleFilterChange('end_date', e.target.value)} />
                </div>
              )}
              {f.filter_type === 'dropdown' && (
                <select className="text-xs border border-gray-200 rounded px-2 py-1"
                  onChange={e => handleFilterChange(f.column_name || '', e.target.value)}>
                  <option value="">Tümü</option>
                </select>
              )}
            </div>
          ))}
          {Object.keys(filterParams).length > 0 && (
            <button onClick={() => setFilterParams({})}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <X className="w-3 h-3" /> Temizle
            </button>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-400 mb-3">Bu dashboardda henüz widget yok.</p>
            <button
              onClick={() => navigate(`/builder/${id}`)}
              className="text-blue-600 hover:underline text-sm"
            >
              Builder'da widget ekle →
            </button>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={isEditMode ? editLayout : viewLayout}
            cols={12}
            rowHeight={80}
            width={1200}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            onLayoutChange={isEditMode ? handleLayoutChange : undefined}
            draggableHandle=".drag-handle"
            margin={[8, 8]}
          >
            {widgets.map(widget => (
              <div
                key={String(widget.id)}
                className={`bg-white rounded-xl border overflow-hidden flex flex-col transition-shadow ${
                  isEditMode
                    ? 'border-amber-300 shadow-md'
                    : 'border-gray-100 shadow-sm'
                }`}
              >
                <div className={`px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between flex-shrink-0 ${
                  isEditMode ? 'drag-handle cursor-grab active:cursor-grabbing bg-amber-50' : ''
                }`}>
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{widget.title}</h3>
                  {isEditMode && <GripHorizontal className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </div>
                <div className="flex-1 min-h-0">
                  <ChartWidget widget={widget} filterParams={filterParams} />
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  )
}
