import React, {useRef, useState} from 'react';
import {Button, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {apiPost, ApiError} from '@/services/apiClient';
import type {ApiResult} from '@/models/ApiResponse';

// server-side limit of the PNG map upload (PdfMapController, audit finding M11)
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface PngUploadButtonProps {
    taxonId: number;
    onUploadComplete: (taxonId: number, hasPng: boolean) => void;
}

export function PngUploadButton({taxonId, onUploadComplete}: PngUploadButtonProps) {
    const {t} = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'image/png') {
            setError(t('atlas.admin.taxaList.pngUpload.invalidFileType'));
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setError(t('atlas.admin.taxaList.pngUpload.fileTooLarge'));
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('pngFile', file);

        try {
            // FormData bez Content-Type – boundary doplní prohlížeč (multipart)
            const payload = await apiPost<ApiResult>(`/api/react/atlas/pngMap/taxon/${taxonId}`, formData);

            if (payload.success) {
                setSuccess(t('atlas.admin.taxaList.pngUpload.uploadSuccess'));
                onUploadComplete(taxonId, true);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(payload.error || t('atlas.admin.taxaList.pngUpload.uploadFailed'));
            }
        } catch (err) {
            setError(err instanceof ApiError && err.message ? err.message : t('atlas.admin.taxaList.pngUpload.uploadFailed'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <Button
                variant="outline-primary"
                size="sm"
                onClick={openFilePicker}
                disabled={uploading}
            >
                {uploading ? (
                    <>
                        <Spinner size="sm" className="me-1"/>
                        {t('atlas.admin.taxaList.pngUpload.uploading')}
                    </>
                ) : (
                    <>
                        <i className="bi bi-upload me-1"></i>
                        {t('atlas.admin.taxaList.pngUpload.uploadPng')}
                    </>
                )}
            </Button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,image/png"
                onChange={handleFileSelect}
                style={{display: 'none'}}
            />
            {error && (
                <div className="text-danger small mt-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {error}
                </div>
            )}
            {success && (
                <div className="text-success small mt-1">
                    <i className="bi bi-check-circle me-1"></i>
                    {success}
                </div>
            )}
        </>
    );
}