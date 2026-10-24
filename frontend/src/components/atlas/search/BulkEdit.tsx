/**
 * Hromadné úpravy záznamů z výsledků vyhledávání –
 * tenká kompozice: logiku (validace, guardy dávky, confirm dialogy, číselníky)
 * vlastní `bulkEdit/useBulkEdit`, sekce polí `bulkEdit/components/*`, síťová
 * volání `services/bulkEditApi`. Flow: hledání → SearchResultsView předá
 * records + searchPayloadEntries → uživatel vybere akci → submit* → dávka.
 */
import {useState} from 'react';
import {Accordion} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import {useTranslation} from 'react-i18next';
import {Autocomplete} from '@/components/autocomplete/Autocomplete';
import type {TaxonId} from '@/models/TaxonId';
import type {RecordPladias} from '@/models';
import {useBulkEdit} from './bulkEdit/useBulkEdit';
import {BulkEditBatchStatus, BulkEditFieldRow, PositionBufferFields} from './bulkEdit/components';
import type {TypeaheadOption} from './types';
import './BulkEdit.scss';

type BulkEditProps = {
    records: RecordPladias[];
    totalCount?: number | null;
    searchPayloadEntries: Array<[string, FormDataEntryValue]>;
    onBulkEditComplete?: () => Promise<void> | void;
};

