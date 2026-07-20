package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.Syntaxon;
import models.traits.SyntaxonDatatype;
import models.traits.SyntaxonDatatypePK;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.*;

public class SyntaxonExportAccumulator extends TriStateExportAccumulator {
    private final SyntaxonMap syntaxonMap;

    public SyntaxonExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes,
        List<Syntaxon> orderedSyntaxons, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
        syntaxonMap = new SyntaxonMap(orderedSyntaxons);

    }

    @Override
    public List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport) {
        List<List<CellDetail>> result = new ArrayList<List<CellDetail>>();

        if (isComplexExport) {
            List<CellDetail> listTraitName = getTraitNameRow();
            result.add(listTraitName);
        }

        List<CellDetail> rowTypes = new ArrayList<CellDetail>();
        List<CellDetail> rowValues = new ArrayList<CellDetail>();
        result.add(rowTypes);
        result.add(rowValues);

        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            for (int j = 0; j < syntaxonMap.size; j++) {
                rowTypes.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
                Syntaxon s = syntaxonMap.getSyntaxonByOrderId(j);
                rowValues.add(createCellDetail(1, s.getForeignId(), CellType.HeaderTaxonInfo));
            }
        }
        return result;
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof SyntaxonDatatype dao))
            return;

        TraitDetailsEntryType entryType =
            TraitDetailsEntryType.make(dao.getSytaxonDatatypePK().getEntryType());
        if (!isExported(entryType))
            return;

        long taxonId = dao.getSytaxonDatatypePK().getTaxonId();
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<CellDetail>();
            for (int i = 0; i < syntaxonMap.getSize() * getExportTypesCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
        List<CellDetail> list = cachedData.get(taxonId);
        int index = computeArrayIndex(dao.getSytaxonDatatypePK(), entryType);
        list.set(index, dao.isValue() ? TrueValue : FalseValue);
    }

    @Override
    protected int getColumnCount() {
        return syntaxonMap.getSize() * getExportTypesCount();
    }

    private int computeArrayIndex(SyntaxonDatatypePK datatypePk, TraitDetailsEntryType entryType) {
        int base = computeIndexForType(entryType);
        int offset = syntaxonMap.getOrder(datatypePk.getSyntaxon().getId());
        return offset + syntaxonMap.getSize() * base;
    }

    @Override
    protected int getBlockSize() {
        return syntaxonMap.getSize();
    }

    private class SyntaxonMap {
        private int size = 0;
        private final Map<Integer, Integer> syntaxonOrdering = new HashMap<Integer, Integer>();
        private final Map<Integer, Syntaxon> orderToSyntaxonMap = new HashMap<Integer, Syntaxon>();
        private final Map<Integer, Syntaxon> syntaxonMap = new HashMap<Integer, Syntaxon>();
        public SyntaxonMap(List<Syntaxon> orderedSyntaxons) {
            registerSyntaxons(orderedSyntaxons);
        }

        private void registerSyntaxons(List<Syntaxon> syntaxons) {
            for (Syntaxon syntaxon : syntaxons) {
                int syntaxonId = syntaxon.getId();
                if (syntaxonMap.containsKey(syntaxonId))
                    return;

                syntaxonMap.put(syntaxonId, syntaxon);
                orderToSyntaxonMap.put(size, syntaxon);
                syntaxonOrdering.put(syntaxonId, size++);
            }
        }

        public int getOrder(int syntaxonId) {
            return syntaxonOrdering.get(syntaxonId);
        }

        public Syntaxon getSyntaxonByOrderId(int orderId) {
            return orderToSyntaxonMap.get(orderId);
        }

        public int getSize() {
            return size;
        }
    }
}
