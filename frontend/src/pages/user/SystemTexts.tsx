import {Col, Row, Tab, Tabs} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {usePageTitle} from '@/hooks/usePageTitle';
import PlayMessagesEditor from '@/components/user/PlayMessagesEditor';
import MaintenanceEditor from '@/components/user/MaintenanceEditor';

/**
 * Správa systémových textů (sysAdmin, routa /system/texts):
 * tab „Texty aplikace“ = PlayMessages (texty UI),
 * tab „Zprávy o údržbě“ = heartbeat zprávy (public.maintenance, add/delete).
 */
export default function SystemTexts() {
    const {t} = useTranslation();
    usePageTitle(t('user.systemTexts.title'));

    return (
        <Row>
            <Col xs={12} md={{span: 10, offset: 1}} lg={{span: 8, offset: 2}}>
                <h2>{t('user.systemTexts.title')}</h2>
                <Tabs defaultActiveKey="playMessages" id="system-texts-tabs" className="mb-3">
                    <Tab eventKey="playMessages" title={t('user.systemTexts.tab.playMessages')}>
                        <PlayMessagesEditor/>
                    </Tab>
                    <Tab eventKey="maintenance" title={t('user.systemTexts.tab.maintenance')}>
                        <MaintenanceEditor/>
                    </Tab>
                </Tabs>
            </Col>
        </Row>
    );
}
