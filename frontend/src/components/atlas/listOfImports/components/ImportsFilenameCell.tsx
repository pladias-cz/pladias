import FileDownloadLink from '@/components/FileDownloadLink';
import {downloadDecoratedImport} from '@/services/importApi';
import type {ImportRecord} from '../types';

interface ImportsFilenameCellProps {
    row: ImportRecord;
}

export function ImportsFilenameCell({row}: ImportsFilenameCellProps) {
    if (!row.filename) return <span>-</span>;

    return (
        <FileDownloadLink fetchFile={() => downloadDecoratedImport(row.id)}>
            {row.filename}
        </FileDownloadLink>
    );
}
