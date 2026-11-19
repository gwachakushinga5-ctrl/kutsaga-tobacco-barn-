import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
    <main className="login-page app-shell-min flex w-full">
      <section className="login-brand relative hidden w-[46%] shrink-0 flex-col justify-between border-r border-[#17402a] px-10 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 bg-[#4ade80]" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a7c7b3]">
            Kutsaga · Field systems
          </span>
        </div>

        <div className="max-w-md">
          <div className="inline-flex rounded-md bg-[#f7f7f7] p-3 shadow-sm">
            <Logo className="w-60" />
          </div>

          <div className="mt-8 h-px w-12 bg-[#4ade80]" />

          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-white">
            Tobacco barn detection
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#bdd2c3]">
            Review satellite detections, verify candidate barns, and maintain the
            ground-truth record for Kutsaga Research Station.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[#1e4730] pt-6 text-xs">
            <div>
              <dt className="text-[#8fb39c]">Station</dt>
              <dd className="mt-1 font-mono text-[#e8efe9]">KUTSAGA / ZW</dd>
            </div>
            <div>
              <dt className="text-[#8fb39c]">Imagery</dt>
              <dd className="mt-1 font-mono text-[#e8efe9]">Z18 · Z19</dd>
            </div>
            <div>
              <dt className="text-[#8fb39c]">Mode</dt>
              <dd className="mt-1 font-mono text-[#e8efe9]">MODEL + GEMINI</dd>
            </div>
            <div>
              <dt className="text-[#8fb39c]">Access</dt>
              <dd className="mt-1 font-mono text-[#e8efe9]">OPERATORS</dd>
            </div>
          </dl>
        </div>

        <p className="text-[11px] text-[#7ea38c]">
          © 2026 Kutsaga Research · Internal use
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1f8a4c]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1f7a3d]">
              Operator access
            </span>
          </div>

          <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[#102018]">
            Sign in
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#5c6b61]">
            Use your platform credentials to open the barn review workspace.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-username"
                className="block text-[13px] font-medium text-[#34453a]"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="login-input mt-2"
                placeholder="operator"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[13px] font-medium text-[#34453a]"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="login-input mt-2"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="border-l-2 border-[#c0392b] bg-[#fdf0ee] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#8e2f24]"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending || !username || !password}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-[#177a3d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#126632] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f8a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f6f2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : null}
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-10 border-t border-[#d9e0d8] pt-5 text-[11.5px] leading-relaxed text-[#6b7a70]">
            <p>
              {API_KEY
                ? 'An API key is configured in this environment; the app can also run without signing in.'
                : 'Credentials are issued by the platform administrator.'}
            </p>
            <p className="mt-1.5 font-mono text-[#8a988e]">
              {API_BASE_URL || window.location.origin}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
