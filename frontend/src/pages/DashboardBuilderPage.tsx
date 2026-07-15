import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  Plus, Save, X, Settings2, Database, BarChart2,
  ChevronRight, Play, Trash2, Copy, GripVertical, ArrowLeft, Loader2,
} from 'lucide-react'
import api from '@/lib/api'
import ChartWidget from '@/components/charts/ChartWidget'
import type { Dataset, ColumnProfile, WidgetType, BuilderWidget, ChartConfig, QueryResult } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ─── Chart type catalog ────────────────────────────────────────────────────────

interface ChartTypeDef { type: WidgetType; label: string; icon: string; group: string }

const CHART_TYPES: ChartTypeDef[] = [
  { type: 'column',         label: 'Sütun',         icon: '📊', group: 'Cartesian' },
  { type: 'stacked_column', label: 'Yığın Sütun',   icon: '📊', group: 'Cartesian' },
  { type: 'bar',            label: 'Bar',            icon: '📉', group: 'Cartesian' },
  { type: 'stacked_bar',    label: 'Yığın Bar',      icon: '📉', group: 'Cartesian' },
  { type: 'line',           label: 'Çizgi',          icon: '📈', group: 'Cartesian' },
  { type: 'area',           label: 'Alan',           icon: '📈', group: 'Cartesian' },
  { type: 'histogram',      label: 'Histogram',      icon: '📊', group: 'Cartesian' },
  { type: 'combo',          label: 'Birleşik',       icon: '📈', group: 'Cartesian' },
  { type: 'pie',            label: 'Pasta',          icon: '🥧', group: 'Part-of-Whole' },
  { type: 'treemap',        label: 'Blok',           icon: '▦',  group: 'Part-of-Whole' },
  { type: 'sunburst',       label: 'Güneş',          icon: '☀️', group: 'Part-of-Whole' },
  { type: 'sankey',         label: 'Sankey',         icon: '〰️', group: 'Part-of-Whole' },
  { type: 'scatter',        label: 'Dağılım',        icon: '⬤',  group: 'Statistical' },
  { type: 'bubble',         label: 'Kabarcık',       icon: '⬤',  group: 'Statistical' },
  { type: 'heatmap',        label: 'Isı Haritası',   icon: '🟥', group: 'Statistical' },
  { type: 'radar',          label: 'Radar',          icon: '🕸️', group: 'Statistical' },
  { type: 'gauge',          label: 'Gösterge',       icon: '⏱️', group: 'Single Value' },
  { type: 'summary',        label: 'Özet / KPI',     icon: '🔢', group: 'Single Value' },
  { type: 'table',          label: 'Tablo',          icon: '📋', group: 'Tabular' },
  { type: 'pivot',          label: 'Pivot',          icon: '↔️', group: 'Tabular' },
  { type: 'tab_panel',      label: 'Tab Panel',      icon: '🗂️', group: 'Composite' },
  { type: 'map',            label: 'Harita',         icon: '🗺️', group: 'Composite' },
]

// ─── Semantic badge ────────────────────────────────────────────────────────────

function SemanticBadge({ type }: { type?: string }) {
  const map: Record<string, string> = {
    metric: 'bg-blue-100 text-blue-700', dimension: 'bg-green-100 text-green-700',
    date: 'bg-purple-100 text-purple-700', id: 'bg-gray-100 text-gray-500', text: 'bg-amber-100 text-amber-700',
  }
  const cls = map[type || ''] || 'bg-gray-100 text-gray-500'
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{type || '?'}</span>
}

// ─── Data Model Panel ──────────────────────────────────────────────────────────

