/**
 * Flash message component for MapUsers
 */

import {Alert} from 'react-bootstrap';
import type {FlashMessage} from '../types';

interface MapUsersFlashProps {
    flash: FlashMessage | null;
    onDismiss: () => void;
}

export function MapUsersFlash({flash, onDismiss}: MapUsersFlashProps) {
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
