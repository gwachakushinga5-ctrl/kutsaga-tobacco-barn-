export const Logo = () => (
  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/20 via-emerald-400/10 to-slate-950 shadow-[0_0_24px_-8px_rgba(34,211,238,0.65)]">
    <svg
      viewBox="0 0 40 40"
      className="h-8 w-8"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kutsaga-logo-gradient" x1="8" y1="8" x2="33" y2="34">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path
        d="M10 17.5 20 10l10 7.5V31H10V17.5Z"
        stroke="url(#kutsaga-logo-gradient)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M16 31v-7.2h8V31"
        stroke="url(#kutsaga-logo-gradient)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 21.5c-.9-1.6-1.1-3.3-.5-5M32 21.5c.9-1.6 1.1-3.3.5-5"
        stroke="#22d3ee"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle cx="20" cy="19.5" r="1.25" fill="#67e8f9" />
    </svg>
  </div>
)
