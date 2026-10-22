export interface DownloadDto {
    description: string;
    manager: string;
    version: string;
    url: string;
    /** true = xlsx generované backendem na požádání (button + fetch), false = statický soubor z /public. */
    dynamic: boolean;
}