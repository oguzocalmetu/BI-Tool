import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Check, AlertCircle, Loader2, Link2, ChevronRight, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Connection, ConnectionType } from '@/types'

// ─── Connector catalog ────────────────────────────────────────────────────────

interface ConnectorDef {
  type: ConnectionType
  label: string
  icon: string
  color: string
  description: string
  defaultPort?: number
  fields: ConnectorField[]
  extraFields?: ConnectorField[]
}

interface ConnectorField {
  key: string
  label: string
  type: 'text' | 'number' | 'password' | 'file'
  placeholder?: string
  required?: boolean
  isExtra?: boolean
}

const CONNECTORS: ConnectorDef[] = [
  {
    type: 'postgresql', label: 'PostgreSQL', icon: '🐘', color: 'bg-blue-50 text-blue-700',
    description: 'Open-source SQL veritabanı', defaultPort: 5432,
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
      { key: 'database_name', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'postgres' },
      { key: 'password', label: 'Parola', type: 'password', placeholder: '••••••••' },
    ],
    extraFields: [
      { key: 'ssl', label: 'SSL', type: 'text', placeholder: 'require / disable', isExtra: true },
    ],
  },
  {
    type: 'mysql', label: 'MySQL', icon: '🐬', color: 'bg-orange-50 text-orange-700',
    description: 'MySQL / MariaDB', defaultPort: 3306,
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '3306' },
      { key: 'database_name', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'root' },
      { key: 'password', label: 'Parola', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'oracle', label: 'Oracle', icon: '🔴', color: 'bg-red-50 text-red-700',
    description: 'Oracle Database', defaultPort: 1521,
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'db.corp.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '1521' },
      { key: 'database_name', label: 'Service Name', type: 'text', placeholder: 'ORCL', required: true },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'sys', required: true },
      { key: 'password', label: 'Parola', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'trino', label: 'Trino', icon: '⚡', color: 'bg-purple-50 text-purple-700',
    description: 'Trino / Starburst dağıtık SQL', defaultPort: 8080,
    fields: [
      { key: 'host', label: 'Coordinator Host', type: 'text', placeholder: 'trino.corp.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '8080' },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'trino' },
    ],
    extraFields: [
      { key: 'catalog', label: 'Catalog', type: 'text', placeholder: 'hive', isExtra: true },
      { key: 'schema', label: 'Schema', type: 'text', placeholder: 'default', isExtra: true },
      { key: 'http_scheme', label: 'Protocol', type: 'text', placeholder: 'http / https', isExtra: true },
    ],
  },
  {
    type: 'clickhouse', label: 'ClickHouse', icon: '🟡', color: 'bg-yellow-50 text-yellow-700',
    description: 'ClickHouse OLAP veritabanı', defaultPort: 8123,
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '8123' },
      { key: 'database_name', label: 'Database', type: 'text', placeholder: 'default' },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', placeholder: 'default' },
      { key: 'password', label: 'Parola', type: 'password', placeholder: '••••••••' },
    ],
    extraFields: [
      { key: 'secure', label: 'Secure (HTTPS)', type: 'text', placeholder: 'true / false', isExtra: true },
    ],
  },
  {
    type: 'snowflake', label: 'Snowflake', icon: '❄️', color: 'bg-cyan-50 text-cyan-700',
    description: 'Snowflake cloud data platform',
    fields: [
      { key: 'host', label: 'Account Identifier', type: 'text', placeholder: 'xy12345.eu-west-1', required: true },
      { key: 'database_name', label: 'Database', type: 'text', placeholder: 'MY_DB' },
      { key: 'username', label: 'Kullanıcı Adı', type: 'text', required: true },
      { key: 'password', label: 'Parola', type: 'password', placeholder: '••••••••' },
    ],
    extraFields: [
      { key: 'warehouse', label: 'Warehouse', type: 'text', placeholder: 'COMPUTE_WH', isExtra: true },
      { key: 'role', label: 'Role', type: 'text', placeholder: 'SYSADMIN', isExtra: true },
      { key: 'schema', label: 'Default Schema', type: 'text', placeholder: 'PUBLIC', isExtra: true },
    ],
  },
  {
    type: 'sqlite', label: 'SQLite', icon: '💾', color: 'bg-gray-100 text-gray-700',
    description: 'Dosya tabanlı SQLite', defaultPort: undefined,
    fields: [
      { key: 'file_path', label: 'Dosya Yolu', type: 'text', placeholder: '/data/mydb.sqlite', required: true, isExtra: true },
    ],
  },
  {
    type: 'csv', label: 'CSV / TSV', icon: '📄', color: 'bg-green-50 text-green-700',
    description: 'CSV veya TSV dosyası',
    fields: [
      { key: 'file_path', label: 'Dosya Yolu', type: 'text', placeholder: '/uploads/data.csv', required: true, isExtra: true },
    ],
    extraFields: [
      { key: 'delimiter', label: 'Ayraç', type: 'text', placeholder: ',', isExtra: true },
      { key: 'encoding', label: 'Encoding', type: 'text', placeholder: 'utf-8', isExtra: true },
    ],
  },
  {
    type: 'excel', label: 'Excel (.xlsx)', icon: '📊', color: 'bg-emerald-50 text-emerald-700',
    description: 'Microsoft Excel dosyası',
    fields: [
      { key: 'file_path', label: 'Dosya Yolu', type: 'text', placeholder: '/uploads/data.xlsx', required: true, isExtra: true },
    ],
  },
]

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ conn }: { conn: Connection }) {
  if (conn.last_test_success === true)
    return <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Bağlı</span>
  if (conn.last_test_success === false)
    return <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> Hata</span>
  return <span className="text-xs text-gray-400">Test edilmedi</span>
}

