package service.trait.collect;

import com.google.common.base.MoreObjects;
import io.ebean.Model;
import models.Syntaxon;
import models.Taxon;
import models.traits.SyntaxonDatatype;
import models.traits.SyntaxonDatatypePK;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.tuple.Pair;
import service.trait.collect.visitors.INodeVisitor;

import java.util.*;

public class EnumSyntaxonTraitTaxonNode extends BaseTraitTaxonNode {
    private Map<Integer, Boolean> originalValues;
    private final Map<Integer, Boolean> inherited = new HashMap<Integer, Boolean>();
    private final Map<Integer, Boolean> aggregated = new HashMap<Integer, Boolean>();

    private final Map<Integer, Integer> originalValueFrequencies = new HashMap<Integer, Integer>();
    private final Map<Integer, Boolean> originalValueDominancy = new HashMap<Integer, Boolean>();

    private final Map<Integer, Syntaxon> allSyntaxonMap;

    public EnumSyntaxonTraitTaxonNode(Trait trait, Taxon taxon, Map<Integer, SyntaxonDatatype> syntaxons, Map<Integer, Syntaxon> allSyntaxonMap) {
        super(trait, taxon);
        this.allSyntaxonMap = Collections.unmodifiableMap(allSyntaxonMap);
        populateOriginalValues(syntaxons);

    }

    private void populateOriginalValues(Map<Integer, SyntaxonDatatype> syntaxons) {
        Map<Integer, Boolean> map = new HashMap<Integer, Boolean>();
        for (SyntaxonDatatype sd : syntaxons.values()) {
            int syntaxonId = sd.getSytaxonDatatypePK().getSyntaxonId();
            map.put(syntaxonId, true);
            originalValueDominancy.put(syntaxonId, sd.isDominant());
            if (sd.getFrequency() != null) {
                originalValueFrequencies.put(syntaxonId, sd.getFrequency());
            }
        }

        //and finally wrap in in unmodifiable wrapper:
        originalValues = java.util.Collections.unmodifiableMap(map);
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

    @Override
    public List<Model> getComputedEntities() {
        List<Model> results = new ArrayList<Model>();

        List<Pair<TraitDetailsEntryType, Map<Integer, Boolean>>> list =
            new ArrayList<Pair<TraitDetailsEntryType, Map<Integer, Boolean>>>();

        list.add(Pair.of(TraitDetailsEntryType.Original, originalValues));
        list.add(Pair.of(TraitDetailsEntryType.Aggregated, aggregated));
        list.add(Pair.of(TraitDetailsEntryType.Inherited, inherited));

        for (int sytaxonId : allSyntaxonMap.keySet()) {
            Pair<TraitDetailsEntryType, Map<Integer, Boolean>> firstNonNullEntry = null;
            SyntaxonDatatype datatype = null;
            for (Pair<TraitDetailsEntryType, Map<Integer, Boolean>> entry : list) {
                datatype = collectDetails(entry, sytaxonId);
                if (datatype != null) {
                    if (entry.getKey() != TraitDetailsEntryType.Original) {
                        //original value is already in the database
                        results.add(datatype);
                    }
                    firstNonNullEntry = MoreObjects.firstNonNull(firstNonNullEntry, entry);
                }
            }

            if (firstNonNullEntry != null) {
                Pair<TraitDetailsEntryType, Map<Integer, Boolean>> composedValueEntry
                    = Pair.of(TraitDetailsEntryType.Composite, firstNonNullEntry.getValue());
                datatype = collectDetails(composedValueEntry, sytaxonId);
                results.add(datatype);
            }
        }
        return results;
    }

    private SyntaxonDatatype collectDetails(Pair<TraitDetailsEntryType, Map<Integer, Boolean>> mapping, int syntaxonId) {
        SyntaxonDatatype dao = null;
        TraitDetailsEntryType entryType = mapping.getKey();
        Map<Integer, Boolean> map = mapping.getValue();


        if (supressDatatypeCreation(entryType, map, syntaxonId)) {
            return null;
        }

        if (map.containsKey(syntaxonId)) {
            dao = createDatatype(syntaxonId, entryType, map.get(syntaxonId));
        }
        return dao;
    }

    private boolean supressDatatypeCreation(TraitDetailsEntryType entryType, Map<Integer, Boolean> map, int syntaxonId) {
        //this datatype was already populated during initial import
        return entryType == TraitDetailsEntryType.Original
            && map.containsKey(syntaxonId)
            && !map.get(syntaxonId);
    }

    private SyntaxonDatatype createDatatype(int syntaxonId, TraitDetailsEntryType entryType, boolean value) {
        SyntaxonDatatypePK pk = new SyntaxonDatatypePK();
        pk.setTraitId(trait.getId());
        pk.setTaxonId(taxon.getId());
        pk.setEntryType(entryType.getIndex());
        pk.setSyntaxonId(syntaxonId);
        SyntaxonDatatype datatype = new SyntaxonDatatype();
        datatype.setSytaxonDatatypePK(pk);
        datatype.setValue(value);

        if (entryType == TraitDetailsEntryType.Original && originalValueDominancy.containsKey(syntaxonId)) {
            datatype.setDominant(originalValueDominancy.get(syntaxonId));
        } else {
            datatype.setDominant(false);
        }

        if (entryType == TraitDetailsEntryType.Original && originalValueFrequencies.containsKey(syntaxonId)) {
            datatype.setFrequency(originalValueFrequencies.get(syntaxonId));
        }
        return datatype;
    }

    public Map<Integer, Boolean> getOriginalValues() {
        return originalValues;
    }

    public Map<Integer, Boolean> getInherited() {
        return inherited;
    }

    public Map<Integer, Boolean> getAggregated() {
        return aggregated;
    }

    public Map<Integer, Syntaxon> getSyntaxonMap() {
        return allSyntaxonMap;
    }
}
