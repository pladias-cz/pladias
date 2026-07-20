package repositories;

import models.MapSquareNew;
import models.QuadrantNew;
import org.apache.commons.lang3.tuple.Pair;

public interface ISquareRepository {

    boolean isWildcard(String input);

    boolean isSquare(String input);

    boolean isQuadrant(String input);

    Pair<MapSquareNew, QuadrantNew[]> parseWildcard(String input);

    MapSquareNew parseSquareId(String input);

    QuadrantNew parseQuadrantId(String input);

    QuadrantNew[] getSquareQuadrants(MapSquareNew mapSquare);

}
