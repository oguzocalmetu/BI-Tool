import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Database, Link2, Sparkles, ArrowRight, PenLine, TrendingUp, Clock, Zap } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function DashboardHome() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] || 'Kullanıcı'

  const { data: dashboards } = useQuery({ queryKey: ['dashboards'], queryFn: () => api.get('/dashboards').then(r => r.data) })
  const { data: datasets }   = useQuery({ queryKey: ['datasets'],   queryFn: () => api.get('/datasets').then(r => r.data) })
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: () => api.get('/connections').then(r => r.data) })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  const stats = [
    { label: 'Dashboards', value: dashboards?.length ?? 0, icon: BarChart2,   color: '#6366f1', bg: '#eef2ff', link: '/dashboards' },
    { label: 'Datasetler', value: datasets?.length ?? 0,   icon: Database,    color: '#10b981', bg: '#ecfdf5', link: '/datasets' },
    { label: 'Bağlantılar',value: connections?.length ?? 0,icon: Link2,       color: '#f59e0b', bg: '#fffbeb', link: '/connections' },
  ]

  const actions = [
    {
      title: 'AI ile Dashboard Oluştur',
      desc: 'İsteğinizi yazın, AI saniyeler içinde dashboard hazırlasın',
      icon: Sparkles,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      link: '/ai-generator',
      cta: 'Deneyin',
      dark: true,
    },
    {
      title: 'Manuel Builder',
      desc: 'Sürükle-bırak ile istediğiniz dashboard'ı kendiniz tasarlayın',
      icon: PenLine,
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      link: '/builder',
      cta: 'Başlat',
      dark: false,
    },
    {
      title: 'Veri Bağlantısı Ekle',
      desc: 'PostgreSQL, MySQL, CSV ve diğer kaynaklarınızı bağlayın',
      icon: Link2,
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      link: '/connections',
      cta: 'Bağlan',
      dark: false,
    },
  ]

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {/* ── Hero header ── */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">👋</span>
              <h1 className="text-xl font-bold text-gray-900">{greeting}, {firstName}</h1>
            </div>
            <p className="text-sm text-gray-500">İşte platformunuza genel bakış</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <button key={s.label} onClick={() => navigate(s.link)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: s.bg }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </button>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Hızlı Başlangıç</h2>
          <div className="grid grid-cols-3 gap-4">
            {actions.map(a => (
              <button key={a.link} onClick={() => navigate(a.link)}
                className="relative p-6 rounded-2xl text-left hover:shadow-lg transition-all group overflow-hidden border border-transparent hover:border-gray-200"
                style={{ background: a.gradient }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${a.dark ? 'bg-white/20' : 'bg-white shadow-sm border border-gray-100'}`}>
                  <a.icon className={`w-5 h-5 ${a.dark ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <h3 className={`font-semibold text-[14px] mb-1.5 ${a.dark ? 'text-white' : 'text-gray-900'}`}>{a.title}</h3>
                <p className={`text-xs leading-relaxed mb-4 ${a.dark ? 'text-indigo-100' : 'text-gray-500'}`}>{a.desc}</p>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${a.dark ? 'text-white' : 'text-indigo-600'}`}>
                  {a.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent dashboards ── */}
        {dashboards?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Son Dashboardlar</h2>
              <button onClick={() => navigate('/dashboards')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Tümünü gör <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboards.slice(0, 4).map((d: any) => (
                <button key={d.id} onClick={() => navigate(`/dashboards/${d.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left group overflow-hidden">
                  {/* Preview bar */}
                  <div className="h-1 w-full" style={{ background: d.is_ai_generated ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
                  {/* Mini chart preview area */}
                  <div className="h-24 flex items-end gap-1 px-4 pt-3 pb-2">
                    {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t transition-all"
                        style={{ height: `${h}%`, background: d.is_ai_generated ? `rgba(99,102,241,${0.15 + i * 0.08})` : `rgba(59,130,246,${0.15 + i * 0.08})` }} />
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{d.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {d.is_ai_generated && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                          <Zap className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 truncate">
                        {new Date(d.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty onboarding ── */}
        {dashboards?.length === 0 && connections?.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
              <TrendingUp className="w-7 h-7 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Başlamak için bir veri kaynağı bağlayın</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              PostgreSQL, MySQL, CSV dosyası veya diğer kaynakları bağlayın ve verilerinizi görselleştirmeye başlayın.
            </p>
            <button onClick={() => navigate('/connections')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Link2 className="w-4 h-4" /> Veri Kaynağı Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
