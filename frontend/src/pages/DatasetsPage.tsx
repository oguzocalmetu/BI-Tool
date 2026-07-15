import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Database, ChevronRight, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

export default function DatasetsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [tables, setTables] = useState<{ name: string; schema: string }[]>([])
  const { register, handleSubmit, watch, reset } = useForm()
  const selectedConn = watch('connection_id')

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then(r => r.data),
  })

  const fetchTables = async (connId: string) => {
    if (!connId) return
    const res = await api.get(`/connections/${connId}/tables`)
    setTables(res.data.tables || [])
  }

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post('/datasets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }); setShowForm(false); reset() },
  })

  const profileMutation = useMutation({
    mutationFn: (id: number) => api.post(`/datasets/${id}/profile`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your data sources for analysis</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Dataset
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create Dataset</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input {...register('name', { required: true })} className="input" placeholder="My Dataset" />
              </div>
              <div>
                <label className="label">Connection</label>
                <select
                  {...register('connection_id', { required: true })}
                  className="input"
                  onChange={(e) => fetchTables(e.target.value)}
                >
                  <option value="">Select connection...</option>
                  {connections.map((c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Source Type</label>
                <select {...register('source_type')} className="input">
                  <option value="table">Table</option>
                  <option value="custom_sql">Custom SQL</option>
                </select>
              </div>
              {tables.length > 0 && (
                <div>
                  <label className="label">Table</label>
                  <select {...register('table_name')} className="input">
                    <option value="">Select table...</option>
                    {tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.schema}.{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Dataset'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-16">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No datasets yet. Create your first dataset.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {datasets.map((ds: { id: number; name: string; description?: string; source_type: string; table_name?: string; row_count_est?: number; last_profiled_at?: string }) => (
            <div key={ds.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/datasets/${ds.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{ds.name}</p>
                    <p className="text-sm text-gray-500">
                      {ds.source_type} {ds.table_name ? `· ${ds.table_name}` : ''}
                      {ds.row_count_est ? ` · ${ds.row_count_est.toLocaleString()} rows` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ds.last_profiled_at && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Profiled</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); profileMutation.mutate(ds.id) }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Run profiling"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
