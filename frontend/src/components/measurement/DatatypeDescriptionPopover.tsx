import {OverlayTrigger, Popover, Badge} from 'react-bootstrap';
import RichTextMessage from '@/components/RichTextMessage';

interface Props {
    description?: string | null;
}

export function DatatypeDescriptionPopover({description}: Props) {
    if (!description) return null;

    const popover = (
        <Popover id="datatype-description-popover">
            <Popover.Body>
                <RichTextMessage html={description}/>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger
            trigger="click"
            placement="bottom"
            overlay={popover}
            rootClose
        >
            <Badge
                bg="info"
                pill
                role="button"
                tabIndex={0}
                className="ms-2"
            >
                ?
            </Badge>
        </OverlayTrigger>
    );
}
