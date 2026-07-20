/**
 * Pagination controls component for DataTable
 */

import {Form, Pagination} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {getVisiblePages} from '../utils';

interface DataTablePaginationProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    filteredCount: number;
    hasActiveFilters: boolean;
    pageSizeOptions: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function DataTablePagination(props: DataTablePaginationProps) {
    const {
        page,
        pageSize,
        totalPages,
        pageSizeOptions,
        onPageChange,
        onPageSizeChange,
    } = props;

    const {t} = useTranslation();

    // Always show pagination (even for single page)
    // if (totalPages <= 1) return null;

    const handleFirstPage = () => onPageChange(1);
    const handlePrevPage = () => onPageChange(page - 1);
    const handleNextPage = () => onPageChange(page + 1);
    const handleLastPage = () => onPageChange(totalPages);

    const visiblePages = getVisiblePages(page, totalPages);

    const renderPageItems = () => {
        return visiblePages.map((p, index) => {
            if (p === 'ellipsis') {
                return <Pagination.Ellipsis key={`ellipsis-${index}`} />;
            }
            return (
                <Pagination.Item
                    key={p}
                    active={p === page}
                    onClick={() => onPageChange(p)}
                >
                    {p}
                </Pagination.Item>
            );
        });
    };

    return (
        <div className="d-flex justify-content-between align-items-center">
            <div>
                <Form.Group controlId="pageSize" className="d-inline-block me-3">
                    <Form.Label className="me-2">{t("common.table.rowsPerPage")}:</Form.Label>
                    <Form.Select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        style={{width: 'auto', display: 'inline-block'}}
                    >
                        {pageSizeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </div>

            <Pagination>
                <Pagination.First
                    onClick={handleFirstPage}
                    disabled={page === 1}
                />
                <Pagination.Prev
                    onClick={handlePrevPage}
                    disabled={page === 1}
                />

                {renderPageItems()}

                <Pagination.Next
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                />
                <Pagination.Last
                    onClick={handleLastPage}
                    disabled={page === totalPages}
                />
            </Pagination>
        </div>
    );
}