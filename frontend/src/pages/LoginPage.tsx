import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Zap, BarChart2, Sparkles, TrendingUp, Eye, EyeOff, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface LoginForm { email: string; password: string }

const features = [
  { icon: BarChart2,  text: '20+ grafik tipi' },
  { icon: Sparkles,   text: 'AI dashboard üretici' },
  { icon: TrendingUp, text: 'Gerçek zamanlı analiz' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', data)
      const { access_token } = res.data
      const meRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${access_token}` } })
      setAuth(meRes.data, access_token)
      navigate('/')
    } catch (e: unknown) {
      setError((e as any).response?.data?.detail || 'Giriş başarısız')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)' }}>

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)' }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-xl tracking-tight">Vela BI</span>
            <span className="block text-[10px] text-indigo-300 font-medium tracking-widest uppercase">Analytics Platform</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Verilerinizi<br />
            <span style={{ background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              görselleştirin.
            </span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-sm">
            AI destekli BI platformu ile veri bağlantılarınızı birleştirin, dashboard'lar oluşturun ve içgörüleri keşfedin.
          </p>
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
                  <Icon className="w-4 h-4 text-indigo-300" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs relative">© 2025 Vela BI · Tüm hakları saklıdır</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">Vela BI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Hoşgeldiniz</h1>
            <p className="text-gray-500 text-sm mt-1">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Email Adresi
              </label>
              <input
                {...register('email', { required: true })}
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                placeholder="ornek@sirket.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Şifre
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: true })}
                  type={showPass ? 'text' : 'password'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
                <span className="text-red-400">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Giriş yapılıyor…
                </span>
              ) : (
                <>Giriş Yap <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
