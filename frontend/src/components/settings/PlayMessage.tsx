import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import RichTextMessage from '@/components/RichTextMessage';
import {getPlayMessage} from '@/services/playMessageApi';
import {logError} from '@/services/logger';

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
export default function PlayMessage({messageKey, fallback = '', className = '', children}: PlayMessageProps) {
    const {i18n} = useTranslation();
    // Get current language from i18n context and send it as query parameter
    const lang = i18n.language || 'cs';

    // text klíče v aktuálním jazyce – bez cache (sekce J); služba vrací `null`
    // pro chybějící klíč (použije se fallback)
    const {data, isPending, error} = useQuery({
        queryKey: ['playMessage', messageKey, lang],
        queryFn: () => getPlayMessage(messageKey, lang),
        enabled: !!messageKey,
    });

    if (!messageKey) {
        return children || <span>{fallback}</span>;
    }

    if (isPending) {
        return <span>Loading...</span>;
    }

    if (error) {
        logError(error, {source: 'PlayMessage', messageKey});
        return children || <span>{fallback}</span>;
    }

    // `null` = klíč v daném jazyce neexistuje – fallback text
    const content = data ?? fallback;

    if (!content) {
        return children || null;
    }

    return (
        <RichTextMessage className={className} html={content}/>
    );
}
