export const Logo = ({ className = 'w-44' }) => (
  <div
    className={`flex shrink-0 items-center overflow-hidden rounded-lg bg-[#f7f7f7] ${className}`}
    style={{ aspectRatio: '727 / 330' }}
  >
    <img
      src="/kutsaga-logo.jpg"
      alt="Kutsaga"
      draggable={false}
      className="h-full w-full object-contain"
    />
  </div>
)
