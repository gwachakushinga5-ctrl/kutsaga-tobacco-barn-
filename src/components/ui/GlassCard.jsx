export const GlassCard = ({ children, className = '', ...props }) => (
  <section className={`glass-card ${className}`} {...props}>
    {children}
  </section>
)
