export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#3a5cd9" />
      <path d="M22 16 H38 L48 26 V42 Q48 48 42 48 H22 Q16 48 16 42 V22 Q16 16 22 16 Z" fill="#ffffff" />
      <path d="M24 33 L29.5 38.5 L40 27" fill="none" stroke="#19916c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
