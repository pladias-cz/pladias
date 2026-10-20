import {useEffect, useState, type SyntheticEvent} from "react";
import {useTranslation} from "react-i18next";
import {Alert, Button, Form} from "react-bootstrap";
import {getPlayMessagesForLanguage, savePlayMessages, type PlayMessageEntry} from "@/services/playMessageApi";
import {apiErrorMessage} from "@/services/apiClient";

const LANGUAGES = ["cs", "en", "sk", "pl"] as const;

/**
 * PlayMessagesEditor - sysAdmin editor of PlayMessage constant values for one language.
 * Shows a textarea per constant (from models.PlayMessage *_KEY fields) and a single
 * submit button common to all fields. Missing language variants save as new rows.
 */
export default function PlayMessagesEditor() {
    const {t} = useTranslation();
    const [language, setLanguage] = useState<string>("cs");
    const [entries, setEntries] = useState<PlayMessageEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSuccess(null);

        getPlayMessagesForLanguage(language)
            .then((loaded) => {
                if (cancelled) {
                    return;
                }
                setEntries(loaded);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(apiErrorMessage(err, t("user.playMessages.error")));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [language, t]);

    const handleChange = (key: string, value: string) => {
        setEntries((prev) => prev.map((entry) => (entry.key === key ? {...entry, value} : entry)));
    };

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await savePlayMessages(language, entries.map((entry) => ({key: entry.key, value: entry.value ?? ""})));

            setSuccess(t("user.playMessages.success"));
        } catch (err) {
            setError(apiErrorMessage(err, t("user.playMessages.error")));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p>{t("user.playMessages.loading")}</p>;
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="playMessagesLanguage">
                <Form.Label>{t("user.playMessages.language")}</Form.Label>
                <Form.Select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-auto"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{t(`user.playMessages.language_${lang}`)}</option>
                    ))}
                </Form.Select>
            </Form.Group>

            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            {entries.map((entry) => (
                <Form.Group key={entry.key} className="mb-3" controlId={`playMessage_${entry.key}`}>
                    <Form.Label>{entry.key}</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={entry.value ?? ""}
                        onChange={(event) => handleChange(entry.key, event.target.value)}
                    />
                </Form.Group>
            ))}

            <Button type="submit" variant="primary" disabled={saving}>
                {saving ? t("user.playMessages.submitting") : t("user.playMessages.submit")}
            </Button>
        </Form>
    );
}
