package service.trait.collect;

import com.google.common.base.MoreObjects;
import io.ebean.Model;
import models.Taxon;
import models.traits.DatatypeFactory;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;

import java.util.*;

public abstract class MultiValueTraitTaxonNodeBase<T> extends BaseTraitTaxonNode {
    private final Set<T> originalValues = new TreeSet<T>();
    private final Set<T> inherited = new TreeSet<T>();
    private final Set<T> aggregated = new TreeSet<T>();
    private final DatatypeFactory<T> datatypeFactory;

    public MultiValueTraitTaxonNodeBase(Trait trait, Taxon taxon, Collection<T> values) {
        super(trait, taxon);

        datatypeFactory = new DatatypeFactory<T>(trait, taxon);
        for (T s : values) {
            originalValues.add(s);
        }
    }

    @Override
    public List<Model> getComputedEntities() {
        List<Model> entities = new ArrayList<Model>();
        Set<T> composedValues = null;
        if (!originalValues.isEmpty()) {
            //original values have already been persisted
            composedValues = originalValues;
        }

        if (!aggregated.isEmpty()) {
            entities.addAll(populateEntities(TraitDetailsEntryType.Aggregated, aggregated));
            composedValues = MoreObjects.firstNonNull(composedValues, aggregated);
        }

        if (!inherited.isEmpty()) {
            entities.addAll(populateEntities(TraitDetailsEntryType.Inherited, inherited));
            composedValues = MoreObjects.firstNonNull(composedValues, inherited);
        }

        if (composedValues != null) {
            entities.addAll(populateEntities(TraitDetailsEntryType.Composite, composedValues));
        }

        return entities;
    }

    private Collection<Model> populateEntities(TraitDetailsEntryType entryType, Set<T> values) {
        List<Model> result = new ArrayList<Model>();
        for (T v : values) {
            Model m = datatypeFactory.create(entryType, v);
            result.add(m);
        }

        return result;
    }


    public Set<T> getOriginalValues() {
        return Collections.unmodifiableSet(originalValues);
    }

    public Set<T> getInherited() {
        return Collections.unmodifiableSet(inherited);
    }

    public void addInherited(Object value) {
        inherited.add((T) value);
    }

    public Set<T> getAggregated() {
        return Collections.unmodifiableSet(aggregated);
    }

    public void addAggregated(Object value) {
        aggregated.add((T) value);
    }
}
