import {Alert} from 'react-bootstrap';
import type {FlashMessage} from '../types';

interface ImportControlsFlashProps {
    flash: FlashMessage | null;
    onDismiss: () => void;
}

export function ImportControlsFlash({flash, onDismiss}: ImportControlsFlashProps) {
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
