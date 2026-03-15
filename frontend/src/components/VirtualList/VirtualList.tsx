/**
 * Virtualisation avec windowing: ne rend que les éléments visibles + overscan.
 */
import { useVirtualList } from '../../hooks/useVirtualList';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optionnel: key extractor */
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 3,
  renderItem,
  getItemKey,
}: VirtualListProps<T>) {
  const {
    virtualItems,
    totalHeight,
    onScroll,
    containerRef,
  } = useVirtualList({
    itemCount: items.length,
    itemHeight,
    containerHeight: height,
    overscan,
  });

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="overflow-auto"
      style={{ height: `${height}px` }}
      onScroll={onScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {virtualItems.map(({ index, offsetY, height: itemH }) => {
          const item = items[index];
          const key = getItemKey ? getItemKey(item, index) : index;
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${offsetY}px)`,
                height: `${itemH}px`,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
