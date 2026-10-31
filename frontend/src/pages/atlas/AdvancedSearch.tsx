import {Row} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {AdvancedSearch as AdvancedSearchForm} from '@/components/atlas/search/advanced/AdvancedSearch';

export default function AdvancedSearch() {
    const {t} = useTranslation();
    usePageTitle(t('atlas.advancedSearch.title'));

    return (
        <Row>
            <h3 className="mb-3">{t('atlas.advancedSearch.title')}</h3>
            <AdvancedSearchForm/>
            <div className="w-100 pb-5"/>
        </Row>
    );
}
