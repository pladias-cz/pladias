import {Col, Row} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {usePageTitle} from '@/hooks/usePageTitle';
import PlayMessagesEditor from '@/components/user/PlayMessagesEditor';

export default function PlayMessages() {
    const {t} = useTranslation();
    usePageTitle(t('user.playMessages.title'));

    return (
        <Row>
            <Col xs={12} md={{span: 10, offset: 1}} lg={{span: 6, offset: 2}}>
                <h2>{t('user.playMessages.title')}</h2>
                <PlayMessagesEditor/>
            </Col>
        </Row>
    );
}