function DataModelPanel({ datasets, selectedDatasetId, onSelectDataset, columns }: {
  datasets: Dataset[]; selectedDatasetId: number | null
  onSelectDataset: (id: number) => void; columns: ColumnProfile[]
}) {
  const groups = {
    Metrikler:   columns.filter(c => c.semantic_type === 'metric'),
    Boyutlar:    columns.filter(c => c.semantic_type === 'dimension'),
    Tarihler:    columns.filter(c => c.semantic_type === 'date'),
    Diğer:       columns.filter(c => !['metric','dimension','date'].includes(c.semantic_type || '')),
  }
  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Veri Modeli</span>
        </div>
        <select
          value={selectedDatasetId || ''}
          onChange={e => onSelectDataset(Number(e.target.value))}
          className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Dataset seç…</option>
          {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {(Object.entries(groups) as [string, ColumnProfile[]][]).map(([group, cols]) => {
          if (!cols.length) return null
          return (
            <div key={group}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">{group}</p>
              {cols.map(col => (
                <div key={col.column_name} draggable
                  onDragStart={e => e.dataTransfer.setData('text/column', col.column_name)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-grab active:cursor-grabbing group">
                  <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-700 truncate font-mono">{col.column_name}</span>
                  <SemanticBadge type={col.semantic_type} />
                </div>
              ))}
            </div>
          )
        })}
        {!columns.length && selectedDatasetId && <p className="text-xs text-gray-400 text-center mt-4">Yükleniyor…</p>}
        {!selectedDatasetId && <p className="text-xs text-gray-400 text-center mt-4">Dataset seçin</p>}
      </div>
    </aside>
  )
}

// ─── Chart Type Picker ────────────────────────────────────────────────────────

function ChartTypePicker({ onSelect, onClose }: { onSelect: (t: WidgetType) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const filtered = CHART_TYPES.filter(ct =>
    ct.label.toLowerCase().includes(search.toLowerCase()) || ct.type.includes(search.toLowerCase()))
  const groups = [...new Set(CHART_TYPES.map(c => c.group))]
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Grafik Tipi Seç</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <input autoFocus type="text" placeholder="Ara…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-4">
          {groups.map(group => {
            const items = filtered.filter(ct => ct.group === group)
            if (!items.length) return null
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                <div className="grid grid-cols-4 gap-2">
                  {items.map(ct => (
                    <button key={ct.type} onClick={() => { onSelect(ct.type); onClose() }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <span className="text-xl">{ct.icon}</span>
                      <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{ct.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Widget Config Panel ──────────────────────────────────────────────────────

function WidgetConfigPanel({ widget, columns, onUpdate, onClose, onDelete }: {
  widget: BuilderWidget; columns: ColumnProfile[]
  onUpdate: (id: string, patch: Partial<BuilderWidget>) => void
  onClose: () => void; onDelete: (id: string) => void
}) {
  const [previewResult, setPreviewResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [sqlError, setSqlError] = useState('')

  const colNames = columns.map(c => c.column_name)
  const typeLabel = CHART_TYPES.find(ct => ct.type === widget.widget_type)?.label || widget.widget_type

  const runQuery = async () => {
    if (!widget.query_sql?.trim()) { setSqlError('SQL boş olamaz.'); return }
    setRunning(true); setSqlError('')
    try {
      const r = await api.post('/query/sql', { sql: widget.query_sql })
      setPreviewResult(r.data)
    } catch (e: any) {
      setSqlError(e.response?.data?.detail || e.message || 'Sorgu hatası')
    } finally { setRunning(false) }
  }

  const set = (cfg: Partial<ChartConfig>) =>
    onUpdate(widget.id, { chart_config: { ...widget.chart_config, ...cfg } })

  return (
    <>
      <aside className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Widget Ayarları</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onDelete(widget.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grafik Tipi</label>
            <button onClick={() => setShowTypePicker(true)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
              <span className="text-gray-700">{typeLabel}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başlık</label>
            <input value={widget.title} onChange={e => onUpdate(widget.id, { title: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          {/* SQL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">SQL</label>
            <textarea value={widget.query_sql} onChange={e => onUpdate(widget.id, { query_sql: e.target.value })}
              rows={6} spellCheck={false}
              className="w-full px-2.5 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50"
              placeholder="SELECT category, SUM(amount) as revenue&#10;FROM orders&#10;GROUP BY category" />
            {sqlError && <p className="text-xs text-red-600 mt-1">{sqlError}</p>}
            <button onClick={runQuery} disabled={running}
              className="mt-1.5 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {running ? 'Çalışıyor…' : 'Sorguyu Çalıştır'}
            </button>
          </div>

          {/* Axis mapping */}
          {['column','stacked_column','bar','stacked_bar','line','area','combo','histogram','scatter','bubble','heatmap'].includes(widget.widget_type) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Eksen Eşleştirme</p>
              {[['x_key','X Ekseni'],['y_key','Y Ekseni']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-[10px] text-gray-500 mb-0.5">{lbl}</label>
                  <select value={(widget.chart_config as any)?.[key] || ''} onChange={e => set({ [key]: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">— otomatik —</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
              {widget.widget_type === 'bubble' && (
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Boyut (size_key)</label>
                  <select value={widget.chart_config?.size_key || ''} onChange={e => set({ size_key: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none bg-white">
                    <option value="">— otomatik —</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Label/Value mapping */}
          {['pie','donut_chart','treemap','sunburst','sankey'].includes(widget.widget_type) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Değer Eşleştirme</p>
              {[['label_key','Etiket'],['value_key','Değer']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="block text-[10px] text-gray-500 mb-0.5">{lbl}</label>
                  <select value={(widget.chart_config as any)?.[key] || ''} onChange={e => set({ [key]: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none bg-white">
                    <option value="">— otomatik —</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
            <select value={widget.chart_config?.format_type || ''} onChange={e => set({ format_type: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none bg-white">
              <option value="">Sayı</option>
              <option value="currency">Para (₺)</option>
              <option value="percent">Yüzde (%)</option>
            </select>
          </div>

          {/* Preview */}
          {previewResult && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Önizleme ({previewResult.row_count} satır, {previewResult.execution_time_ms}ms)
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: 160 }}>
                <ChartWidget widget={{ ...widget, id: -1, dashboard_id: -1 } as any} previewResult={previewResult} />
              </div>
            </div>
          )}
        </div>
      </aside>

      {showTypePicker && (
        <ChartTypePicker onSelect={t => onUpdate(widget.id, { widget_type: t })} onClose={() => setShowTypePicker(false)} />
      )}
    </>
  )
}

// ─── Canvas Widget Card ───────────────────────────────────────────────────────

function CanvasWidgetCard({ widget, isSelected, onSelect, onDuplicate, onDelete }: {
  widget: BuilderWidget; isSelected: boolean
  onSelect: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const typeDef = CHART_TYPES.find(ct => ct.type === widget.widget_type)
  return (
    <div onClick={onSelect}
      className={`h-full flex flex-col bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">{typeDef?.icon}</span>
          <span className="text-xs font-medium text-gray-700 truncate">{widget.title || 'Adsız Widget'}</span>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); onDuplicate() }} className="p-0.5 text-gray-400 hover:text-blue-600" title="Kopyala"><Copy className="w-3 h-3" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-0.5 text-gray-400 hover:text-red-500" title="Sil"><Trash2 className="w-3 h-3" /></button>
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-300">
        <div className="text-center">
          <span className="text-3xl">{typeDef?.icon}</span>
          <p className="text-xs mt-1 text-gray-400">{typeDef?.label}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initDatasetId = searchParams.get('dataset') ? Number(searchParams.get('dataset')) : null
  const isEditing = !!id

  const [name, setName] = useState('Yeni Dashboard')
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(initDatasetId)
  const [widgets, setWidgets] = useState<BuilderWidget[]>([])
  const [layout, setLayout] = useState<Layout[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [containerWidth, setContainerWidth] = useState(900)
  const [loadingExisting, setLoadingExisting] = useState(isEditing)

  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const { data: columns = [] } = useQuery<ColumnProfile[]>({
    queryKey: ['dataset-columns', selectedDatasetId],
    queryFn: () => api.get(`/datasets/${selectedDatasetId}/columns`).then(r => r.data),
    enabled: !!selectedDatasetId,
  })

  // Load existing dashboard when editing
  useEffect(() => {
    if (!id) return
    setLoadingExisting(true)
    api.get(`/dashboards/${id}`).then(res => {
      const d = res.data
      const dash = d.dashboard || d
      const existingWidgets: any[] = d.widgets || []
      setName(dash.name || 'Dashboard')
      if (dash.dataset_id) setSelectedDatasetId(dash.dataset_id)
      const bw: BuilderWidget[] = existingWidgets.map(w => ({
        id: String(w.id),
        widget_type: w.widget_type,
        title: w.title,
        query_sql: w.query_sql || '',
        chart_config: w.config_json || w.chart_config || {},
        position: {
          x: w.position_json?.x ?? 0,
          y: w.position_json?.y ?? 0,
          w: w.position_json?.w ?? 4,
          h: w.position_json?.h ?? 4,
        },
      }))
      setWidgets(bw)
      setLayout(bw.map(w => ({ i: w.id, ...w.position })))
    }).catch(err => {
      console.error('Dashboard yüklenemedi:', err)
    }).finally(() => setLoadingExisting(false))
  }, [id])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        dataset_id: selectedDatasetId,
        widgets: widgets.map(w => ({
          widget_type: w.widget_type,
          title: w.title,
          query_sql: w.query_sql,
          chart_config: w.chart_config,
          position_json: w.position,
        })),
      }
      if (isEditing) {
        // Update existing: delete+recreate widgets via PUT
        const r = await api.put(`/dashboards/${id}`, payload)
        return r.data
      } else {
        const r = await api.post('/dashboards', payload)
        return r.data
      }
    },
    onSuccess: d => navigate(`/dashboards/${d.id || id}`),
  })

  const addWidget = useCallback((type: WidgetType) => {
    const wid = uuidv4()
    const x = (widgets.length * 2) % 12
    const y = Math.floor(widgets.length / 6) * 4
    const nw: BuilderWidget = {
      id: wid, widget_type: type,
      title: CHART_TYPES.find(ct => ct.type === type)?.label || type,
      query_sql: 'SELECT * FROM table_name LIMIT 100',
      chart_config: {}, position: { x, y, w: 4, h: 4 },
    }
    setWidgets(prev => [...prev, nw])
    setLayout(prev => [...prev, { i: wid, x, y, w: 4, h: 4 }])
    setSelectedWidgetId(wid)
  }, [widgets.length])

  const updateWidget = useCallback((id: string, patch: Partial<BuilderWidget>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [])

  const deleteWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id))
    setLayout(prev => prev.filter(l => l.i !== id))
    if (selectedWidgetId === id) setSelectedWidgetId(null)
  }, [selectedWidgetId])

  const duplicateWidget = useCallback((id: string) => {
    const src = widgets.find(w => w.id === id)
    if (!src) return
    const nid = uuidv4()
    const nw = { ...src, id: nid, title: src.title + ' (kopya)', position: { ...src.position, x: (src.position.x + 4) % 12, y: src.position.y + 4 } }
    setWidgets(prev => [...prev, nw])
    setLayout(prev => [...prev, { i: nid, x: nw.position.x, y: nw.position.y, w: nw.position.w, h: nw.position.h }])
  }, [widgets])

  const onLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout)
    setWidgets(prev => prev.map(w => {
      const l = newLayout.find(n => n.i === w.id)
      if (!l) return w
      return { ...w, position: { x: l.x, y: l.y, w: l.w, h: l.h } }
    }))
  }, [])

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId) || null
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerWidth(node.getBoundingClientRect().width)
  }, [])

  if (loadingExisting) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Dashboard yükleniyor…</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboards')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Dashboardlara dön"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Geri</span>
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <BarChart2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-sm font-semibold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 w-52 min-w-0"
          placeholder="Dashboard adı…"
        />
        {isEditing && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Düzenleniyor</span>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowTypePicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Widget Ekle
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveMutation.isPending ? 'Kaydediliyor…' : isEditing ? 'Güncelle' : 'Kaydet'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Data Model Panel */}
        <DataModelPanel
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
          columns={columns}
        />

        {/* Canvas */}
        <main
          ref={measuredRef}
          className="flex-1 overflow-auto bg-gray-100 p-4"
          onDrop={e => { const col = e.dataTransfer.getData('text/column'); if (col) addWidget('column') }}
          onDragOver={e => e.preventDefault()}
        >
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Dashboard boş</p>
                <p className="text-xs text-gray-400 mt-1">
                  "Widget Ekle" butonuna tıklayın veya<br />sol panelden bir sütunu sürükleyin
                </p>
              </div>
              <button onClick={() => setShowTypePicker(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" /> İlk Widget'ı Ekle
              </button>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={60}
              width={containerWidth - 32}
              isDraggable
              isResizable
              onLayoutChange={onLayoutChange}
              draggableHandle=".drag-handle"
            >
              {widgets.map(w => (
                <div key={w.id}>
                  <CanvasWidgetCard
                    widget={w}
                    isSelected={selectedWidgetId === w.id}
                    onSelect={() => setSelectedWidgetId(w.id)}
                    onDuplicate={() => duplicateWidget(w.id)}
                    onDelete={() => deleteWidget(w.id)}
                  />
                </div>
              ))}
            </GridLayout>
          )}
        </main>

        {/* Config Panel */}
        {selectedWidget && (
          <WidgetConfigPanel
            widget={selectedWidget}
            columns={columns}
            onUpdate={updateWidget}
            onClose={() => setSelectedWidgetId(null)}
            onDelete={deleteWidget}
          />
        )}
      </div>

      {showTypePicker && (
        <ChartTypePicker onSelect={addWidget} onClose={() => setShowTypePicker(false)} />
      )}
    </div>
  )
}
