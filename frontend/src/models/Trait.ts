export interface Trait {
    id: number;
    createTimestamp: string;      // ISO string
    totalTaxonCount: number;

    sourceHtml: string;           // @Html(t.getSource())
    descriptionCz: string;

    ownerHtml: string;            // UserViewUtils.getFullUserNameHtml
    visibilityDescriptionCz: string;

    hasAttachment: boolean;
    isDefault: boolean;

    canDownload: boolean;
    canDelete: boolean;
    canExport: boolean;
}
