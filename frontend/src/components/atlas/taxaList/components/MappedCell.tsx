import {Form} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {TaxonMapSettings, TaxonOption} from '../types';
import {ParentMapAutocomplete} from './ParentMapAutocomplete';

interface MappedCellProps {
    row: TaxonMapSettings;
    updatingTaxonId: number | null;
    onIsMappedChange: (row: TaxonMapSettings) => void;
    onParentMapChange: (row: TaxonMapSettings, selected: TaxonOption | null) => void;
}

export function MappedCell({
    row,
    updatingTaxonId,
    onIsMappedChange,
    onParentMapChange
}: MappedCellProps) {
    const {t} = useTranslation();

    const handleParentMapSelect = (selected: TaxonOption | null) => {
        onParentMapChange(row, selected);
    };

    return (
        <div>
            <Form.Check
                type="checkbox"
                checked={row.isMapped}
                disabled={updatingTaxonId === row.taxonId}
                onChange={() => onIsMappedChange(row)}
            />
            <div className="mt-2">
                {row.parentTaxonId ? (
                    <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">
                            {t("atlas.admin.taxaList.partOfMapWith")} {row.parentTaxonNameLat}
                        </small>
                        <button
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={() => onParentMapChange(row, null)}
                            disabled={updatingTaxonId === row.taxonId}
                            title={t("atlas.admin.taxaList.removeParentMap")}
                        >
                            <i className="bi bi-trash"></i>
                        </button>
                    </div>
                ) : (
                    <ParentMapAutocomplete
                        taxonId={row.taxonId}
                        onChange={handleParentMapSelect}
                        updatingTaxonId={updatingTaxonId}
                        placeholder={t("atlas.admin.taxaList.selectParentMap")}
                    />
                )}
            </div>
        </div>
    );
}
