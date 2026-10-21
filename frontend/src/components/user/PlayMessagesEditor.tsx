import {useEffect, useState, type SyntheticEvent} from "react";
import {useTranslation} from "react-i18next";
import {Alert, Button, Form} from "react-bootstrap";
import {useQuery} from "@tanstack/react-query";
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
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // konstanty zvoleného jazyka – bez cache (sekce J), načtení při mountu
    // i po přepnutí jazyka; editovatelné hodnoty zůstávají lokální (jako
    // formulář nastavení v Settings)
    const {data: loadedEntries, isPending: loading, error: loadError} = useQuery({
        queryKey: ["playMessages", language],
        queryFn: () => getPlayMessagesForLanguage(language),
    });

    useEffect(() => {
        if (loadedEntries) {
            setEntries(loadedEntries);
        }
    }, [loadedEntries]);

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        setError(null);
        setSuccess(null);
    };

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
                    onChange={(event) => handleLanguageChange(event.target.value)}
                    className="w-auto"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{t(`user.playMessages.language_${lang}`)}</option>
                    ))}
                </Form.Select>
            </Form.Group>

            {success && <Alert variant="success">{success}</Alert>}
            {loadError && <Alert variant="danger">{apiErrorMessage(loadError, t("user.playMessages.error"))}</Alert>}
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
