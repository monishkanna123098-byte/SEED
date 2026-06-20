import React from 'react'

interface SEEDLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  className?: string
}

export const SEEDLogo: React.FC<SEEDLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const sizeConfig = {
    sm: { logo: 'text-xl', dot: 'text-seed-mint', tagline: 'text-xs' },
    md: { logo: 'text-3xl', dot: 'text-seed-mint', tagline: 'text-sm' },
    lg: { logo: 'text-5xl', dot: 'text-seed-mint', tagline: 'text-base' },
  }

  const cfg = sizeConfig[size]

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`font-extrabold tracking-tight ${cfg.logo} text-seed-navy`}>
        S<span className={cfg.dot}>.</span>E<span className={cfg.dot}>.</span>E
        <span className={cfg.dot}>.</span>D<span className={cfg.dot}>.</span>
      </div>
      {showTagline && (
        <div className={`${cfg.tagline} text-seed-muted font-medium tracking-wide mt-0.5`}>
          Social Emotional Early Detection
        </div>
      )}
    </div>
  )
}
