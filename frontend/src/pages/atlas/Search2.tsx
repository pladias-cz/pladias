import {Row} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';

export default function Search2() {
    const {t} = useTranslation();
    usePageTitle(t('atlas.search2.title'));

    return (
        <Row>
            <h3 className="mb-3">{t('atlas.search2.title')}</h3>
        </Row>
    );
}
