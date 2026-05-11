import type { ImgHTMLAttributes } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SRC_LIGHT = '/bytebattle-logo.png';
const SRC_DARK = '/bytebattle-logo-dark.png';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  alt?: string;
};

export function ByteBattleLogo({ className, style, alt = 'Byte Battle', ...rest }: Props) {
  const { theme } = useTheme();
  const src = theme === 'dark' ? SRC_DARK : SRC_LIGHT;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ transform: 'rotate(-10deg)', ...style }}
      {...rest}
    />
  );
}
