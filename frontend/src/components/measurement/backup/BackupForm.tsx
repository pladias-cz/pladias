import {useState, type FormEvent} from "react";
import {Button, Form, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {useNotifications} from "@/stores/notificationStore";

export default function BackupForm() {
    const {t} = useTranslation();
    const {push} = useNotifications();

    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSubmitting(true);

        try {
            const res = await fetch("/api/react/measurement/backup", {
                method: "POST",
                body: new URLSearchParams({description})
            });

            // backend vrací plain text hlášení, ne JsonResult
            const message = (await res.text()).trim();

            if (!res.ok) {
                push({type: "danger", message: message || t("trait.backup.error")});
                return;
            }

            push({type: "success", message: message || t("trait.backup.started")});
            setDescription("");
        } catch {
            push({type: "danger", message: t("trait.backup.error")});
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="backupDescription">
                    <Form.Label>{t("trait.backup.note")}</Form.Label>
                    <Form.Control
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("trait.backup.notePlaceholder")}
                        disabled={submitting}
                        required
                    />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? (
                        <>
                            <Spinner as="span" size="sm" animation="border" className="me-2"/>
                            {t("trait.backup.submitting")}
                        </>
                    ) : (
                        t("trait.backup.submit")
                    )}
                </Button>
            </Form>
    );
}
