import FileDownloadLink from '@/components/FileDownloadLink';
import {downloadDecoratedImport} from '@/services/importApi';
import type {ImportControlRecord} from '../types';

interface ImportControlsFilenameCellProps {
    row: ImportControlRecord;
}

export function ImportControlsFilenameCell({row}: ImportControlsFilenameCellProps) {
    if (!row.filename) return <span>-</span>;

    return (
        <FileDownloadLink fetchFile={() => downloadDecoratedImport(row.id)}>
            {row.filename}
        </FileDownloadLink>
    );
}
