import { Minus, Plus } from 'lucide-react'

export const ZoomControls = ({ mapRef }) => (
  <div className="glass-card flex flex-col overflow-hidden">
    <button
      type="button"
      onClick={() => mapRef.current?.zoomIn()}
      aria-label="Zoom in"
      title="Zoom in"
      className="grid h-9 w-9 place-items-center text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-300"
    >
      <Plus size={15} />
    </button>
    <div className="mx-2 h-px bg-slate-700/70" />
    <button
      type="button"
      onClick={() => mapRef.current?.zoomOut()}
      aria-label="Zoom out"
      title="Zoom out"
      className="grid h-9 w-9 place-items-center text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-300"
    >
      <Minus size={15} />
    </button>
  </div>
)
