package service.record.serialization;

import models.Record;
import models.nonvascular.NonVascularRecordExtension;

import java.util.List;

public class ExtendedRecordTableDataGeneratorNonVascular extends ExtendedRecordTableDataGenerator
    implements IRecordTableDataGenerator {
    public ExtendedRecordTableDataGeneratorNonVascular() {
        super();
        extendRecordHeaders();
    }

    @Override
    public List<String> prepareRecordFields(Record r) {
        List<String> list = super.prepareRecordFields(r);

        NonVascularRecordExtension nonVascular = r.getNonVascularExtension();
        if (nonVascular != null) {
            list.add(guardNullValue(nonVascular.getLocalityExtra()));
            list.add(guardNullValue(nonVascular.getSubstrate()));
            list.add(nonVascular.getSubstrate1() != null
                ? nonVascular.getSubstrate1().getKeyCz()
                : "");
            list.add(nonVascular.getSubstrate2() != null
                ? nonVascular.getSubstrate2().getKeyCz()
                : "");
            list.add(guardNullValue(nonVascular.getChemical()));
        }

        return list;
    }

    private void extendRecordHeaders() {
        recordHeaders.add("lokalita pomocná");
        recordHeaders.add("substrát");
        recordHeaders.add("substrát 1");
        recordHeaders.add("substrát 2");
        recordHeaders.add("chemická data");
    }
}
