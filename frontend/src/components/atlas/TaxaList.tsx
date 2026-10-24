/**
 * TaxaList - Taxon Map Settings Component (Read-Only for Users)
 *
 * Displays taxa where the current user is a supervisor.
 * This is a simplified read-only view - only the first column remains interactive.
 */

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {DataTable} from '@/core/dataTable';
import {getPublicationStatuses, getRevisionStatuses} from '@/services/mapAdminApi';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import {useTaxaData} from '@/hooks/useTaxaData';
import {createTaxaColumns} from '@/components/taxaList/columns';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';

export default function TaxaList() {
    const {t} = useTranslation();

    // číselníky statusů – bez cache (sekce J); při selhání zůstane filtr
    // prázdný (stejně jako dřív – chybu jen logoval)
    const revisionStatusOptions = useCatalogQuery(['revisionStatuses'], getRevisionStatuses);
    const publicationStatusOptions = useCatalogQuery(['publicationStatuses'], getPublicationStatuses);

    const {fetchTaxa} = useTaxaData({endpoint: '/api/react/atlasadmin/taxa/user'});

    // sdílená column factory (improvements 2.4) – read-only varianta
    const columns = useMemo(
        () => createTaxaColumns({t, revisionStatusOptions, publicationStatusOptions}),
        [t, revisionStatusOptions, publicationStatusOptions]
    );

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
