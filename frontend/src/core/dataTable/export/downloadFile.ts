/**
 * Helpers to store a response received as a blob on the user's disk
 */

export function resolveFilename(contentDisposition: string | undefined, fallback: string): string {
    const utf8Name = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Name?.[1]) {
        return decodeURIComponent(utf8Name[1]);
    }

    const simpleName = contentDisposition?.match(/filename="?([^";]+)"?/i);
    return simpleName?.[1] ?? fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
}

/**
 * Endpoints answer failures with JSON ({@code JsonResult} or an {@code error} field), so the
 * message has to be read out of the blob the file download would otherwise store.
 */
export async function readErrorMessage(payload: Blob | undefined): Promise<string> {
    if (!payload) {
        return '';
    }
    try {
        const text = await payload.text();
        const parsed = text ? JSON.parse(text) : null;
        return parsed?.message ?? parsed?.error ?? text;
    } catch {
        return '';
    }
}
