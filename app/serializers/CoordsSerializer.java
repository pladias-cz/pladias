package serializers;

import java.util.Locale;


public class CoordsSerializer {

    public static String serializeCoords(double latitude, double longitude) {
        return String.format("%s%c, %s%c",
            fromDecToDegMinSec(latitude),
            latitude > 0 ? 'N' : 'S',
            fromDecToDegMinSec(longitude),
            longitude < 180 ? 'E' : 'W');
    }

    public static String fromDecToDegMinSec(double decimal) {
        int deg = (int) Math.floor(decimal);
        int min = (int) ((decimal - (double) deg) * 60);
        double sec = (decimal - (double) deg - (double) min / 60) * 3600;

        return String.format(Locale.ENGLISH, "%d°%d'%.2f''", deg, min, sec);
    }
}
