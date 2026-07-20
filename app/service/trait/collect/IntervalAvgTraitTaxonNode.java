package service.trait.collect;

import com.google.common.base.MoreObjects;
import io.ebean.Model;
import models.Taxon;
import models.traits.DatatypePK;
import models.traits.InheritanceType;
import models.traits.IntervalAvgDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import service.trait.collect.visitors.INodeVisitor;

import java.util.ArrayList;
import java.util.List;

public class IntervalAvgTraitTaxonNode extends BaseTraitTaxonNode {
    private final IntervalAvgData originalValue;
    private final IntervalAvgData inheritedValue;
    private final IntervalAvgData aggregatedValue;
    private final boolean isShallowInheritance;
    public IntervalAvgTraitTaxonNode(Trait trait, Taxon taxon, IntervalAvgDatatype model) {
        super(trait, taxon);
        originalValue = convertToAvgData(model);
        inheritedValue = new IntervalAvgData();
        aggregatedValue = new IntervalAvgData();
        isShallowInheritance = (trait.getFeature().getInheritanceType().getId() == InheritanceType.IntervalShallow);
    }

    public boolean isShallowInheritance() {
        return isShallowInheritance;
    }

    private IntervalAvgData convertToAvgData(IntervalAvgDatatype model) {
        IntervalAvgData origValue = new IntervalAvgData();
        if (model != null) {
            origValue.minimum = model.getMinimum();
            origValue.maximum = model.getMaximum();
            origValue.extremeMinimum = model.getExtremeMinimum();
            origValue.extremeMinimum = model.getExtremeMaximum();
            origValue.mean = model.getMean();
            origValue.standardMeanError = model.getStandardMeanError();
        }
        return origValue;
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

    @Override
    public List<Model> getComputedEntities() {
        List<Model> entities = new ArrayList<Model>();

        IntervalAvgData composedValue = null;
        if (!originalValue.isEmpty()) {
            composedValue = originalValue;
        }

        if (!aggregatedValue.isEmpty()) {
            entities.add(populateEntity(TraitDetailsEntryType.Aggregated, aggregatedValue));
            composedValue = MoreObjects.firstNonNull(composedValue, aggregatedValue);
        }

        if (!inheritedValue.isEmpty()) {
            entities.add(populateEntity(TraitDetailsEntryType.Inherited, inheritedValue));
            composedValue = MoreObjects.firstNonNull(composedValue, inheritedValue);
        }

        if (composedValue != null) {
            entities.add(populateEntity(TraitDetailsEntryType.Composite, composedValue));
        }

        return entities;
    }

    //TODO: do we still need IntervalAvgData ??
    private Model populateEntity(TraitDetailsEntryType entryType, IntervalAvgData value) {
        DatatypePK pk = new DatatypePK();
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());
        pk.setEntryType(entryType.getIndex());

        IntervalAvgDatatype datatype = new IntervalAvgDatatype();
        datatype.setDatatypePk(pk);
        datatype.setMinimum(value.minimum);
        datatype.setMaximum(value.maximum);
        datatype.setExtremeMinimum(value.extremeMinimum);
        datatype.setExtremeMaximum(value.extremeMaximum);
        datatype.setMean(value.mean);
        datatype.setStandardMeanError(value.standardMeanError);
        return datatype;
    }

    public IntervalAvgData getOriginalValue() {
        return originalValue;
    }

    public IntervalAvgData getInheritedValue() {
        return inheritedValue;
    }

    public IntervalAvgData getAggregatedValue() {
        return aggregatedValue;
    }

    public static class IntervalAvgData {
        public Double minimum;
        public Double maximum;
        public Double extremeMinimum;
        public Double extremeMaximum;
        public Double mean;
        public Double standardMeanError;

        public boolean isEmpty() {
            return (minimum == null &&
                maximum == null &&
                extremeMinimum == null &&
                extremeMaximum == null &&
                mean == null &&
                standardMeanError == null);
        }

        public void collectValues(IntervalAvgData other) {
            if (minimum == null) minimum = other.minimum;
            if (maximum == null) maximum = other.maximum;
            if (extremeMinimum == null) extremeMinimum = other.extremeMinimum;
            if (extremeMaximum == null) extremeMaximum = other.extremeMaximum;
            if (mean == null) mean = other.mean;
            if (standardMeanError == null) standardMeanError = other.standardMeanError;
        }
    }
}
