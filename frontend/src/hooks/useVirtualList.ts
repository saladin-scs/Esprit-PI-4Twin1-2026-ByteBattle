/**
 * Virtualization (windowing) hook: computes visible item window
 * and offset for the scrollable container.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface UseVirtualListOptions {
  /** Total number of items */
  itemCount: number;
  /** Estimated height per item (px) */
  itemHeight: number;
  /** Visible viewport height (px) */
  containerHeight: number;
  /** Number of items to render above/below viewport (overscan) */
  overscan?: number;
}

export interface VirtualItem {
  index: number;
  offsetY: number;
  height: number;
}

export interface UseVirtualListReturn {
  /** Start and end indices (inclusive) to render */
  startIndex: number;
  endIndex: number;
  /** List of virtual items to map (index, offsetY, height) */
  virtualItems: VirtualItem[];
  /** Total content height (for inner container) */
  totalHeight: number;
  /** Attach to scrollable container to update on scroll */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  /** Container ref to measure height when needed */
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
