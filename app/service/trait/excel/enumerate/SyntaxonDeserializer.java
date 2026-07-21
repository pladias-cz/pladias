package service.trait.excel.enumerate;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.Syntaxon;
import models.traits.Feature;
import models.traits.SyntaxonDatatype;
import models.traits.SyntaxonDatatypePK;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import settings.user.UserOptions;

import java.util.*;

public class SyntaxonDeserializer extends EnumAbstractDeserializer {
    private final Map<String, Syntaxon> syntaxonsMap;
    private final Set<SyntaxonDatatypePK> seenPrivateKeysSet = new HashSet<>();
    private final Set<Pair<Long, Integer>> seenDominantTaxonSyntaxonPairSet = new HashSet<>();


    public SyntaxonDeserializer(Feature feature, UserOptions options, Messages messages) {
        super(options, messages);
        syntaxonsMap = populateSyntaxonMap(feature.getSyntaxonRestrictedRankId());
    }

    private Map<String, Syntaxon> populateSyntaxonMap(int syntaxonRankId) {
        List<Syntaxon> syntaxons = Syntaxon.find().query().where().eq("rank", syntaxonRankId).findList();

        Map<String, Syntaxon> mapping = new HashMap<>();
        for (Syntaxon s : syntaxons) {
            mapping.put(s.getForeignId(), s);

        }
        return mapping;
    }

    protected void markTaxonSyntaxonPairAsDominant(long dominantTaxonId, int syntaxonId) {
        Pair<Long, Integer> key = Pair.of(dominantTaxonId, syntaxonId);
        seenDominantTaxonSyntaxonPairSet.add(key);
    }

    protected boolean isTaxonSyntaxonPairMarkedAsDominant(long dominantTaxonId, int syntaxonId) {
        Pair<Long, Integer> pair = Pair.of(dominantTaxonId, syntaxonId);
        return seenDominantTaxonSyntaxonPairSet.contains(pair);
    }


    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        String strValue = ExcelDocHelper.getSafeCellStringValue(row, ValueColumn);

        if (isRecordIgnored(strValue)) {
            return null;
        } else if (isUnmeasurableValue(strValue)) {
            return processUnmeasurableValue(row, traitId, taxonId, errorList);
        }
        int syntaxonId = getValue(strValue, row, errorList);
        Boolean dominant = getDominant(row, errorList);
        Integer frequency = getFrequency(row, errorList);

        SyntaxonDatatypePK pk = createPrivateKey(traitId, taxonId, syntaxonId);
        if (seenPrivateKeysSet.contains(pk)) {
            errorList.add(createError(row, 0, messages.at("SyntaxonDeserializer.duplicateKey")));
            return null;
        } else {
            seenPrivateKeysSet.add(pk);
        }

        if (Boolean.TRUE.equals(dominant)) {
            if (isTaxonSyntaxonPairMarkedAsDominant(taxonId, syntaxonId)) {
                errorList.add(createError(row, 0, messages.at("EnumDeserializer.multipleDominance")));
                return null;
            }
            this.markTaxonSyntaxonPairAsDominant(taxonId, syntaxonId);
        }

        SyntaxonDatatype datatype = new SyntaxonDatatype();

        datatype.setSytaxonDatatypePK(pk);
        datatype.setDominant(dominant);
        datatype.setFrequency(frequency);
        datatype.setValue(true);
        return datatype;
    }

    private SyntaxonDatatypePK createPrivateKey(int traitId, long taxonId, int syntaxonId) {
        SyntaxonDatatypePK pk = new SyntaxonDatatypePK();
        pk.setTraitId(traitId);
        pk.setTaxonId(taxonId);
        pk.setSyntaxonId(syntaxonId);
        return pk;
    }

    private int getValue(String strValue, Row row, List<ExcelErrorInfo> errorList) {
        try {
            String trimmed = StringUtils.trimToEmpty(strValue);
            return syntaxonsMap.get(trimmed).getId();
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
