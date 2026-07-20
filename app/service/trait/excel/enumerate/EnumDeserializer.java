package service.trait.excel.enumerate;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.Enumerate;
import models.traits.EnumerateDatatype;
import models.traits.EnumerateDatatypePK;
import models.traits.EnumerateValue;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import settings.user.UserOptions;

import java.util.*;

public class EnumDeserializer extends EnumAbstractDeserializer {
    private final Set<EnumerateDatatypePK> seenPrimaryKeysSet = new HashSet<EnumerateDatatypePK>();
    private final Map<String, EnumerateValue> enumerateMappingValues;
    private final Set<Long> seenDominantTaxonsSet = new HashSet<Long>();

    private final boolean allowMultiplicity;
    private final Set<Pair<Integer, Integer>> traitTaxonSet = new HashSet<Pair<Integer, Integer>>();

    public EnumDeserializer(Enumerate enumerate, UserOptions options, Messages messages, boolean allowMultiplicity) {
        super(options, messages);
        enumerateMappingValues = populateEnumMap(enumerate);
        this.allowMultiplicity = allowMultiplicity;
    }

    private Map<String, EnumerateValue> populateEnumMap(Enumerate enumerate) {
        Map<String, EnumerateValue> mapping = new HashMap<String, EnumerateValue>();
        for (EnumerateValue v : enumerate.getEnumerateValues()) {
            String name = (displayInEnglish ? v.getNameEn() : v.getNameCz());
            if (StringUtils.isNotBlank(name)) {
                mapping.put(name, v);
            }
        }
        return mapping;
    }


    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        String strValue = ExcelDocHelper.getSafeCellStringValue(row, ValueColumn);

        if (isRecordIgnored(strValue)) {
            return null;
        } else if (!allowMultiplicity && traitTaxonSet.contains(Pair.of((int) traitId, (int) taxonId))) {
            ExcelErrorInfo eInfo = createError(row, TaxonColumn, messages.at("EnumDeserializer.DuplicateTaxon"));
            errorList.add(eInfo);
            return null;
        } else if (isUnmeasurableValue(strValue)) {
            return processUnmeasurableValue(row, traitId, taxonId, errorList);
        }

        traitTaxonSet.add(Pair.of((int) traitId, (int) taxonId));

        int value = getValue(strValue, row, errorList);
        Boolean dominant = getDominant(row, errorList);
        Integer frequency = getFrequency(row, errorList);

        EnumerateDatatypePK pk = createPrimaryKey(traitId, taxonId, value);
        if (seenPrimaryKeysSet.contains(pk)) {
            errorList.add(createError(row, 0, messages.at("EnumDeserializer.duplicateKey")));
            return null;
        } else {
            seenPrimaryKeysSet.add(pk);
        }

        if (Boolean.TRUE.equals(dominant)) {
            if (isTaxonMarkedAsDominant(taxonId)) {
                errorList.add(createError(row, 0, messages.at("EnumDeserializer.multipleDominance")));
                return null;
            }
            this.markTaxonAsDominant(taxonId);
        }

        return buildDatatype(pk, dominant, frequency, false);
    }

    private void markTaxonAsDominant(long taxonId) {
        seenDominantTaxonsSet.add(taxonId);
    }

    private boolean isTaxonMarkedAsDominant(long taxonId) {
        return seenDominantTaxonsSet.contains(taxonId);
    }

    private Model buildDatatype(EnumerateDatatypePK pk, Boolean dominant, Integer frequency, boolean isUnmeasurable) {
        EnumerateDatatype datatype = new EnumerateDatatype();
        datatype.setDatatypePk(pk);
        datatype.setDominant(dominant);
        datatype.setFrequency(frequency);
        return datatype;
    }

    private EnumerateDatatypePK createPrimaryKey(int traitId, long taxonId, int value) {
        EnumerateDatatypePK dt = new EnumerateDatatypePK();
        dt.setTraitId(traitId);
        dt.setTaxonId(taxonId);
        dt.setValue(value);
        return dt;
    }

    private int getValue(String strValue, Row row, List<ExcelErrorInfo> errorList) {
        try {
            String trimmed = StringUtils.trimToEmpty(strValue);
            return enumerateMappingValues.get(trimmed).getId();
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, ValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return 0;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }

}
