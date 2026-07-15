import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ArrowLeft, Sparkles, Filter, X } from 'lucide-react'
import api from '@/lib/api'
import ChartWidget from '@/components/charts/ChartWidget'
import { Widget, DashboardFilter } from '@/types'

export default function DashboardViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [filterParams, setFilterParams] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-detail', id],
    queryFn: () => api.get(`/dashboards/${id}`).then(r => r.data),
  })

  const dashboard = data?.dashboard
  const widgets: Widget[] = data?.widgets || []
  const filters: DashboardFilter[] = data?.filters || []

  const layout = widgets.map((w) => ({
    i: String(w.id),
    x: w.position_json.x,
    y: w.position_json.y,
    w: w.position_json.w,
    h: w.position_json.h,
    static: true,
  }))

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterParams(prev => ({ ...prev, [key]: value }))
  }, [])

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  if (!dashboard) return <div className="p-8 text-gray-500">Dashboard not found.</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboards')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">{dashboard.name}</h1>
              {dashboard.is_ai_generated && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              )}
            </div>
            {dashboard.description && <p className="text-sm text-gray-500">{dashboard.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && filters.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">{f.filter_name}:</label>
              {f.filter_type === 'date_range' && (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  />
                  <span className="text-gray-400 text-xs">—</span>
                  <input
                    type="date"
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  />
                </div>
              )}
              {f.filter_type === 'dropdown' && (
                <select
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                  onChange={(e) => handleFilterChange(f.column_name || '', e.target.value)}
                >
                  <option value="">All</option>
                </select>
              )}
            </div>
          ))}
          {Object.keys(filterParams).length > 0 && (
            <button
              onClick={() => setFilterParams({})}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {widgets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No widgets in this dashboard.</div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={80}
            width={1200}
            isDraggable={false}
            isResizable={false}
          >
            {widgets.map((widget) => (
              <div key={String(widget.id)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 pt-3 pb-1 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">{widget.title}</h3>
                  {widget.widget_type === 'kpi_card' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">KPI</span>
                  )}
                </div>
                <div className="h-[calc(100%-2.5rem)]">
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
