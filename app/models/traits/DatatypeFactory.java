package models.traits;

import io.ebean.Model;
import models.Taxon;
import models.traitsExport.TraitDetailsEntryType;

public class DatatypeFactory<T> {
    private final Trait trait;
    private final Taxon taxon;
    private final Datatype datatype;

    public DatatypeFactory(
        Trait trait,
        Taxon taxon) {
        this.trait = trait;
        this.taxon = taxon;
        this.datatype = trait.getFeature().getDatatype();
    }

    public Model create(TraitDetailsEntryType entryType, T value) {
        switch (datatype.getId()) {
            case Datatype.EnumOrdinalDatatypeId:
            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalSingleDatatypeId:
                return createEnumType(entryType, toInteger(value));
            case Datatype.PercentageDatatypeId:
                return createPercentage(entryType, toDouble(value));
            case Datatype.RealDatatypeId:
                return createDoubleType(entryType, toDouble(value));
            case Datatype.YearDatatypeId:
                return createYearType(entryType, toInteger(value));
            case Datatype.IntegerDatatypeId:
                return createIntType(entryType, toInteger(value));
            case Datatype.RealMultiDatatypeId:
                return createDoubleMultiType(entryType, toDouble(value));
            default:
                throw new RuntimeException("Unable to process datatype " + datatype.getDescriptionEn());
        }
    }

    private int toInteger(T value) {
        return (int) (Object) value;
    }

    private double toDouble(T value) {
        return (double) (Object) value;
    }

    private Model createDoubleMultiType(TraitDetailsEntryType entryType, double value) {
        RealMultiDatatype datatype = new RealMultiDatatype();
        datatype.setEntryType(entryType.getIndex());
        datatype.setTaxonId(taxon.getId());
        datatype.setTraitId(trait.getId());
        datatype.setValue(value);

        return datatype;
    }

    private Model createIntType(TraitDetailsEntryType entryType, int value) {
        IntegerDatatype datatype = new IntegerDatatype();
        datatype.setTaxonId(taxon.getId());
        datatype.setTraitId(trait.getId());
        datatype.setEntryType(entryType.getIndex());
        datatype.setValue(value);

        return datatype;
    }

    private Model createYearType(TraitDetailsEntryType entryType, int value) {
        YearDatatype datatype = new YearDatatype();
        datatype.setEntryType(entryType.getIndex());
        datatype.setTaxonId(taxon.getId());
        datatype.setTraitId(trait.getId());
        datatype.setValue(value);

        return datatype;
    }

    private Model createDoubleType(TraitDetailsEntryType entryType, double value) {
        DatatypePK pk = new DatatypePK();
        pk.setEntryType(entryType.getIndex());
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());

        RealDatatype datatype = new RealDatatype();
        datatype.setDatatypePk(pk);
        datatype.setValue(value);
        return datatype;
    }

    private Model createPercentage(TraitDetailsEntryType entryType, double value) {
        DatatypePK pk = new DatatypePK();
        pk.setEntryType(entryType.getIndex());
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());

        PercentageDatatype datatype = new PercentageDatatype();
        datatype.setDatatypePk(pk);
        datatype.setValue(value);
        return datatype;
    }

    private Model createEnumType(TraitDetailsEntryType entryType, int value) {

        EnumerateDatatypePK pk = new EnumerateDatatypePK();
        pk.setEntryType(entryType.getIndex());
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());
        pk.setValue(value);

        EnumerateDatatype enumerateDatatype = new EnumerateDatatype();
        enumerateDatatype.setDatatypePk(pk);

        return enumerateDatatype;
    }
}
