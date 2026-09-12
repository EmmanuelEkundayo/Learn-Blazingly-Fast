/**
 * LBF Brand Logo Component
 * Simple, flat monogram with normal font:
 * L (Blue #3b82f6), B (Amber-Orange #f59e0b), F (White #ffffff).
 * No gradients, no outline, no shadow.
 */
export default function LBFLogo({ className = 'w-8 h-8', size, ...props }) {
  const sizeStyle = size ? { width: size, height: size } : {}

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`shrink-0 select-none ${className}`}
      style={sizeStyle}
      aria-label="Learn Blazingly Fast Logo"
      role="img"
      {...props}
    >
      <rect width="100" height="100" rx="20" fill="#0b0e14" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="40"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        <tspan fill="#3b82f6">L</tspan>
        <tspan fill="#f59e0b">B</tspan>
        <tspan fill="#ffffff">F</tspan>
      </text>
    </svg>
  )
}
