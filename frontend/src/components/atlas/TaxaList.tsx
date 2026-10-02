/**
 * TaxaList - Taxon Map Settings Component (Read-Only for Users)
 * 
 * Displays taxa where the current user is a supervisor.
 * This is a simplified read-only view - only the first column remains interactive.
 */

import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DataTable, type DataTableColumnDef, createTextColumn, createBooleanColumn} from '@/core/dataTable';
import {useTaxaData} from './taxaList/hooks';
import type {TaxonMapSettings, StatusOption} from './taxaList/types';

export default function TaxaList() {
    const {t} = useTranslation();
    const [revisionStatusOptions, setRevisionStatusOptions] = useState<StatusOption[]>([]);
    const [publicationStatusOptions, setPublicationStatusOptions] = useState<StatusOption[]>([]);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            fetch('/api/react/atlasadmin/revision-statuses').then(res => res.json()),
            fetch('/api/react/atlasadmin/publication-statuses').then(res => res.json()),
        ]).then(([revisionData, publicationData]) => {
            if (cancelled) return;
            if (revisionData.success) setRevisionStatusOptions(revisionData.data || []);
            if (publicationData.success) setPublicationStatusOptions(publicationData.data || []);
        }).catch(error => console.error('Error fetching status options:', error));

        return () => { cancelled = true; };
    }, []);

    const {fetchTaxa} = useTaxaData({
        onSuccess: () => {
            // Optional: handle successful data fetch
        }
    });

    const columns = useMemo<DataTableColumnDef<TaxonMapSettings>[]>(() => [
        // First column - keep as is with link to map
        createTextColumn<TaxonMapSettings>('taxonNameLat', t("atlas.admin.taxaList.latinName"), {
            enableSorting: false,
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterLatinName"),
            cellRenderer: (_value, row) => (
                <>
                    <i>
                        <a href={`/atlas/map?taxonId=${row.taxonId}`}>
                            <i>{row.taxonNameLat}</i>
                        </a>
                    </i>
                    {row.taxonRankCz && (
                        <small className="text-muted"> ({row.taxonRankCz})</small>
                    )}
                </>
            ),
        }),
        // Remaining columns - simple read-only text values
        // Use backend field names for proper filtering/sorting
        createBooleanColumn<TaxonMapSettings>('isMapped', t("atlas.admin.taxaList.mapped"), {
            enableSorting: false,
            enableFiltering: true,
            trueLabel: t("common.yes"),
            falseLabel: t("common.no"),
        }),
        createTextColumn<TaxonMapSettings>('commonThreshold', t("atlas.admin.taxaList.commonThreshold"), {
            enableSorting: false,
            enableFiltering: true,
            cellRenderer: (value) => value?.toString() ?? '-',
        }),
        createBooleanColumn<TaxonMapSettings>('isProtected', t("atlas.admin.taxaList.protected"), {
            enableSorting: false,
            enableFiltering: false,
            trueLabel: t("common.yes"),
            falseLabel: t("common.no"),
        }),
        createTextColumn<TaxonMapSettings>('revisors', t("atlas.admin.taxaList.revisors"), {
            enableSorting: false,
            enableFiltering: false,
            filterPlaceholder: t("atlas.admin.taxaList.filterRevisors"),
            cellRenderer: (value) => value || '-',
        }),
        // Use ID field for filtering/sorting, display description with ID
        createTextColumn<TaxonMapSettings>('revisionStatusId', t("atlas.admin.taxaList.revisionStatus"), {
            enableSorting: false,
            enableFiltering: true,
            filterOptions: revisionStatusOptions.map(o => ({value: String(o.id), label: `${o.description} [${o.id}]`})),
            cellRenderer: (_value, row) => {
                const desc = row.revisionStatusDescription || '-';
                const id = row.revisionStatusId;
                return desc !== '-' ? `${desc}[${id}]` : desc;
            },
        }),
        createTextColumn<TaxonMapSettings>('publicationStatusId', t("atlas.admin.taxaList.publicationStatus"), {
            enableSorting: false,
            enableFiltering: true,
            filterOptions: publicationStatusOptions.map(o => ({value: String(o.id), label: `${o.description} [${o.id}]`})),
            cellRenderer: (_value, row) => {
                const desc = row.publicationStatusDescription || '-';
                const id = row.publicationStatusId;
                return desc !== '-' ? `${desc}[${id}]` : desc;
            },
        }),
    ], [t, revisionStatusOptions, publicationStatusOptions]);

    return (
        <div className="container-fluid">
            <DataTable<TaxonMapSettings>
                endpoint="/api/react/atlasadmin/taxa/user"
                columns={columns}
                fetchData={fetchTaxa}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}
