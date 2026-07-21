package models;

import org.apache.commons.lang3.tuple.Pair;

import java.util.ArrayList;
import java.util.List;

public class TaxonStatistics {
    public int recordsTotal;
    public int recordsAccepted;
    public int recordsDeclined;
    public int recordsUncertain;
    public int recordsUnprocessed;
    public int recordsIncludedInMap;
    public int recordsCommented;
    public int recordsUncommented;
    public int recordsBoundToQuadrants;
    public int recordsBoundToSquares;
    public int recordsBoundToCoords;
    public int recordsNotBoundToCoords;
    public int quadrantsValidated;
    public int quadrantsUncertain;
    public int quadrantsDeclined;
    public int quadrantsUnprocessed;
    public List<Pair<Project, Integer>> recordsByProject;

    public TaxonStatistics() {
        recordsByProject = new ArrayList<>();
    }
}
