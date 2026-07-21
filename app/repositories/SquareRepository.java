package repositories;

import models.MapSquareNew;
import models.QuadrantNew;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Singleton;
import java.util.Collection;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Singleton
public class SquareRepository implements ISquareRepository {

    private static final String PATTERN = "(\\d+)([abcd])?";
    private static final String SquarePattern = "(\\d+)";
    private static final String QuadrantPattern = "(\\d+)([abcd])";
    private static final String WildcardPattern = "^(\\d+)\\*$";

    private static final String SquareIdInvalid = "Invalid map square identifier";
    final Logger logger = LoggerFactory.getLogger(SquareRepository.class);
    private final Pattern m_RegexPattern;
    private final Pattern m_WildcardPattern;
    private final Map<MapSquareNew, Map<Character, QuadrantNew>> m_QuadrantMap;
    private final Map<String, MapSquareNew> m_MapSquares;
    private boolean initialized = false;

    public SquareRepository() {
        logger.info("Instantiating SquareRepository");
        m_MapSquares = new Hashtable<>();
        m_QuadrantMap = new Hashtable<>();
        m_RegexPattern = Pattern.compile(PATTERN);
        m_WildcardPattern = Pattern.compile(WildcardPattern);
    }

    public boolean isWildcard(String input) {
        if (input == null)
            return false;

        return input.matches(WildcardPattern);
    }

    public boolean isSquare(String input) {
        if (input == null)
            return false;

        return input.matches(SquarePattern);
    }

    public boolean isQuadrant(String input) {
        if (input == null)
            return false;

        return input.matches(QuadrantPattern);
    }

    private synchronized void initialize() {
        if (initialized)
            return;

        logger.info("setting up SquareRepository");
        List<QuadrantNew> list = QuadrantNew.find().all();
        logger.info("collected quadrants");
        for (QuadrantNew quadrant : list) {
            MapSquareNew mapSquare = quadrant.getSquare();
            Map<Character, QuadrantNew> map = m_QuadrantMap.computeIfAbsent(mapSquare, k -> new Hashtable<Character, QuadrantNew>());

            map.put(quadrant.getQuadrantLetter(), quadrant);
            m_MapSquares.put(mapSquare.getCode(), mapSquare);
        }
        initialized = true;
    }

    public MapSquareNew parseSquareId(String input) {
        if (input == null) {
            throw new IllegalArgumentException(SquareIdInvalid);
        }
        initialize();

        Matcher matcher = m_RegexPattern.matcher(input);
        if (matcher.matches()) {
            return m_MapSquares.get(input);
        }

        throw new IllegalArgumentException(SquareIdInvalid);
    }

    public Pair<MapSquareNew, QuadrantNew[]> parseWildcard(String input) {
        if (StringUtils.isEmpty(input)) {
            throw new IllegalArgumentException(SquareIdInvalid);
        }

        initialize();

        Matcher matcher = m_WildcardPattern.matcher(input);
        if (matcher.matches()) {
            return collectWildCardData(matcher.group(1));
        }
        return null;
    }

    private Pair<MapSquareNew, QuadrantNew[]> collectWildCardData(String squareId) {
        initialize();

        MapSquareNew square = m_MapSquares.get(squareId);
        if (square == null)
            return null;

        Collection<QuadrantNew> quadrants = m_QuadrantMap.get(square).values();
        return Pair.of(square, quadrants.toArray(new QuadrantNew[quadrants.size()]));
    }

    /***
     * @param input - string containing quadrantId (in form "(\\d+)([abcd])" )
     * @return corresponding Quadrant object
     */
    public QuadrantNew parseQuadrantId(String input) {
        if (StringUtils.isEmpty(input)) {
            throw new IllegalArgumentException(SquareIdInvalid);
        }
        initialize();

        Matcher matcher = m_RegexPattern.matcher(input);
        if (matcher.matches()) {
            String squareCode = matcher.group(1);
            String quadrantId = matcher.group(2);
            if (StringUtils.isNotEmpty(quadrantId)) {
                return getQuadrant(squareCode, Character.toLowerCase(quadrantId.charAt(0)));
            }
        }

        throw new IllegalArgumentException(SquareIdInvalid);
    }

    private QuadrantNew getQuadrant(String squareCode, char quadrantId) {
        initialize();

        MapSquareNew mapSquare = m_MapSquares.get(squareCode);
        if (mapSquare == null) {
            return null;
        }

        Map<Character, QuadrantNew> squareTable = m_QuadrantMap.get(mapSquare);
        if (squareTable == null) {
            return null;
        }

        return squareTable.get(quadrantId);
    }

    public QuadrantNew[] getSquareQuadrants(MapSquareNew mapSquare) {
        initialize();

        Map<Character, QuadrantNew> squareTable = m_QuadrantMap.get(mapSquare);
        if (squareTable == null) {
            return new QuadrantNew[0];
        }

        return squareTable.values().toArray(new QuadrantNew[squareTable.size()]);
    }
}
