package service.trait.detailexport.accumulators;

import models.Taxon;
import models.traits.Feature;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.StringUtils;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.*;
import java.util.stream.Collectors;

public abstract class BaseExportAccumulator implements IExportAccumulator {
    protected final String[] columnTypeLocalizedLabels;
    protected final CellDetail NoValue;
    protected final String DELIMITER = ";";
    protected Trait trait;
    protected UserOptions userOptions;
    protected List<Long> taxonIdsOrderedByLeft = new ArrayList<Long>();
    protected Map<Long, List<CellDetail>> cachedData = new HashMap<Long, List<CellDetail>>();
    protected Messages messages;
    private final Set<TraitDetailsEntryType> exportTypes;

    public BaseExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        this.trait = trait;
        NoValue = new CellDetail(1, userOptions.getNullSubstitution(), CellType.Data);
        this.userOptions = userOptions;
        this.exportTypes = exportTypes;
        this.messages = messages;
        this.columnTypeLocalizedLabels = buildColumnValueTypeLabels(userOptions);
    }

    private String[] buildColumnValueTypeLabels(UserOptions userOptions) {
        List<String> messageKeys;
        if (userOptions.displayApplicationInEnglish()) {
            messageKeys = Arrays.asList(
                "TraitDetailsExportAccumulator.originalValues.en",
                "TraitDetailsExportAccumulator.inheritedValues.en",
                "TraitDetailsExportAccumulator.aggregatedValues.en",
                "TraitDetailsExportAccumulator.compositeValues.en");
        } else {
            messageKeys = Arrays.asList(
                "TraitDetailsExportAccumulator.originalValues",
                "TraitDetailsExportAccumulator.inheritedValues",
                "TraitDetailsExportAccumulator.aggregatedValues",
                "TraitDetailsExportAccumulator.compositeValues");
        }
        List<String> localizedValues =
            messageKeys.stream()
                .map(s -> messages.at(s))
                .collect(Collectors.toList());

        String[] localizedmessagesArray = new String[localizedValues.size()];
        localizedmessagesArray = localizedValues.toArray(localizedmessagesArray);
        return localizedmessagesArray;
    }

    protected boolean isExported(TraitDetailsEntryType entryType) {
        return exportTypes.stream().anyMatch(v -> v == entryType);
    }

    protected int getExportTypesCount() {
        return exportTypes.size();
    }

    public void registerTaxons(List<Long> taxonIds) {
        taxonIdsOrderedByLeft =
            Collections.unmodifiableList(
                Taxon.find().query().where().idIn(taxonIds).orderBy("lft").findIds()
            );
    }

    protected int computeIndexForType(TraitDetailsEntryType entryType) {
        int index = 0;
        for (TraitDetailsEntryType v : TraitDetailsEntryType.values()) {
            if (v == entryType) break;
            if (isExported(v)) index++;
        }
        return index;
    }

    public List<Long> getOrderedTaxonList() {
        return taxonIdsOrderedByLeft;
    }

    public Map<Long, List<CellDetail>> getRawData() {
        for (long taxonId : taxonIdsOrderedByLeft) {
            if (!cachedData.containsKey(taxonId)) {
                populateCachedDataWithNullValues(taxonId);
            }
        }
        return Collections.unmodifiableMap(cachedData);
    }

    protected List<CellDetail> getTraitNameRow() {
        List<CellDetail> listTraitName = new ArrayList<CellDetail>();
        for (int i = 0; i < getColumnCount(); i++) {
            String traitDefinition = buildTraitDefinition();
            listTraitName.add(new CellDetail(1, traitDefinition, CellType.HeaderOriginalValue));
        }
        return listTraitName;
    }

    private String buildTraitDefinition() {
        Feature feature = trait.getFeature();
        boolean exportInEnglish = userOptions.displayApplicationInEnglish();

        StringBuilder traitDefinitionBuilder = new StringBuilder();

        String traitName = exportInEnglish ? feature.getNameEn() : feature.getNameCz();
        traitDefinitionBuilder.append(traitName);
        if (hasFeatureMultipleActiveTraits(feature)) {
            String traitDesc = exportInEnglish
                ? trait.getDescriptionEn()
                : trait.getDescriptionCz();
            if (StringUtils.isNotEmpty(traitDesc)) {
                traitDefinitionBuilder.append(" - ").append(traitDesc);
            }
        }
        return traitDefinitionBuilder.toString();
    }

    private boolean hasFeatureMultipleActiveTraits(Feature feature) {
        return feature.getSubordinateTraits().size() > 1;
    }

    protected List<CellDetail> getEmptyHeaderRow() {
        List<CellDetail> emptyLine = new ArrayList<CellDetail>();
        for (int i = 0; i < getColumnCount(); i++) {
            emptyLine.add(new CellDetail(1, "", CellType.HeaderTaxonInfo));
        }
        return emptyLine;
    }


    private void populateCachedDataWithNullValues(long taxonId) {
        List<CellDetail> nullRow = getNullRow();
        cachedData.put(taxonId, nullRow);
    }

    private List<CellDetail> getNullRow() {
        List<CellDetail> nullRow = new ArrayList<CellDetail>();
        int columnCount = getColumnCount();
        for (int i = 0; i < columnCount; i++) {
            nullRow.add(new CellDetail(1, userOptions.getNullSubstitution(), CellType.Data));
        }
        return nullRow;
    }

    protected abstract int getColumnCount();

    protected CellDetail createCellDetail(int colSpan, String value, CellType cellType) {
        return new CellDetail(colSpan, value, cellType);
    }

}
