/**
 * Model for multi-value edit options
 * Standardized interface for relationship options (herbaria, finders, etc.)
 */
export interface MultiValueOption {
    id: number;
    name: string;
    label?: string;  // Optional alternative display label
}