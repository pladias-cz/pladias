/**
 * Building of the query params a server-side table endpoint expects from the current table state
 */

export interface TableParamsOptions {
    page?: number;
    pageSize?: number;
    sorting?: Array<{id: string; desc: boolean}>;
    columnFilters?: Array<{id: string; value: string}>;
    additionalParams?: Record<string, string>;
}

/**
 * Page and page size are optional - omitting them asks the endpoint for all rows matching the
 * rest of the state, which is what the XLSX export relies on.
 */
export function buildTableParams({
    page,
    pageSize,
    sorting,
    columnFilters,
    additionalParams = {},
}: TableParamsOptions): Record<string, string> {
    const params: Record<string, string> = {};

    if (page !== undefined && pageSize !== undefined) {
        params.page = String(page);
        params.pageSize = String(pageSize);
    }

    if (sorting && sorting.length > 0) {
        const [sort] = sorting;
        params.sortBy = sort.id;
        params.sortOrder = sort.desc ? 'desc' : 'asc';
    }

    columnFilters?.forEach(filter => {
        // Empty inputs are not filters, sending them would only widen the query
        if (!filter.value || filter.value.trim() === '') {
            return;
        }
        // Date range columns are filtered by two params, "<column>:from" / "<column>:to", and, for
        // pages that keep one control for the whole range, by a single "<column>" value "from|to"
        const fromTo = filter.id.endsWith(':from') || filter.id.endsWith(':to')
            ? filter.id
            : (filter.value.includes('|') ? null : filter.id);
        if (fromTo === null) {
            const [from, to] = filter.value.split('|');
            addFilter(params, `${filter.id}:from`, from);
            addFilter(params, `${filter.id}:to`, to);
            return;
        }
        addFilter(params, fromTo, filter.value);
    });

    return {...params, ...additionalParams};
}

function addFilter(params: Record<string, string>, columnId: string, value: string) {
    if (!value || value.trim() === '') {
        return;
    }
    params[`${columnId.charAt(0).toUpperCase() + columnId.slice(1)}Filter`] = value;
}
