import React from 'react';
import {Alert, Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {ImportResult} from '../types';

interface ImportResultProps {
    result: ImportResult;
    onReset: () => void;
}

export function ImportResult({result, onReset}: ImportResultProps) {
    const {t} = useTranslation();

    const hasErrors = result.errors > 0;
    const hasWarnings = result.warnings > 0;
    const wasImported = result.imported;
    // import zamítnutý kontrolní validací před importem (provozní chyby jdou cestou výjimek)
    const importBlocked = result.errorCode === 'fileNotValid';

    const getTitle = (): string => {
        if (wasImported) {
            return t('atlas.import.component.successImported');
        }
        if (hasErrors) {
            return t('atlas.import.component.hasErrors');
        }
        return t('atlas.import.component.noErrors');
    };

    const getMessage = (): React.ReactNode => {
        if (wasImported) {
            return (
                <Alert variant="success">
                    {t('atlas.import.component.successMessage')}{' '}
                    <Button variant="link" onClick={onReset}>
                        {t('atlas.import.component.importAnother')}
                    </Button>
                </Alert>
            );
        }

        if (importBlocked) {
            return (
                <Alert variant="danger">
                    {t('atlas.import.component.importBlockedInvalid')}
                    <br/>
                    {t('atlas.import.component.fixAndRevalidate')}
                </Alert>
            );
        }

        if (hasErrors) {
            // závažné (nepropustné) chyby – import by byl zamítnut, nepokračovat k importu
            return (
                <Alert variant="danger">
                    {t('atlas.import.component.validationExplanation')}
                    <br/>
                    {t('atlas.import.component.fixAndRevalidate')}
                </Alert>
            );
        }

        if (hasWarnings) {
            // propustná varování – import pokračovat může
            return (
                <Alert variant="warning">
                    {t('atlas.import.component.validationExplanation')}
                    <br/>
                    {t('atlas.import.component.proceedToImport')}{' '}
                    <a href="/atlas/import">{t('atlas.import.component.proceedToImportLink')}</a>.
                </Alert>
            );
        }

        return (
            <Alert variant="success">
                {t('atlas.import.component.validationSuccess')}{' '}
                <Button variant="link" onClick={onReset}>
                    {t('atlas.import.component.proceedToImport')}
                </Button>
            </Alert>
        );
    };

    return (
        <div className="row">
            <div className="col">
                <h4>{getTitle()}</h4>
                <div>{t('atlas.import.component.recordCount')}: {result.records}</div>
                {hasErrors && (
                    <div>{t('atlas.import.component.errorCount')}: {result.errors}</div>
                )}
                <div>{t('atlas.import.component.warningCount')}: {result.warnings}</div>
                <br/>

                {result.decoratedFileUrl && (
                    <div>
                        <p>
                            {t('atlas.import.component.downloadDecorated')}
                            <a href={result.decoratedFileUrl}>{t('atlas.import.component.downloadDecoratedFile')} </a>
                        </p>
                    </div>
                )}

                {getMessage()}
            </div>
        </div>
    );
}
