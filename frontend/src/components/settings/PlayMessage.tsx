import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import RichTextMessage from "@/components/RichTextMessage";
import {getPlayMessage} from "@/services/playMessageApi";

interface PlayMessageProps {
    messageKey: string;
    fallback?: string;
    className?: string;
    children?: React.ReactNode;
}

/**
 * PlayMessage component - fetches and renders a message by key according to the current language.
 *
 * Usage: <PlayMessage messageKey="login_page_texts" />
 *
 * The component fetches the message from the backend API and renders it as raw HTML.
 *
 * Note: Use `messageKey` prop instead of `key`, as `key` is reserved by React.
 *
 * @param {string} messageKey - The key of the message to fetch (e.g., "login_page_texts")
 * @param {string} fallback - Optional fallback text to display if the message is not found
 * @param {string} className - Optional CSS class name for styling
 * @param {React.ReactNode} children - Optional children to render if no message is found
 */
export default function PlayMessage({ messageKey, fallback = "", className = "", children }: PlayMessageProps) {
    const { i18n } = useTranslation();
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!messageKey) {
            setLoading(false);
            setError("messageKey prop is required");
            return;
        }

        // Get current language from i18n context and send it as query parameter
        const lang = i18n.language || "cs";
        getPlayMessage(messageKey, lang)
            .then((value) => {
                // `null` = klíč v daném jazyce neexistuje – fallback text
                setContent(value ?? fallback);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load PlayMessage:", err);
                setError(err instanceof Error ? err.message : String(err));
                setLoading(false);
            });
    }, [messageKey, fallback, i18n.language]);

    if (loading) {
        return <span>Loading...</span>;
    }

    if (error && !content) {
        return children || <span>{fallback}</span>;
    }

    if (!content) {
        return children || null;
    }

    return (
        <RichTextMessage className={className} html={content}/>
    );
}