// ─── New Connection Modal ─────────────────────────────────────────────────────

function NewConnectionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [selected, setSelected] = useState<ConnectorDef | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const set = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }))

  const buildPayload = () => {
    if (!selected) return {}
    const extra: Record<string, string> = {}
    const top: Record<string, unknown> = { name, type: selected.type }
    const allFields = [...selected.fields, ...(selected.extraFields || [])]
    allFields.forEach(f => {
      if (f.isExtra) extra[f.key] = values[f.key] || ''
      else {
        if (f.type === 'number') top[f.key] = values[f.key] ? Number(values[f.key]) : (selected.defaultPort || null)
        else if (f.key === 'password') top[f.key] = values[f.key] || ''
        else top[f.key] = values[f.key] || ''
      }
    })
    top.extra_config = extra
    return top
  }

  const testConn = async () => {
    setTesting(true); setTestResult(null)
    try {
      const r = await api.post('/connections/test-preview', buildPayload())
      setTestResult({ ok: r.data.success, msg: r.data.message })
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.response?.data?.detail || 'Bağlantı başarısız' })
    } finally {
      setTesting(false) }
  }

  const save = useMutation({
    mutationFn: () => api.post('/connections', buildPayload()),
    onSuccess: () => { onSaved(); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {step === 'form' && (
            <button onClick={() => { setStep('pick'); setSelected(null) }} className="p-1 text-gray-400 hover:text-gray-600 mr-2">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <h3 className="font-semibold text-gray-900">{step === 'pick' ? 'Bağlantı Türü Seç' : `${selected?.label} Bağlantısı`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {step === 'pick' ? (
            <div className="grid grid-cols-3 gap-3">
              {CONNECTORS.map(c => (
                <button
                  key={c.type}
                  onClick={() => { setSelected(c); setName(`${c.label} - 1`); setValues({ port: String(c.defaultPort || '') }); setStep('form') }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{c.label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{c.description}</span>
                </button>
              ))}
            </div>
          ) : selected && (
            <div className="space-y-3">
              {/* Connection name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bağlantı Adı</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Örn: Üretim Veritabanı"
                />
              </div>

              {/* Connector fields */}
              {selected.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                    value={values[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}

              {/* Extra fields */}
              {selected.extraFields && selected.extraFields.length > 0 && (
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="text-xs font-medium text-gray-600 cursor-pointer">Gelişmiş Ayarlar</summary>
                  <div className="mt-3 space-y-3">
                    {selected.extraFields.map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                        <input
                          type={f.type === 'password' ? 'password' : 'text'}
                          value={values[f.key] || ''}
                          onChange={e => set(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Test result */}
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.ok ? <Check className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200">
            <button
              onClick={testConn}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Bağlantıyı Test Et
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Kaydet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({ conn, onDelete, onTest }: { conn: Connection; onDelete: () => void; onTest: () => void }) {
  const def = CONNECTORS.find(c => c.type === conn.type)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${def?.color || 'bg-gray-100'}`}>
          {def?.icon || '🗄️'}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{conn.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {def?.label} · {conn.host ? `${conn.host}${conn.port ? ':' + conn.port : ''}` : '—'}
            {conn.database_name ? ` / ${conn.database_name}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge conn={conn} />
        <button
          onClick={onTest}
          className="flex items-center gap-1 text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
        >
          <Link2 className="w-3 h-3" /> Test
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [testingId, setTestingId] = useState<number | null>(null)

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })

  const testConnection = async (id: number) => {
    setTestingId(id)
    try {
      await api.post(`/connections/${id}/test`)
      qc.invalidateQueries({ queryKey: ['connections'] })
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Veri Bağlantıları</h1>
          <p className="text-sm text-gray-500 mt-0.5">{connections.length} bağlantı</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Yeni Bağlantı
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <div className="flex justify-center mt-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        )}
        {!isLoading && connections.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 mt-16 text-center">
            <div className="text-5xl">🔌</div>
            <p className="text-sm font-medium text-gray-600">Henüz bağlantı yok</p>
            <p className="text-xs text-gray-400">PostgreSQL, MySQL, Oracle, Trino ve daha fazlasına bağlanın</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> İlk Bağlantıyı Ekle
            </button>
          </div>
        )}
        <div className="space-y-3 max-w-3xl">
          {connections.map(conn => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              onDelete={() => deleteMutation.mutate(conn.id)}
              onTest={() => testConnection(conn.id)}
            />
          ))}
        </div>
      </div>

      {showNew && (
        <NewConnectionModal
          onClose={() => setShowNew(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['connections'] })}
        />
      )}
    </div>
  )
}
