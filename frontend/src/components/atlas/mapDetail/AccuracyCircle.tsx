import {Circle} from 'react-leaflet';

interface AccuracyCircleProps {
    /** Střed kruhu – poloha záznamu. */
    center: [number, number];
    /** Poloměr v metrech (přesnost záznamu); null nebo 0 kruh nekreslí. */
    precisionMeters: number | null;
    /** Barva čáry – shodná s okrajem markeru záznamu. */
    strokeColor: string;
    /** Výplň kruhu – barva záznamu, jen průsvitná. */
    fillColor: string;
}

/**
 * Kruh prostorové přesnosti záznamu. Přesnost všech zdrojů (PLADIAS
 * gps_coords_precision, GBIF coords_precision, ČBS positional_accuracy) je
 * poloměr v metrech – orientační údaj, proto se bez přepočtů mezi systémy
 * a projekcemi. Interakce je vypnutá, aby kruh nepřekrýval markery
 * a jejich hover/popup.
 */
function AccuracyCircle({center, precisionMeters, strokeColor, fillColor}: AccuracyCircleProps) {
    if (!precisionMeters || precisionMeters <= 0) {
        return null;
    }

    return (
        <Circle
            center={center}
            radius={precisionMeters}
            pathOptions={{
                color: strokeColor,
                fillColor,
                fillOpacity: 0.15,
                weight: 1,
                dashArray: '4, 4'
            }}
            interactive={false}
        />
    );
}

export default AccuracyCircle;