export default function BulkEdit({records, totalCount, searchPayloadEntries, onBulkEditComplete}: BulkEditProps) {
    const {t} = useTranslation();
    const [activeKey, setActiveKey] = useState<string>('0');
    const bulkEdit = useBulkEdit({records, totalCount, searchPayloadEntries, onBulkEditComplete});

    return (
        <section className="bulk-edit-panel p-3 p-lg-4 mt-4 w-100">
            {bulkEdit.confirmDialog}
            <h4 className="bulk-edit-title mb-3">{t('atlas.search.bulkEdit.title')}</h4>

            <div className="bulk-edit-warning alert mb-3">
                {t('atlas.search.bulkEdit.warning')}
            </div>

            <div className="alert alert-info mb-3">
                {t('atlas.search.bulkEdit.selectedRecords', {count: bulkEdit.effectiveRecordCount})}: <strong>{bulkEdit.effectiveRecordCount}</strong>
            </div>

            <BulkEditBatchStatus
                isRunning={bulkEdit.isRunning}
                batchProgress={bulkEdit.batchProgress}
                progressPercent={bulkEdit.progressPercent}
                batchSummary={bulkEdit.batchSummary}
                formMessage={bulkEdit.formMessage}
            />

            <Accordion
                activeKey={activeKey}
                onSelect={(eventKey) => typeof eventKey === 'string' && setActiveKey(eventKey)}
                alwaysOpen={false}
                className="bulk-edit-accordion"
            >
                <Accordion.Item eventKey="0" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.positionBuffer.title')}</Accordion.Header>
                    <Accordion.Body>
                        <PositionBufferFields bulkEdit={bulkEdit}/>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="1" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.buffer.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.buffer.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.buffer.submitButton')}
                            onSubmit={() => void bulkEdit.submitBufferChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className={`form-control ${bulkEdit.bufferSingleError ? 'is-invalid' : ''}`}
                                value={bulkEdit.bufferSingle}
                                onChange={(event) => bulkEdit.changeBufferSingle(event.target.value)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="2" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.date.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.date.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.date.submitButton')}
                            onSubmit={() => void bulkEdit.submitDateChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className={`form-control ${bulkEdit.dateSingleError ? 'is-invalid' : ''}`}
                                value={bulkEdit.newDate}
                                onChange={(event) => bulkEdit.changeNewDate(event.target.value)}
                                placeholder={t('atlas.search.bulkEdit.sections.date.placeholder')}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="3" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.phytochorion.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.phytochorion.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.phytochorion.submitButton')}
                            onSubmit={() => void bulkEdit.submitPhytochorionChange()}
                            disabled={bulkEdit.isRunning}
                            invalid={bulkEdit.phytochorionError}
                        >
                            <Typeahead
                                id="bulk-edit-phytochorion"
                                labelKey="label"
                                onChange={(selected) => bulkEdit.changeSelectedPhytochorion(selected as TypeaheadOption[])}
                                options={bulkEdit.phytochorionOptions}
                                placeholder={t('atlas.search.bulkEdit.sections.phytochorion.placeholder')}
                                selected={bulkEdit.selectedPhytochorion}
                                clearButton
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="4" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.locality.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.locality.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.locality.submitButton')}
                            onSubmit={() => void bulkEdit.submitLocalityChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className={`form-control ${bulkEdit.localityError ? 'is-invalid' : ''}`}
                                value={bulkEdit.newLocality}
                                onChange={(event) => bulkEdit.changeNewLocality(event.target.value)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="5" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.nearestTown.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.nearestTown.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.nearestTown.submitButton')}
                            onSubmit={() => void bulkEdit.submitNearestTownChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className={`form-control ${bulkEdit.nearestTownError ? 'is-invalid' : ''}`}
                                value={bulkEdit.newNearestTownName}
                                onChange={(event) => bulkEdit.changeNewNearestTownName(event.target.value)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="6" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.source.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.source.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.source.submitButton')}
                            onSubmit={() => void bulkEdit.submitSourceChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className="form-control"
                                value={bulkEdit.newSource}
                                onChange={(event) => bulkEdit.changeNewSource(event.target.value)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="7" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.note.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.note.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.note.submitButton')}
                            onSubmit={() => void bulkEdit.submitNoteChange()}
                            disabled={bulkEdit.isRunning}
                        >
                            <input
                                type="text"
                                className="form-control"
                                value={bulkEdit.newImportComment}
                                onChange={(event) => bulkEdit.changeNewImportComment(event.target.value)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="8" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.finder.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.finder.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.finder.submitButton')}
                            onSubmit={() => void bulkEdit.submitFinderAdd()}
                            disabled={bulkEdit.isRunning}
                            invalid={bulkEdit.finderError}
                            helperText={t('atlas.search.bulkEdit.sections.finder.helper')}
                        >
                            <Typeahead
                                id="bulk-edit-finder"
                                labelKey="label"
                                onChange={(selected) => bulkEdit.changeSelectedFinder(selected as TypeaheadOption[])}
                                options={bulkEdit.finderOptions}
                                placeholder={t('atlas.search.bulkEdit.sections.finder.placeholder')}
                                selected={bulkEdit.selectedFinder}
                                clearButton
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="9" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.taxon.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.taxon.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.taxon.submitButton')}
                            onSubmit={() => void bulkEdit.submitTaxonChange()}
                            disabled={bulkEdit.isRunning}
                            invalid={bulkEdit.taxonError}
                            helperText={t('atlas.search.bulkEdit.sections.taxon.helper')}
                        >
                            <Autocomplete<TaxonId>
                                provider={bulkEdit.taxonProvider}
                                cacheKey={0}
                                clearOnSelect={false}
                                onSelect={(taxon) => bulkEdit.changeSelectedTaxon(taxon)}
                            />
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="10" className="bulk-edit-card">
                    <Accordion.Header>{t('atlas.search.bulkEdit.sections.semafor.title')}</Accordion.Header>
                    <Accordion.Body>
                        <BulkEditFieldRow
                            label={t('atlas.search.bulkEdit.sections.semafor.label')}
                            submitLabel={t('atlas.search.bulkEdit.sections.semafor.submitButton')}
                            onSubmit={() => void bulkEdit.submitSemafor()}
                            disabled={bulkEdit.isRunning}
                        >
                            <select
                                className={`form-select ${bulkEdit.semaforError ? 'is-invalid' : ''}`}
                                value={bulkEdit.newSemafor}
                                onChange={(event) => bulkEdit.changeNewSemafor(event.target.value)}
                            >
                                <option value="">{t('atlas.search.bulkEdit.sections.semafor.placeholder')}</option>
                                {bulkEdit.semaforOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </BulkEditFieldRow>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </section>
    );
}
