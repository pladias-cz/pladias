/**
 * Jediné místo aplikace pro vykreslení HTML obsahu z backendu: taxon jména
 * (kurzíva), popisy vlastností, hlášky importů s odkazy na
 * sešity s chybami, play messages. Obsah je důvěryhodný (generuje backend, ne
 * uživatel), proto se záměrně nepoužívá sanitizér – viz docs/gotchas.md.
 *
 * Nikdy sem neposílat řetězce složené z uživatelského vstupu. Jediné výjimky
 * mimo tuto komponentu jsou mapové popup šablony (OpenLayers Popup HTML).
 */

export type RichTextElement = 'span' | 'div' | 'p';

interface RichTextMessageProps {
    /** HTML z backendu – důvěryhodné, viz komentář výše; null/undefined → prázdné. */
    html: string | null | undefined;
    /** Obalující element dle místa použití (výchoze span – inline text). */
    as?: RichTextElement;
    className?: string;
    /** Nativní hover title – např. ID taxonu u jeho jména v mapových hlavičkách. */
    title?: string;
}

function RichTextMessage({html, as = 'span', className, title}: RichTextMessageProps) {
    const Tag = as;
    return <Tag className={className} title={title} dangerouslySetInnerHTML={{__html: html ?? ''}}/>;
}

export default RichTextMessage;