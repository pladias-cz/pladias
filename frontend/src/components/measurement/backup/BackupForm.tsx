import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";

export default function BackupForm() {
    const { t } = useTranslation();
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!note.trim()) return; // nepovolíme prázdnou poznámku

        setLoading(true);         // blok inputu
        setFlash(null);           // smažeme starou flash zprávu

        try {
            const params = new URLSearchParams({ note });

            // GET request na backend
            const res = await fetch(`/traits/backup?${params.toString()}`, {
                method: "GET"
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            // úspěch
            setFlash(t("backup.started"));
            setNote("");            // vyčistí input
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setFlash(`${t("backup.error")}: ${msg}`);
        } finally {
            setLoading(false);       // odblok inputu
        }
    };

    return (
        <>
            {flash && (
                <Alert variant={flash.includes("Chyba") ? "danger" : "success"}>
                    {flash}
                </Alert>
            )}

            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>
                        {t("backup.note")}
                    </Form.Label>

                    <Form.Control
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("backup.notePlaceholder")}
                        disabled={loading}
                    />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={loading}>
                    {loading
                        ? t("backup.submitting")
                        : t("backup.submit")}
                </Button>
            </Form>
        </>
    );
}
