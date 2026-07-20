package service.trait.comparator;

import models.traits.Section;
import models.traits.Trait;

import java.util.Comparator;

public class TraitComparator implements Comparator<Trait> {


    public static final TraitComparator INSTANCE = new TraitComparator();

    @Override
    public int compare(Trait t1, Trait t2) {

        if (t1 == null)
            throw new NullPointerException("t1");

        if (t2 == null)
            throw new NullPointerException("t2");

        Section s1 = t1.getFeature().getSection();
        Section s2 = t2.getFeature().getSection();

        if (s1.getId() != s2.getId()) {
            return Integer.compare(s1.getLeft(), s2.getLeft());
        }
        return Integer.compare(
            t1.getFeature().getSuccession(),
            t2.getFeature().getSuccession());
    }
}
