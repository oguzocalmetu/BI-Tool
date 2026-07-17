import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard, Database, Link2, Sparkles, BarChart2,
  LogOut, PenLine, ChevronRight, Zap,
} from 'lucide-react'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Ana Sayfa',     end: true },
  { to: '/connections',  icon: Link2,            label: 'Bağlantılar' },
  { to: '/datasets',     icon: Database,         label: 'Datasetler' },
  { to: '/dashboards',   icon: BarChart2,        label: 'Dashboardlar' },
  { to: '/ai-generator', icon: Sparkles,         label: 'AI Üretici',  badge: 'Yeni' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-[15px] tracking-tight">Vela BI</span>
            <span className="block text-[10px] text-indigo-300 font-medium tracking-widest uppercase">Analytics</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-2 mt-1">
            Menü
          </p>
          {navItems.map(({ to, icon: Icon, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-2">
              Araçlar
            </p>
            <button
              onClick={() => navigate('/builder')}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                location.pathname.startsWith('/builder')
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PenLine className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
              <span className="flex-1">Dashboard Builder</span>
              <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
            </button>
          </div>
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-2 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{user?.full_name || 'Kullanıcı'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2.5 w-full px-3 py-2 mt-1 text-[12px] text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
