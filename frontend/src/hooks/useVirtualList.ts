/**
 * Hook pour virtualisation (windowing): calcule la fenêtre d'éléments visibles
 * et le décalage pour le conteneur scrollable.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface UseVirtualListOptions {
  /** Nombre total d'éléments */
  itemCount: number;
  /** Hauteur estimée par élément (px) */
  itemHeight: number;
  /** Hauteur visible du viewport (px) */
  containerHeight: number;
  /** Nombre d'éléments à rendre au-dessus/en-dessous de la fenêtre (overscan) */
  overscan?: number;
}

export interface VirtualItem {
  index: number;
  offsetY: number;
  height: number;
}

export interface UseVirtualListReturn {
  /** Indices de début et fin (inclus) à rendre */
  startIndex: number;
  endIndex: number;
  /** Liste des items virtuels à mapper (index, offsetY, height) */
  virtualItems: VirtualItem[];
  /** Hauteur totale du contenu (pour le conteneur interne) */
  totalHeight: number;
  /** À attacher au conteneur scrollable pour mettre à jour au scroll */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  /** Ref du conteneur pour mesurer la hauteur si besoin */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const {
    itemCount,
    itemHeight,
    containerHeight,
    overscan = 3,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  const totalHeight = itemCount * itemHeight;

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(itemCount - 1, start + visibleCount + overscan * 2);
    const startIndex = Math.max(0, start);
    const endIndex = Math.min(itemCount - 1, end);

    const virtualItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        offsetY: i * itemHeight,
        height: itemHeight,
      });
    }

    return { startIndex, endIndex, virtualItems };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  return {
    startIndex,
    endIndex,
    virtualItems,
    totalHeight,
    onScroll,
    containerRef,
  };
}
