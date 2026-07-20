import React, {useRef, useState} from 'react';
import {Button, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import axios from 'axios';

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
            setError(t("atlas.admin.taxaList.pngUpload.invalidFileType"));
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('pngFile', file);

        try {
            const response = await axios.post(`/api/react/atlas/pngMap/taxon/${taxonId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data?.success) {
                setSuccess(t("atlas.admin.taxaList.pngUpload.uploadSuccess"));
                onUploadComplete(taxonId, true);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(response.data?.error || t("atlas.admin.taxaList.pngUpload.uploadFailed"));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || t("atlas.admin.taxaList.pngUpload.uploadFailed"));
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
                        {t("atlas.admin.taxaList.pngUpload.uploading")}
                    </>
                ) : (
                    <>
                        <i className="bi bi-upload me-1"></i>
                        {t("atlas.admin.taxaList.pngUpload.uploadPng")}
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