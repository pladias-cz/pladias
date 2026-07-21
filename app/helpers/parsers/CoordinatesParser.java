package helpers.parsers;

import org.apache.commons.lang3.tuple.Pair;
import play.i18n.Messages;

import java.security.InvalidParameterException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CoordinatesParser {
    private static final double MinLatValue = -90.0;
    private static final double MaxLatValue = 90.0;

    private static final double MinLonValue = -180.0;
    private static final double MaxLonValue = 180.0;

    private static final int MaxValueArcDivide = 60;

    private static final Pattern InputPattern1 =
        Pattern.compile("(\\d+)°(\\d+)'(\\d+(?:\\.\\d+)?)(?:\"|'')(:?N|S)?,\\s*(\\d+)°(\\d+)'(\\d+(:?\\.\\d+)?)(?:\"|'')(:?E|W)?");

    private static final Pattern InputPattern2 =
        Pattern.compile("(\\d\\d)(\\d\\d)(\\d\\d(?:\\.\\d+)?),\\s*(\\d\\d)(\\d\\d)(\\d\\d(?:\\.\\d+)?)");

    private static final Pattern InputPattern3 =
        Pattern.compile("(\\d+\\.\\d+)(:?N|S)?,\\s*(\\d+\\.\\d+)(:?E|W)?");

    private static final Pattern InputPattern4 =
        Pattern.compile("(\\d+),(\\d+),(\\d+(?:\\.\\d+)?),(:?N|S)?\\s+(\\d+),(\\d+),(\\d+(:?\\.\\d+)?),(:?E|W)?");

    private static final Pattern InputPattern5 =
        Pattern.compile("(\\d+)°(\\d+)'(\\d+(?:\\,\\d+)?)\"(:?N|S)?,\\s*(\\d+)°(\\d+)'(\\d+(:?\\,\\d+)?)\"(:?E|W)?");


    public static Pair<Double, Double> parse(String input, Messages messages) throws InvalidParameterException {
        if (input == null) {
            throw new InvalidParameterException(messages.at("CoordinatesParser.InvalidInput"));
        }

        input = input.trim();

        Pair<Double, Double> point = tryToMatchPattern1(input, messages);
        if (point == null) {
            point = tryToMatchPattern2(input, messages);
        }
        if (point == null) {
            point = tryToMatchPattern3(input);
        }
        if (point == null) {
            point = tryToMatchPattern4(input, messages);
        }
        if (point == null) {
            point = tryToMatchPattern5(input, messages);
        }


        if (!isInValidRange(point)) {
            throw new InvalidParameterException(messages.at("CoordinatesParser.InvalidInput"));
        }

        return point;
    }

    private static boolean isInValidRange(Pair<Double, Double> point) {
        if (point == null) return false;

        return (point.getLeft() > MinLonValue &&
            point.getLeft() < MaxLonValue &&
            point.getRight() > MinLatValue &&
            point.getRight() < MaxLatValue);
    }

    private static Pair<Double, Double> tryToMatchPattern1(String input, Messages messages) {
        Matcher m = InputPattern1.matcher(input.trim());

        if (!m.matches()) {
            return null;
        }
        double latDeg = Double.parseDouble(m.group(1));
        double latMin = Double.parseDouble(m.group(2));
        double latSec = Double.parseDouble(m.group(3));
        String latDir = m.group(4); // N or S (optional)

        double lonDeg = Double.parseDouble(m.group(5));
        double lonMin = Double.parseDouble(m.group(6));
        double lonSec = Double.parseDouble(m.group(7));
        String lonDir = m.group(9); // E or W (optional)

        double latitude = fromDegMinSecToDecimal(latDeg, latMin, latSec, latDir, messages);
        double longitude = fromDegMinSecToDecimal(lonDeg, lonMin, lonSec, lonDir, messages);

        return Pair.of(longitude, latitude);
    }

    private static Pair<Double, Double> tryToMatchPattern2(String input, Messages messages) {
        Matcher m = InputPattern2.matcher(input);
        if (!m.matches()) {
            return null;
        }

        double latDeg = Double.parseDouble(m.group(1));
        double latMin = Double.parseDouble(m.group(2));
        double latSec = Double.parseDouble(m.group(3));

        double lonDeg = Double.parseDouble(m.group(4));
        double lonMin = Double.parseDouble(m.group(5));
        double lonSec = Double.parseDouble(m.group(6));

        double latitude = fromDegMinSecToDecimal(latDeg, latMin, latSec, null, messages);
        double longitude = fromDegMinSecToDecimal(lonDeg, lonMin, lonSec, null, messages);

        return Pair.of(longitude, latitude);
    }

    private static Pair<Double, Double> tryToMatchPattern3(String input) {
        Matcher m = InputPattern3.matcher(input);
        if (!m.matches()) {
            return null;
        }

        double latitude = Double.parseDouble(m.group(1));
        String latDir = m.group(2);
        double longitude = Double.parseDouble(m.group(3));
        String lonDir = m.group(4);

        if ("S".equalsIgnoreCase(latDir)) {
            latitude = -latitude;
        }
        if ("W".equalsIgnoreCase(lonDir)) {
            longitude = -longitude;
        }


        return Pair.of(longitude, latitude);
    }


    private static Pair<Double, Double> tryToMatchPattern4(String input, Messages messages) {
        Matcher m = InputPattern4.matcher(input.trim());

        if (!m.matches()) {
            return null;
        }
        double latDeg = Double.parseDouble(m.group(1));
        double latMin = Double.parseDouble(m.group(2));
        double latSec = Double.parseDouble(m.group(3));
        String latDir = m.group(4); // N or S (optional)

        double lonDeg = Double.parseDouble(m.group(5));
        double lonMin = Double.parseDouble(m.group(6));
        double lonSec = Double.parseDouble(m.group(7));
        String lonDir = m.group(9); // E or W (optional)

        double latitude = fromDegMinSecToDecimal(latDeg, latMin, latSec, latDir, messages);
        double longitude = fromDegMinSecToDecimal(lonDeg, lonMin, lonSec, lonDir, messages);

        return Pair.of(longitude, latitude);
    }

    private static String replaceCommaForDecimalPoint(String input) {
        if (input == null)
            return null;

        return input.replace(',', '.');
    }


    private static Pair<Double, Double> tryToMatchPattern5(String input, Messages messages) {
        Matcher m = InputPattern5.matcher(input.trim());

        if (!m.matches()) {
            return null;
        }
        double latDeg = Double.parseDouble(m.group(1));
        double latMin = Double.parseDouble(m.group(2));
        double latSec = Double.parseDouble(replaceCommaForDecimalPoint(m.group(3)));
        String latDir = m.group(4); // N or S (optional)

        double lonDeg = Double.parseDouble(m.group(5));
        double lonMin = Double.parseDouble(m.group(6));
        double lonSec = Double.parseDouble(replaceCommaForDecimalPoint(m.group(7)));
        String lonDir = m.group(9); // E or W (optional)

        double latitude = fromDegMinSecToDecimal(latDeg, latMin, latSec, latDir, messages);
        double longitude = fromDegMinSecToDecimal(lonDeg, lonMin, lonSec, lonDir, messages);

        return Pair.of(longitude, latitude);
    }

    private static double fromDegMinSecToDecimal(double degrees, double minutes, double seconds, String dir, Messages messages) {
        if (minutes >= MaxValueArcDivide || seconds >= MaxValueArcDivide) {
            throw new InvalidParameterException(messages.at("CoordinatesParser.InvalidInput"));
        }

        double result = degrees + minutes / 60.0 + seconds / 3600;

        if ("S".equalsIgnoreCase(dir) || "W".equalsIgnoreCase(dir)) {
            result = -result;
        }
        return result;
    }

}
