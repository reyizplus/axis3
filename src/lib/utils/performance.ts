/**
 * Performance Utilities
 * Axis3 - Forced Reflow Prevention
 * 
 * Bu utility'ler layout thrashing'i önlemek için kullanılır.
 * DOM okuma ve yazma işlemlerini batch'ler.
 */

/**
 * requestAnimationFrame wrapper - Forced reflow'u önler
 */
export function batchDOMReads(callback: () => void): void {
  requestAnimationFrame(callback);
}

/**
 * DOM yazma işlemlerini batch'le
 */
export function batchDOMWrites(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

/**
 * Layout thrashing'i önleyen DOM ölçüm utility'si
 * Önce tüm okumaları yap, sonra tüm yazmaları yap
 */
export class DOMBatcher {
  private readQueue: Array<() => void> = [];
  private writeQueue: Array<() => void> = [];
  private scheduled = false;

  /**
   * DOM okuma işlemi ekle
   */
  read(callback: () => void): void {
    this.readQueue.push(callback);
    this.schedule();
  }

  /**
   * DOM yazma işlemi ekle
   */
  write(callback: () => void): void {
    this.writeQueue.push(callback);
    this.schedule();
  }

  /**
   * Batch işlemini planla
   */
  private schedule(): void {
    if (this.scheduled) return;
    
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  /**
   * Queue'ları işle
   */
  private flush(): void {
    // Önce tüm okumaları yap
    while (this.readQueue.length > 0) {
      const read = this.readQueue.shift();
      read?.();
    }

    // Sonra tüm yazmaları yap
    while (this.writeQueue.length > 0) {
      const write = this.writeQueue.shift();
      write?.();
    }

    this.scheduled = false;
  }
}

/**
 * Global DOM batcher instance
 */
export const domBatcher = new DOMBatcher();

/**
 * ResizeObserver wrapper - Debounced
 */
export function createDebouncedResizeObserver(
  callback: (entries: ResizeObserverEntry[]) => void,
  delay = 16 // ~60fps
): ResizeObserver {
  let timeoutId: NodeJS.Timeout;

  return new ResizeObserver((entries) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        callback(entries);
      });
    }, delay);
  });
}

/**
 * Scroll event handler - Throttled
 */
export function createThrottledScrollHandler(
  callback: (event: Event) => void,
  delay = 16 // ~60fps
): (event: Event) => void {
  let lastCall = 0;
  let rafId: number | null = null;

  return (event: Event) => {
    const now = Date.now();
    
    if (now - lastCall < delay) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => callback(event));
      return;
    }

    lastCall = now;
    callback(event);
  };
}

/**
 * Element dimensions'ı cache'le - Forced reflow'u önle
 */
export class DimensionCache {
  private cache = new WeakMap<Element, DOMRect>();

  get(element: Element): DOMRect {
    let rect = this.cache.get(element);
    
    if (!rect) {
      rect = element.getBoundingClientRect();
      this.cache.set(element, rect);
    }
    
    return rect;
  }

  invalidate(element: Element): void {
    this.cache.delete(element);
  }

  clear(): void {
    this.cache = new WeakMap();
  }
}

/**
 * Global dimension cache
 */
export const dimensionCache = new DimensionCache();
