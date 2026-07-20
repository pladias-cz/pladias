package service.trait.detailexport.accumulators;

import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.List;
import java.util.Map;
import java.util.Set;

public abstract class TriStateExportAccumulator extends BaseExportAccumulator {

    protected final CellDetail FalseValue;
    protected final CellDetail TrueValue;

    public TriStateExportAccumulator(Trait trait, UserOptions userOptions,
                                     Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
        FalseValue = new CellDetail(1, userOptions.boolToUserString(false), CellType.Data);
        TrueValue = new CellDetail(1, userOptions.boolToUserString(true), CellType.Data);
    }

    @Override
    public Map<Long, List<CellDetail>> getRawData() {
        replaceNullWithFalseWhereNecessary();
        return super.getRawData();
    }

    protected abstract int getBlockSize();

    private void replaceNullWithFalseWhereNecessary() {
        int blockSize = getBlockSize();
        for (long taxonId : taxonIdsOrderedByLeft) {
            if (cachedData.containsKey(taxonId)) {
                List<CellDetail> taxonDetails = cachedData.get(taxonId);
                for (int blockId = 0; blockId < getExportTypesCount(); blockId++) {
                    for (int i = blockId * blockSize; i < (blockId + 1) * blockSize; i++) {
                        if (taxonDetails.get(i) != NoValue) {
                            replaceNullWithFalse(taxonDetails, blockId, blockSize);
                        }
                    }
                }
            }
        }
    }

    private void replaceNullWithFalse(List<CellDetail> taxonDetails, int blockId, int blockSize) {
        for (int i = blockId * blockSize; i < (blockId + 1) * blockSize; i++) {
            if (taxonDetails.get(i) == NoValue) {
                taxonDetails.set(i, FalseValue);
            }
        }
    }

}
