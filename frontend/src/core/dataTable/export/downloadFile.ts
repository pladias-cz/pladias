/**
 * Helpers to store a response received as a blob on the user's disk
 */

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
