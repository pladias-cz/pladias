import {useEffect, useState} from "react";
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {PladiasRecordsTable} from "@/components/atlas/mapDetail/PladiasRecordsTable";
import type {RecordPladias} from "@/models";

export default function NewComments() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.newComments.title"));

    const [records, setRecords] = useState<RecordPladias[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadRecords = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/react/atlas/search/records-with-comments");
                const payload = await response.json();

                if (!response.ok || payload?.success === false) {
                    throw new Error(payload?.error || t("atlas.newComments.loadFailed"));
                }

                const nextRecords = Array.isArray(payload?.data?.records) ? payload.data.records : [];
                setRecords(nextRecords);
            } catch (err) {
                setError(err instanceof Error ? err.message : t("atlas.newComments.loadFailed"));
                setRecords([]);
            } finally {
                setIsLoading(false);
            }
        };

        void loadRecords();
    }, [t]);

    return (
        <Row className="g-3">
            <div className="d-flex justify-content-between align-items-center">
                <h3 className="mb-0">{t("atlas.newComments.title")}</h3>
                {isLoading && <span className="text-muted">{t("common.loading")}</span>}
            </div>

            {error && <div className="text-danger">{error}</div>}

            {!isLoading && !error && records.length === 0 && (
                <div className="text-muted">{t("atlas.newComments.noRecords")}</div>
            )}

            {records.length > 0 && <PladiasRecordsTable records={records} showTaxonName={true} />}
        </Row>
    );
}