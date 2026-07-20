import {Col, Row} from "react-bootstrap";
import type {ReactNode} from "react";

interface Props {
    label: string;
    content: ReactNode | null;
}

export default function RecordReadonlyField({label, content}: Props) {

    return (
        <Row className="align-items-center mb-1">
            <Col sm={3} className="text-muted small">
                {label}
            </Col>
            <Col sm={9}>
                {content}
            </Col>
        </Row>
    );
}

