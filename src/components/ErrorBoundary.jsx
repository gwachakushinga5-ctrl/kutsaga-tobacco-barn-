import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Kutsaga dashboard render error', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#020617] p-4 text-slate-100">
        <div className="glass-card w-full max-w-xl p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-red-400">
            Dashboard could not render
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-100">
            Something went wrong while loading the page
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            The error details are below. Reload to try again; if it keeps happening, send these
            details to the dashboard maintainer.
          </p>
          <pre className="kutsaga-scroll mt-4 max-h-52 overflow-auto rounded border border-slate-700/80 bg-slate-950/70 p-3 font-mono text-[10px] leading-relaxed text-red-200">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-500/20"
          >
            Reload dashboard
          </button>
        </div>
      </div>
    )
  }
}
