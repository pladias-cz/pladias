package helpers.coords;

public class MapUrlGenerator {

    public static String getMapyCzUrl(double x, double y) {
        String xCoord = String.format(java.util.Locale.US, "%.7f", x);
        String yCoord = String.format(java.util.Locale.US, "%.7f", y);
        StringBuilder builder = new StringBuilder();
        builder.append("https://mapy.cz/turisticka?x=");
        builder.append(xCoord);
        builder.append("&y=");
        builder.append(yCoord);
        builder.append("&z=16");
        builder.append("&source=coor");
        builder.append("&id=").append(xCoord).append(",").append(yCoord);


        return builder.toString();
    }
}
