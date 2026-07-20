package utils;

import org.apache.commons.lang3.StringUtils;

public class MapSquareUtils {

    public static String squareIdToString(int squareId) {
        String leftPaddedSquareId = StringUtils.leftPad(Integer.toString(squareId), 4, "0");
        return leftPaddedSquareId;
    }
}
