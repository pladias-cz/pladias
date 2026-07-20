/**
 * Pagination utility functions
 */

/**
 * Calculate the visible page range for pagination controls
 * Shows first 2 pages, last 2 pages, and a window around current page
 */
export function getVisiblePages(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
): Array<number | 'ellipsis'> {
    if (totalPages <= maxVisible + 2) {
        // Show all pages if total is small enough
        return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const pages: Set<number> = new Set();
    
    // Always show first two pages
    pages.add(1);
    pages.add(2);

    // Calculate window around current page
    const halfWindow = Math.floor(maxVisible / 2);
    let startPage = Math.max(3, currentPage - halfWindow);
    let endPage = currentPage + halfWindow;

    // Adjust window size if near edges
    if (currentPage <= halfWindow + 1) {
        endPage = maxVisible;
    } else if (currentPage >= totalPages - halfWindow) {
        startPage = totalPages - maxVisible + 1;
    }

    // Clamp to valid range
    startPage = Math.max(3, startPage);
    endPage = Math.min(totalPages - 2, endPage);

    // Add pages in window
    for (let i = startPage; i <= endPage; i++) {
        pages.add(i);
    }

    // Always show last two pages
    pages.add(totalPages - 1);
    pages.add(totalPages);

    // Convert to sorted array
    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    // Add ellipsis where needed
    const result: Array<number | 'ellipsis'> = [];
    for (let i = 0; i < sortedPages.length; i++) {
        const current = sortedPages[i];
        const prev = i > 0 ? sortedPages[i - 1] : null;
        
        if (prev !== null && typeof prev === 'number' && current - prev > 1) {
            result.push('ellipsis');
        }
        result.push(current);
    }

    return result;
}

/**
 * Calculate total pages from count and page size
 */
export function calculateTotalPages(totalCount: number, pageSize: number): number {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
}

/**
 * Validate and clamp page number to valid range
 */
export function clampPage(page: number, totalPages: number): number {
    if (page < 1) return 1;
    if (page > totalPages) return totalPages;
    return page;
}