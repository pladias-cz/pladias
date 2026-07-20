import {useMemo} from "react";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import type {BibliographyDto} from "@/models/Bibliography.ts";
import {Card} from "react-bootstrap";
import {DataTable} from "@/core/dataTable";
import {
    createTextColumn,
    createBooleanColumn,
    createNumberColumn,
} from "@/core/dataTable";

export default function Bibliography() {
    const {t} = useTranslation();
    usePageTitle(t("bibliography.title"));

    // Column definitions with filtering enabled
    const columns = useMemo(() => [
        createTextColumn<BibliographyDto>('authors', t("bibliography.authors"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createNumberColumn<BibliographyDto>('year', t("bibliography.year"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<BibliographyDto>('title', t("bibliography.title"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<BibliographyDto>('journal', t("bibliography.journal"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<BibliographyDto>('etc', t("bibliography.etc"), {
            enableSorting: false,
            enableFiltering: true,
        }),
        createBooleanColumn<BibliographyDto>('excerpted', t("bibliography.excerpted"), {
            enableSorting: true,
            enableFiltering: true,
        }),
    ], [t]);

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="offset-2 col-8"><p>{t("bibliography.description")}</p></div>
            </div>
            <div className="row">
            <Card>
                <Card.Body>
                    <DataTable<BibliographyDto>
                        endpoint="/api/react/bibliography/searchReact"
                        columns={columns}
                    />
                </Card.Body>
            </Card>
            </div>
        </div>
    );
}
