import { useState } from 'react'
import { Loader2, LockKeyhole, LogIn, TriangleAlert } from 'lucide-react'
import { API_BASE_URL, API_KEY } from '../services/api'
import { Logo } from './ui/Logo'

export const LoginScreen = ({ onSubmit, pending, error }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!username || !password || pending) return
    onSubmit(username, password)
  }

  return (
    <div className="login-green app-shell-min flex w-full items-center justify-center bg-[#04170d] p-4 text-emerald-50">
      <div className="glass-card w-full max-w-sm p-6">
        <div className="flex justify-center">
          <Logo className="w-52" />
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-username"
              className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60"
            >
              Username
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="kutsaga-select mt-1"
              placeholder="operator"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="kutsaga-select mt-1"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-2.5 py-2">
              <TriangleAlert size={12} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-[9.5px] leading-relaxed text-red-200">{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#042b16] shadow-[0_10px_26px_-12px_rgba(34,197,94,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={12} />}
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-2.5 py-2">
          <LockKeyhole size={10} className="mt-0.5 shrink-0 text-emerald-300/70" />
          <p className="text-[8px] leading-relaxed text-emerald-100/50">
            {API_KEY
              ? 'An API key is configured in this environment; the app can also run without signing in.'
              : 'Credentials are issued by the platform administrator.'}
            <br />
            <span className="font-mono text-emerald-200/40">
              {API_BASE_URL || window.location.origin}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
