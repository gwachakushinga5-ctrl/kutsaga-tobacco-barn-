import { LogOut } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'
import { Logo } from './ui/Logo'

export const SidebarHeader = ({ user, onSignOut }) => {
  const role = (user?.role ?? 'user').toUpperCase()
  const username = user?.username ?? 'operator'

  return (
    <GlassCard className="shrink-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center">
            <Logo className="w-44" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-full border border-slate-700/80 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[7.5px] font-semibold tracking-[0.16em] text-slate-400">
              {role}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/[0.07] px-1.5 py-1 font-mono text-[9px] text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.12]"
              title={`Signed in as ${username} — sign out`}
            >
              <LogOut size={9} />
              {username}
            </button>
          </div>
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9.5px] text-slate-400">
          <span className="text-cyan-300/90">Hybrid Z18 context</span>
          <span className="text-slate-600">·</span>
          <span>AI discovery</span>
          <span className="text-slate-600">·</span>
          <span>55 m TRB matching</span>
        </p>
      </div>
      <div className="border-t border-slate-800/80 bg-slate-950/25 px-4 py-2">
        <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Agricultural Data Science and Engineering
        </p>
      </div>
    </GlassCard>
  )
}
