/**
 * Mobile Performance Optimization Utility
 * Provides dynamic script and style loading for better performance
 */

/**
 * Lazy load scripts when needed
 */
export const lazyLoadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.getElementById(id)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
};

/**
 * Preload critical resources
 */
export const preloadResource = (href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
};

/**
 * Prefetch resources for next navigation
 */
export const prefetchResource = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
};

/**
 * Check if device is low-end (for adaptive performance)
 */
export const isLowEndDevice = (): boolean => {
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;

    // Check device memory (if available)
    const memory = (navigator as any).deviceMemory || 4;

    // Low-end if <= 2 cores OR <= 2GB RAM
    return cores <= 2 || memory <= 2;
};

/**
 * Defer non-critical CSS
 */
export const deferCSS = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
        link.media = 'all';
    };
    document.head.appendChild(link);
};

/**
 * Get optimized image quality based on connection
 */
export const getOptimizedImageQuality = (): number => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (!connection) return 75; // Default quality

    const effectiveType = connection.effectiveType;

    switch (effectiveType) {
        case 'slow-2g':
        case '2g':
            return 50;
        case '3g':
            return 65;
        case '4g':
            return 85;
        default:
            return 75;
    }
};

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (cb: IdleRequestCallback) => setTimeout(cb, 1);

export const cancelIdleCallback =
    typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? window.cancelIdleCallback
        : (id: number) => clearTimeout(id);
