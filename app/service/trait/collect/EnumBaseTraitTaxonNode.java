package service.trait.collect;

import io.ebean.Model;
import models.Taxon;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import service.trait.excel.TraitDataProviderFactory;

import java.util.*;

public abstract class EnumBaseTraitTaxonNode extends BaseTraitTaxonNode {

    private final Enumerate enumerate;
    private final Set<Integer> originalValues = new HashSet<>();
    private final Map<Integer, Integer> originalValueFrequencies = new HashMap<>();
    private final Map<Integer, Boolean> originalValueDominancy = new HashMap<>();

    private final Map<Integer, Boolean> aggregatedValues = new HashMap<>();
    private final Map<Integer, Boolean> inheritedValues = new HashMap<>();

    public EnumBaseTraitTaxonNode(Trait trait, Taxon taxon, TraitDataProviderFactory factory) {
        super(trait, taxon);
        this.enumerate = trait.getFeature().getEnumerate();
        populateValues(factory);
    }

    private void populateValues(TraitDataProviderFactory factory) {

        Iterable<Model> data = factory.getData(trait, taxon);
        for (Model model : data) {
            EnumerateDatatype enumDatatype = (EnumerateDatatype) model;
            if (enumDatatype.getDatatypePk().isEnabled()) {
                populateOriginalValue(enumDatatype);
            }
        }
    }

    private void populateOriginalValue(EnumerateDatatype enumDatatype) {
        int enumValueKey = enumDatatype.getDatatypePk().getValue();
        originalValues.add(enumValueKey);
        if (enumDatatype.getFrequency() != null) {
            originalValueFrequencies.put(enumValueKey, enumDatatype.getFrequency());
        }
        originalValueDominancy.put(enumValueKey, enumDatatype.getDominant());
    }

    public Enumerate getEnumerate() {
        return enumerate;
    }

    public Map<Integer, Boolean> getAggregatedValues() {
        return aggregatedValues;
    }

    public Map<Integer, Boolean> getInheritedValues() {
        return inheritedValues;
    }

    public Set<Integer> getValues() {
        return originalValues;
    }

    public List<Model> getComputedEntities() {
        List<Model> results = new ArrayList<>();

        for (EnumerateValue enumVal : enumerate.getEnumerateValues()) {
            Boolean composedValue = null;
            if (!originalValues.isEmpty()) {
                //if there is at least one originalValue defined, composed value will be non-null
                composedValue = originalValues.contains(enumVal.getId());
            }

            if (aggregatedValues.containsKey(enumVal.getId())) {
                boolean isSet = aggregatedValues.get(enumVal.getId());
                EnumerateDatatype dao = createEntity(enumVal, isSet, TraitDetailsEntryType.Aggregated);
                results.add(dao);
                if (composedValue == null)
                    composedValue = isSet;
                else
                    composedValue |= isSet;
            }

            if (inheritedValues.containsKey(enumVal.getId())) {
                boolean isSet = inheritedValues.get(enumVal.getId());
                EnumerateDatatype dao = createEntity(enumVal, isSet, TraitDetailsEntryType.Inherited);
                results.add(dao);
                if (composedValue == null)
                    composedValue = isSet;
                else
                    composedValue |= isSet;
            }

            if (composedValue != null) {
                //composite values
                EnumerateDatatype dao = createEntity(enumVal, composedValue, TraitDetailsEntryType.Composite);
                results.add(dao);
            }
        }

        return results;
    }

    private EnumerateDatatype createEntity(EnumerateValue enumVal, boolean isEnabled, TraitDetailsEntryType type) {
        EnumerateDatatype datatype = new EnumerateDatatype();
        EnumerateDatatypePK pk = new EnumerateDatatypePK();
        pk.setEntryType(type.getIndex());
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());
        pk.setValue(enumVal.getId());
        pk.setEnabled(isEnabled);
        datatype.setDatatypePk(pk);

        if (type == TraitDetailsEntryType.Original) {
            int key = enumVal.getId();
            populateOriginalValueAttributes(datatype, key);
        }
        return datatype;
    }

    private void populateOriginalValueAttributes(EnumerateDatatype enumDatatype, int enumValue) {
        if (originalValueFrequencies.containsKey(enumValue)) {
            enumDatatype.setFrequency(originalValueFrequencies.get(enumValue));
        }
        if (originalValueDominancy.containsKey(enumValue)) {
            enumDatatype.setDominant(originalValueDominancy.get(enumValue));
        }
    }
}
