package comparators;

import models.Taxon;

import java.util.Comparator;

public class TaxonLatNameComparator implements Comparator<Taxon> {
    public int compare(Taxon o1, Taxon o2) {
        return o1.getNameLat().compareTo(o2.getNameLat());
    }
}
