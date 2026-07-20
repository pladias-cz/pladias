import {Alert} from 'react-bootstrap';
import type {FlashMessage} from '../types';

interface ImportsFlashProps {
    flash: FlashMessage | null;
    onDismiss: () => void;
}

export function ImportsFlash({flash, onDismiss}: ImportsFlashProps) {
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
