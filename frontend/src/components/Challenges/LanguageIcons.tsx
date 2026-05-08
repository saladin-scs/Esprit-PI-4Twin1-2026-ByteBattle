/**
 * Language logos via Simple Icons – official brand SVGs and colors.
 * Uses @icons-pack/react-simple-icons for pro, recognizable icons.
 */
import {
  SiJavascript,
  SiPython,
  SiCplusplus,
  SiOpenjdk,
} from '@icons-pack/react-simple-icons';

/** Brand colors (Simple Icons / official) for consistent pro look */
const BRAND_COLORS: Record<string, string> = {
  javascript: '#F7DF1E',
  python: '#3776AB',
  java: '#ED8B00',
  cpp: '#00599C',
};

const ICONS: Record<string, { Icon: typeof SiJavascript }> = {
  javascript: { Icon: SiJavascript },
  python: { Icon: SiPython },
  java: { Icon: SiOpenjdk },
  cpp: { Icon: SiCplusplus },
};

interface LanguageIconProps {
  lang: string;
  size?: number;
  /** Use brand color (default) or inherit currentColor */
  useBrandColor?: boolean;
  className?: string;
}

export function LanguageIcon({
  lang,
  size = 40,
  useBrandColor = true,
  className = '',
}: LanguageIconProps) {
  const key = (lang || '').toLowerCase().replace('c++', 'cpp');
  const entry = ICONS[key];

  if (!entry) {
    return (
      <span
        className={`flex items-center justify-center font-bold font-mono text-[0.55em] text-current ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {(lang || '?').slice(0, 2).toUpperCase()}
      </span>
    );
  }

  const { Icon } = entry;
  const color = useBrandColor ? (BRAND_COLORS[key] ?? 'currentColor') : 'currentColor';
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={size} color={color} style={{ display: 'block' }} />
    </span>
  );
}
