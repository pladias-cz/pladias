import {Alert} from 'react-bootstrap';
import type {FlashMessage} from '../types';

interface ImportsListFlashProps {
    flash: FlashMessage | null;
    onDismiss: () => void;
}

export function ImportsListFlash({flash, onDismiss}: ImportsListFlashProps) {
    if (!flash) return null;

    return (
        <Alert 
            variant={flash.type} 
            dismissible 
            onClose={onDismiss}
            className="mb-3"
        >
            {flash.message}
        </Alert>
    );
}
