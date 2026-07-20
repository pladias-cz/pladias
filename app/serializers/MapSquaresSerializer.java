package serializers;

import models.MapSquareNew;

import java.util.List;

public class MapSquaresSerializer {

    public static String serialize(List<MapSquareNew> mapSquares) {
        if (mapSquares == null)
            return "";

        StringBuilder serialized = new StringBuilder();
        for (MapSquareNew square : mapSquares) {
            if (serialized.length() > 0) {
                serialized.append(';');
            }
            serialized.append(square.getCode());
        }
        return serialized.toString();
    }
}
