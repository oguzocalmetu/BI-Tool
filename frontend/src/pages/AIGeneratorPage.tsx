import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, ChevronRight, CheckCircle, AlertTriangle, Save, RefreshCw, Info } from 'lucide-react'
import api from '@/lib/api'
import { AIDashboardDraft, AIWidgetDraft } from '@/types'

const AUDIENCES = ['executive', 'manager', 'analyst', 'operations', 'finance', 'sales']
const DETAIL_LEVELS = ['summary', 'detailed', 'strategic', 'operational']

const CHART_TYPE_ICONS: Record<string, string> = {
  kpi_card: '📊', bar_chart: '📊', horizontal_bar_chart: '📊',
  line_chart: '📈', donut_chart: '🍩', table: '📋',
}

export default function AIGeneratorPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const presetDatasetId = params.get('dataset')

  const [step, setStep] = useState<'config' | 'generating' | 'preview'>('config')
  const [selectedDataset, setSelectedDataset] = useState(presetDatasetId || '')
  const [prompt, setPrompt] = useState('')
  const [audience, setAudience] = useState('manager')
  const [detailLevel, setDetailLevel] = useState('detailed')
  const [draft, setDraft] = useState<AIDashboardDraft | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [savingStatus, setSavingStatus] = useState('')

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const { data: columns = [] } = useQuery({
    queryKey: ['columns', selectedDataset],
    queryFn: () => api.get(`/datasets/${selectedDataset}/columns`).then(r => r.data),
    enabled: !!selectedDataset,
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/ai/datasets/${selectedDataset}/generate-dashboard`, {
      prompt, audience, detail_level: detailLevel,
    }).then(r => r.data),
    onSuccess: (data) => {
      setDraft(data.draft)
      setWarnings(data.warnings || [])
      setStep('preview')
    },
    onError: (e: unknown) => {
      alert('Generation failed: ' + ((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Unknown error'))
      setStep('config')
    },
  })

  const handleGenerate = () => {
    if (!selectedDataset) { alert('Please select a dataset'); return }
    if (!prompt.trim()) { alert('Please describe what you want'); return }
    setStep('generating')
    generateMutation.mutate()
  }

  const handleSave = async () => {
    if (!draft) return
    setSavingStatus('saving')
    try {
      const res = await api.post(`/ai/datasets/${selectedDataset}/save-dashboard`, draft)
      setSavingStatus('saved')
      setTimeout(() => navigate(`/dashboards/${res.data.dashboard_id}`), 800)
    } catch {
      setSavingStatus('error')
    }
  }

  const selectedDs = datasets.find((d: { id: number }) => String(d.id) === selectedDataset)
  const metrics = columns.filter((c: { semantic_type?: string }) => c.semantic_type === 'metric')
  const dimensions = columns.filter((c: { semantic_type?: string }) => c.semantic_type === 'dimension')
  const dates = columns.filter((c: { semantic_type?: string }) => c.semantic_type === 'date')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900">AI Dashboard Generator</h1>
          <p className="text-xs text-gray-500">Describe your goal, AI builds the dashboard</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Config step */}
        {step === 'config' && (
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            {/* Dataset selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">1. Select Dataset</label>
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a dataset...</option>
                {datasets.map((d: { id: number; name: string; table_name?: string; row_count_est?: number }) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.table_name ? `(${d.table_name})` : ''} {d.row_count_est ? `— ${d.row_count_est.toLocaleString()} rows` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dataset summary */}
            {selectedDataset && columns.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">Dataset Profile: {selectedDs?.name}</p>
                <div className="flex gap-4 text-blue-700">
                  <span>📐 {columns.length} columns</span>
                  <span>📊 {metrics.length} metrics</span>
                  <span>🏷 {dimensions.length} dimensions</span>
                  <span>📅 {dates.length} date fields</span>
                </div>
                {metrics.length > 0 && (
                  <p className="text-blue-600 mt-1 text-xs">
                    Metrics: {metrics.slice(0, 5).map((c: { column_name: string }) => c.column_name).join(', ')}{metrics.length > 5 ? '...' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Prompt */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">2. Describe Your Dashboard Goal</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Show monthly sales trends, category performance, top products, and total revenue KPIs for my sales team..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {/* Example prompts */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  'Sales performance by region, product and time',
                  'Customer churn risk and revenue trends',
                  'Executive summary with key KPIs',
                ].map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)}
                    className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">3. Target Audience</label>
                <div className="grid grid-cols-3 gap-2">
                  {AUDIENCES.map(a => (
                    <button key={a} onClick={() => setAudience(a)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${audience === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">4. Detail Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {DETAIL_LEVELS.map(d => (
                    <button key={d} onClick={() => setDetailLevel(d)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${detailLevel === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedDataset || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Generate Dashboard with AI
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Generating step */}
        {step === 'generating' && (
          <div className="flex items-center justify-center h-full min-h-96">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Generating Dashboard...</h2>
              <p className="text-gray-500 text-sm mb-6">AI is analyzing your data and building the perfect dashboard</p>
              <div className="space-y-2 text-sm text-gray-400">
                {['Analyzing dataset schema', 'Selecting metrics & dimensions', 'Generating SQL queries', 'Designing layout'].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && draft && (
          <div className="p-8">
            <div className="max-w-5xl mx-auto">
              {/* Draft header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{draft.dashboard_name}</h2>
                    <p className="text-gray-600 text-sm mt-1">{draft.dashboard_description}</p>
                    <p className="text-gray-500 text-xs mt-2">{draft.ai_summary}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => { setStep('config'); setDraft(null) }}
                      className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={savingStatus === 'saving' || savingStatus === 'saved'}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingStatus === 'saving' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> :
                       savingStatus === 'saved' ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> :
                       <><Save className="w-3.5 h-3.5" /> Save Dashboard</>}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <span className="text-xs bg-white text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                    👥 {draft.audience}
                  </span>
                  <span className="text-xs bg-white text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                    📐 {draft.detail_level}
                  </span>
                  <span className="text-xs bg-white text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                    🧩 {draft.widgets.length} widgets
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">Warnings ({warnings.length})</p>
                  </div>
                  {warnings.slice(0, 3).map((w, i) => (
                    <p key={i} className="text-xs text-yellow-700 ml-6">• {w}</p>
                  ))}
                </div>
              )}

              {/* Widget list */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Dashboard Widgets ({draft.widgets.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {draft.widgets.map((w: AIWidgetDraft) => (
                    <div key={w.widget_id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{CHART_TYPE_ICONS[w.type] || '📊'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{w.title}</p>
                          <span className="inline-block text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5">
                            {w.type.replace(/_/g, ' ')}
                          </span>
                          {w.ai_explanation && (
                            <div className="flex items-start gap-1 mt-2">
                              <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-500">{w.ai_explanation}</p>
                            </div>
                          )}
                          <div className="mt-2 bg-gray-50 rounded p-2">
                            <p className="text-xs font-mono text-gray-600 line-clamp-2 break-all">{w.query_sql}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              {draft.filters.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Filters</h3>
                  <div className="flex gap-2">
                    {draft.filters.map((f) => (
                      <span key={f.filter_id} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100">
                        {f.label} ({f.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
