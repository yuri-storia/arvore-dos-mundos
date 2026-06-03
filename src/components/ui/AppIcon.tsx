import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AppIcon — wrapper padronizado para ícones lucide-react com a identidade visual
 * da Árvore dos Mundos. Garante tamanhos consistentes, traço refinado e variantes
 * de cor/glow (gold premium ou azul místico).
 */

type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AppIconTone =
  | 'gold'           // dourado premium suave (gold-champagne)
  | 'gold-gradient'  // dourado degradê (bronze → champagne)
  | 'blue'           // azul brilhante (blue-light)
  | 'muted'          // texto secundário
  | 'foreground'     // texto principal
  | 'danger';        // vermelho de alerta

type AppIconGlow = 'none' | 'gold' | 'blue';

const SIZE_MAP: Record<AppIconSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const TONE_MAP: Record<AppIconTone, string> = {
  gold: 'text-gold-champagne',
  'gold-gradient': 'text-gold-warm',
  blue: 'text-blue-light',
  muted: 'text-text-secondary',
  foreground: 'text-foreground',
  danger: 'text-red-alert',
};

const GLOW_MAP: Record<AppIconGlow, string> = {
  none: '',
  gold: 'drop-shadow-[0_0_10px_hsl(var(--gold-warm)/0.55)]',
  blue: 'drop-shadow-[0_0_10px_hsl(var(--blue-bright)/0.55)]',
};

export interface AppIconProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'size'> {
  icon: LucideIcon;
  size?: AppIconSize;
  tone?: AppIconTone;
  glow?: AppIconGlow;
  strokeWidth?: number;
  className?: string;
  /** Ícone decorativo (sem semântica). Default: true */
  decorative?: boolean;
  ariaLabel?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  icon: Icon,
  size = 'md',
  tone = 'gold',
  glow = 'none',
  strokeWidth = 1.75,
  className,
  decorative = true,
  ariaLabel,
  ...rest
}) => {
  return (
    <Icon
      strokeWidth={strokeWidth}
      aria-hidden={decorative ? true : undefined}
      aria-label={!decorative ? ariaLabel : undefined}
      className={cn(SIZE_MAP[size], TONE_MAP[tone], GLOW_MAP[glow], 'shrink-0', className)}
      {...rest}
    />
  );
};

/**
 * AppIconBadge — ícone centralizado em um chip circular com a estética premium.
 * Útil para feature cards, headers de seção e CTAs.
 */
export interface AppIconBadgeProps extends AppIconProps {
  variant?: 'gold' | 'blue' | 'subtle';
  badgeSize?: 'sm' | 'md' | 'lg';
}

const BADGE_SIZE: Record<NonNullable<AppIconBadgeProps['badgeSize']>, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
};

const BADGE_VARIANT: Record<NonNullable<AppIconBadgeProps['variant']>, string> = {
  gold:
    'bg-gradient-gold-premium border border-gold-champagne/60 shadow-[0_4px_22px_hsl(var(--gold-bronze)/0.4)]',
  blue:
    'bg-gradient-to-br from-[hsl(var(--blue-main))]/40 to-[hsl(var(--blue-bright))]/15 border border-blue-bright/40 shadow-[0_4px_22px_hsl(var(--blue-bright)/0.3)]',
  subtle:
    'bg-gradient-to-br from-gold-deep/40 to-gold-bronze/15 border border-gold-bronze/40',
};

export const AppIconBadge: React.FC<AppIconBadgeProps> = ({
  variant = 'subtle',
  badgeSize = 'md',
  icon,
  tone,
  className,
  ...rest
}) => {
  const innerTone: AppIconTone =
    tone ?? (variant === 'gold' ? 'foreground' : variant === 'blue' ? 'blue' : 'gold');
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        BADGE_SIZE[badgeSize],
        BADGE_VARIANT[variant],
        className,
      )}
    >
      <AppIcon
        icon={icon}
        tone={innerTone}
        size={badgeSize === 'lg' ? 'lg' : badgeSize === 'sm' ? 'sm' : 'md'}
        className={variant === 'gold' ? 'text-[#1a0f00]' : undefined}
        {...rest}
      />
    </span>
  );
};

export default AppIcon;
