import React from "react";
import {Alert, Col, Row} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {instanceMessageKey, type InstanceMessage} from "@/models/InstanceMessage";

/**
 * Prezentační komponenta globálních zpráv o stavu instance (údržba apod.).
 * Polling (visibility, backoff, 401) vlastní `hooks/useInstanceMessages` –
 * tady není žádný fetch ani interval.
 */

interface FlashMessagesProps {
    messages: InstanceMessage[];
    /** Heartbeat opakovaně selhává – zobrazí se varování o nedostupnosti zpráv. */
    unavailable?: boolean;
}

const FlashMessages: React.FC<FlashMessagesProps> = ({messages, unavailable = false}) => {
    const {t} = useTranslation();

    if (messages.length === 0 && !unavailable) {
        return null;
    }

    return (
        <Row className="justify-content-center text-center">
            <Col sm={12} md={{span: 10, offset: 1}}>
                {unavailable && (
                    <Alert variant="warning">{t("common.instanceMessages.unavailable")}</Alert>
                )}
                {messages.map((message) => (
                    <Alert key={instanceMessageKey(message)} variant={message.type}>
                        {message.text}
                    </Alert>
                ))}
            </Col>
        </Row>
    );
};

export default FlashMessages;