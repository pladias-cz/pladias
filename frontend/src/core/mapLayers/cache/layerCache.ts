/**
 * Layer Cache
 * 
 * Simple LRU-style cache for runtime Leaflet layers.
 * Prevents recreating the same WMS/WFS layer when users switch between maps.
 * 
 * Cache key format: layerId:param1:value1:param2:value2:...
 * Example: occurrences:123:2025
 */

import type { Layer } from 'leaflet';

/**
 * Cache entry with metadata
 */
interface CacheEntry {
    layer: Layer;
    timestamp: number;
    accessCount: number;
}

/**
 * Simple in-memory layer cache
 * Uses a Map for O(1) lookups
 */
export class LayerCache {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    
    constructor(maxSize: number = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    /**
     * Get a layer from the cache
     * @param key - The cache key
     * @returns The cached layer or undefined
     */
    get(key: string): Layer | undefined {
        const entry = this.cache.get(key);
        
        if (entry) {
            // Update access statistics
            entry.accessCount++;
            entry.timestamp = Date.now();
            
            return entry.layer;
        }
        
        return undefined;
    }
    
    /**
     * Store a layer in the cache
     * @param key - The cache key
     * @param layer - The Leaflet layer to cache
     */
    set(key: string, layer: Layer): void {
        // If cache is full and we're adding something new, remove oldest
        if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        this.cache.set(key, {
            layer,
            timestamp: Date.now(),
            accessCount: 1,
        });
    }
    
    /**
     * Check if a key exists in the cache
     * @param key - The cache key
     * @returns True if the key exists
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }
    
    /**
     * Remove a specific layer from the cache
     * @param key - The cache key to remove
     * @returns True if the layer was removed
     */
    remove(key: string): boolean {
        return this.cache.delete(key);
    }
    
    /**
     * Clear all cached layers
     * Also removes the layers from the map to prevent memory leaks
     */
    clear(): void {
        this.cache.clear();
    }
    
    /**
     * Get cache statistics
     * @returns Object with cache metrics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    } {
        const totalAccesses = Array.from(this.cache.values())
            .reduce((sum, entry) => sum + entry.accessCount, 0);
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: totalAccesses > 0 
                ? totalAccesses / (totalAccesses + this.cache.size) 
                : 0,
        };
    }
    
    /**
     * Evict the least recently used entry
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Remove expired layers (not accessed in the last hour)
     */
    cleanup(): void {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oneHourAgo && entry.accessCount < 2) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance for the application
export const layerCache = new LayerCache(50);
