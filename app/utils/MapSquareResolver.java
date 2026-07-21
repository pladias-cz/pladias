package utils;

import com.google.inject.Inject;
import models.MapSquareNew;
import models.QuadrantNew;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import repositories.ISquareRepository;

import java.util.HashSet;
import java.util.Set;

public class MapSquareResolver {

    private final ISquareRepository m_SquareRepository;

    @Inject
    public MapSquareResolver(ISquareRepository repository) {
        m_SquareRepository = repository;
    }

    public SquareData resolve(String[] definitions) {
        Set<MapSquareNew> squares = new HashSet<>();
        Set<QuadrantNew> quadrants = new HashSet<>();

        for (String s : definitions) {
            if (StringUtils.isNotEmpty(s)) {
                String definition = s.trim();

                if (m_SquareRepository.isWildcard(definition)) {
                    Pair<MapSquareNew, QuadrantNew[]> data = m_SquareRepository.parseWildcard(definition);
                    if (data != null) {
                        squares.add(data.getLeft());
                        for (QuadrantNew q : data.getRight())
                            quadrants.add(q);
                    }
                } else if (m_SquareRepository.isSquare(definition)) {
                    MapSquareNew square = m_SquareRepository.parseSquareId(definition);
                    if (square != null) {
                        squares.add(square);
                    }
                } else {
                    QuadrantNew quadrant = m_SquareRepository.parseQuadrantId(definition);
                    if (quadrant != null) {
                        quadrants.add(quadrant);
                    }
                }
            }
        }
        return new SquareData(squares, quadrants);
    }

    public class SquareData {
        public Set<MapSquareNew> squares;
        public Set<QuadrantNew> quadrants;

        public SquareData(Set<MapSquareNew> squares, Set<QuadrantNew> quadrants) {
            this.squares = squares;
            this.quadrants = quadrants;
        }
    }
}
