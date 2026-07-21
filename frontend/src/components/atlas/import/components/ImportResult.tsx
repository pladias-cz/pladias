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

    const getTitle = (): string => {
        if (wasImported) {
            if (!hasErrors) {
                return t("atlas.import.component.successImported");
            }
            return t('components.atlas.import.hasErrorsNotImported');
        }
        if (!hasErrors) {
            return t("atlas.import.component.noErrors");
        }
        return t("atlas.import.component.hasErrors");
    };

    const getMessage = (): React.ReactNode => {
        if (wasImported) {
            if (hasErrors) {
                return (
                    <Alert variant="warning">
                        {t("atlas.import.component.errorExplanation")}
                        <br/>
                        {t("atlas.import.component.fixAndRetry")}
                    </Alert>
                );
            }
            return (
                <Alert variant="success">
                    {t("atlas.import.component.successMessage")}{' '}
                    <Button variant="link" onClick={onReset}>
                        {t("atlas.import.component.importAnother")}
                    </Button>
                </Alert>
            );
        }

        if (hasErrors || hasWarnings) {
            return (
                <Alert variant="warning">
                    {t("atlas.import.component.validationExplanation")}
                    <br/>
                    {t("atlas.import.component.proceedToImport")}
                     <a href="/atlas/import">{t("atlas.import.component.proceedToImportLink")}</a>.

                </Alert>
            );
        }

        return (
            <Alert variant="success">
                {t("atlas.import.component.validationSuccess")}{' '}
                <Button variant="link" onClick={onReset}>
                    {t("atlas.import.component.proceedToImport")}
                </Button>
            </Alert>
        );
    };

    return (
        <div className="row">
            <div className="col">
                <h4>{getTitle()}</h4>
                <div>{t("atlas.import.component.recordCount")}: {result.records}</div>
                {hasErrors && (
                    <div>{t("atlas.import.component.errorCount")}: {result.errors}</div>
                )}
                <div>{t("atlas.import.component.warningCount")}: {result.warnings}</div>
                <br/>

                {result.decoratedFileUrl && (
                    <div>
                        <p>
                            {t("atlas.import.component.downloadDecorated")}
                            <a href={result.decoratedFileUrl}>{t("atlas.import.component.downloadDecoratedFile")} </a>
                        </p>
                    </div>
                )}

                {getMessage()}
            </div>
        </div>
    );
}
