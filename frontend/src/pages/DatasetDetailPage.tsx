import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Table2, Activity } from 'lucide-react'
import api from '@/lib/api'

export default function DatasetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'preview' | 'columns' | 'profile'>('preview')

  const { data: dataset } = useQuery({ queryKey: ['dataset', id], queryFn: () => api.get(`/datasets/${id}`).then(r => r.data) })
  const { data: preview } = useQuery({ queryKey: ['preview', id], queryFn: () => api.post(`/datasets/${id}/preview`, null, { params: { limit: 50 } }).then(r => r.data), enabled: tab === 'preview' })
  const { data: columns } = useQuery({ queryKey: ['columns', id], queryFn: () => api.get(`/datasets/${id}/columns`).then(r => r.data) })
  const { data: profile } = useQuery({ queryKey: ['profile', id], queryFn: () => api.get(`/datasets/${id}/profile`).then(r => r.data), enabled: tab === 'profile' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/datasets')} className="text-sm text-blue-600 hover:underline mb-1">← Datasets</button>
          <h1 className="text-2xl font-bold text-gray-900">{dataset?.name || 'Loading...'}</h1>
          <p className="text-sm text-gray-500">{dataset?.source_type} {dataset?.table_name ? `· ${dataset.table_name}` : ''}</p>
        </div>
        <button
          onClick={() => navigate(`/ai-generator?dataset=${id}`)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" /> Generate Dashboard
        </button>
      </div>

      {/* Stats */}
      {dataset && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{dataset.row_count_est?.toLocaleString() || '—'}</p>
            <p className="text-sm text-gray-500">Rows</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{columns?.length || '—'}</p>
            <p className="text-sm text-gray-500">Columns</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{dataset.last_profiled_at ? '✓' : '—'}</p>
            <p className="text-sm text-gray-500">Profiled</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {(['preview', 'columns', 'profile'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Preview */}
      {tab === 'preview' && preview && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {preview.columns?.map((col: string) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows?.slice(0, 50).map((row: unknown[], i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                        {cell === null || cell === undefined ? <span className="text-gray-300">null</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
            Showing {Math.min(50, preview.rows?.length || 0)} of {preview.row_count} rows
          </div>
        </div>
      )}

      {/* Columns */}
      {tab === 'columns' && columns && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Column', 'Type', 'Semantic', 'Nulls %', 'Unique', 'Min', 'Max', 'Samples'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((col: { column_name: string; data_type?: string; semantic_type?: string; null_pct?: number; unique_count?: number; min_value?: string; max_value?: string; sample_values?: string[] }) => (
                <tr key={col.column_name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-medium text-gray-900">{col.column_name}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{col.data_type || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      col.semantic_type === 'metric' ? 'bg-blue-100 text-blue-700' :
                      col.semantic_type === 'dimension' ? 'bg-green-100 text-green-700' :
                      col.semantic_type === 'date' ? 'bg-purple-100 text-purple-700' :
                      col.semantic_type === 'id' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{col.semantic_type || '—'}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{col.null_pct != null ? `${col.null_pct}%` : '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{col.unique_count?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{col.min_value || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{col.max_value || '—'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{col.sample_values?.slice(0, 3).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && (
        profile?.row_count ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-xl font-bold">{profile.row_count?.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Rows</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-xl font-bold">{profile.column_count}</p>
                <p className="text-sm text-gray-500">Columns</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-xl font-bold">{profile.quality_score ? `${Math.round(profile.quality_score * 100)}%` : '—'}</p>
                <p className="text-sm text-gray-500">Quality Score</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Profiled at: {new Date(profile.profiled_at).toLocaleString()}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No profile data. Click the refresh icon on the dataset to run profiling.</p>
          </div>
        )
      )}
    </div>
  )
}
