interface LogoProps {
  size?: number
  className?: string
}

export function LogoCloudPanel({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#1a1a2e" />
      <path d="M8 20c0-3.3 2.7-6 6-6 .4 0 .8 0 1.2.1C16 12.4 17.9 11 20 11c3.3 0 6 2.7 6 6v.5c1.2.5 2 1.7 2 3 0 1.9-1.6 3.5-3.5 3.5H9c-1.7 0-3-1.3-3-3 0-1.4.9-2.5 2-3z" fill="#4f8ef7" />
      <rect x="13" y="19" width="6" height="1.5" rx=".75" fill="white" opacity=".9" />
      <rect x="13" y="21.5" width="4" height="1.5" rx=".75" fill="white" opacity=".6" />
    </svg>
  )
}

export function LogoNginx({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#009639" />
      <path d="M7 23V9l9 11.5V9h9v14l-9-11.5V23H7z" fill="white" />
    </svg>
  )
}

export function LogoApache({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#D22128" />
      <path d="M16 6L7 26h3.5l1.8-4.5h7.4L21.5 26H25L16 6zm0 6l2.5 6.5h-5L16 12z" fill="white" />
    </svg>
  )
}

export function LogoGCE({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#fff" />
      {/* Google colors — simplified compute engine mark */}
      <rect x="11" y="11" width="10" height="10" rx="1" fill="#4285F4" />
      <rect x="13" y="13" width="6" height="6" rx=".5" fill="white" />
      <rect x="14.5" y="14.5" width="3" height="3" fill="#4285F4" />
      {/* connector ticks */}
      <rect x="6" y="14.5" width="4" height="3" rx="1" fill="#34A853" />
      <rect x="22" y="14.5" width="4" height="3" rx="1" fill="#FBBC05" />
      <rect x="14.5" y="6" width="3" height="4" rx="1" fill="#EA4335" />
      <rect x="14.5" y="22" width="3" height="4" rx="1" fill="#4285F4" />
    </svg>
  )
}

export function LogoAWS({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#232F3E" />
      {/* Simplified AWS smile arrow */}
      <path d="M10 17.5c1.5 2 3.5 3.2 6 3.2s4.5-1.2 6-3.2" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20.5 16.5l2 1.5-1.5 1.5" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="7" y="14" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="bold" fill="white" letterSpacing=".5">AWS</text>
    </svg>
  )
}

export function LogoDocker({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#2496ED" />
      {/* Docker whale simplified: stacked containers + water */}
      <rect x="7"  y="13" width="4" height="3" rx=".5" fill="white" />
      <rect x="12" y="13" width="4" height="3" rx=".5" fill="white" />
      <rect x="17" y="13" width="4" height="3" rx=".5" fill="white" />
      <rect x="12" y="9"  width="4" height="3" rx=".5" fill="white" />
      <rect x="17" y="9"  width="4" height="3" rx=".5" fill="white" />
      <path d="M5 19c1.5-1 3 .5 4.5 0s3-1 4.5 0 3 .5 4.5 0 3-1 4.5 0 3 .5 4.5 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M24 14c.8-.8 2-.6 2.5.5.5 1-.2 2-1.5 2h-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export const SERVER_TYPE_LOGO: Record<string, (props: LogoProps) => JSX.Element> = {
  cloudpanel: LogoCloudPanel,
  nginx:      LogoNginx,
  apache:     LogoApache,
  gce:        LogoGCE,
  aws:        LogoAWS,
  docker:     LogoDocker,
}
