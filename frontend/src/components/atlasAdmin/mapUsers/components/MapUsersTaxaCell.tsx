/**
 * Taxa cell renderer for MapUsers table
 */

import {Badge, Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {MapUserTableRow} from '../types';

interface MapUsersTaxaCellProps {
    row: MapUserTableRow;
    onAddTaxon: (userId: number) => void;
    onRemoveTaxon: (userId: number, taxonId: number) => void;
}

export function MapUsersTaxaCell({row, onAddTaxon, onRemoveTaxon}: MapUsersTaxaCellProps) {
    const {t} = useTranslation();

    return (
        <div className="d-flex flex-wrap align-items-center gap-1">
            {row.supervisedTaxa?.map((taxon) => (
                <Badge 
                    key={taxon.id} 
                    bg="secondary" 
                    className="d-inline-flex align-items-center gap-1"
                >
                    <span>{taxon.nameLat}</span>
                    <span 
                        style={{cursor: 'pointer'}}
                        onClick={() => onRemoveTaxon(row.id, taxon.id)}
                        title={t("user.usersAdministration.removeTaxon")}
                    >
                        &times;
                    </span>
                </Badge>
            ))}
            <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => onAddTaxon(row.id)}
                className="py-0 px-1 d-inline-flex align-items-center justify-content-center"
                style={{lineHeight: 1, minHeight: '1.5em'}}
                aria-label={t("user.usersAdministration.addTaxon")}
            >
                +
            </Button>
        </div>
    );
}
