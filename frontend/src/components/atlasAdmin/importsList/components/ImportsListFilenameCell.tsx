import FileDownloadLink from '@/components/FileDownloadLink';
import {downloadDecoratedImport} from '@/services/importApi';
import type {ImportRecord} from '../types';

interface ImportsListFilenameCellProps {
    row: ImportRecord;
}

export function ImportsListFilenameCell({row}: ImportsListFilenameCellProps) {
    if (!row.filename) return <span>-</span>;

    return (
        <FileDownloadLink fetchFile={() => downloadDecoratedImport(row.id)}>
            {row.filename}
        </FileDownloadLink>
    );
}
