package service.trait.collect;

import io.ebean.DB;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.Taxon;
import models.traits.*;

import java.security.InvalidParameterException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MultiValueNodeFactory {

    private final Trait trait;
    private final boolean isIntType;
    private final Datatype datatype;
    private final InheritanceType inheritanceType;

    public MultiValueNodeFactory(Trait trait) {
        this.trait = trait;
        this.datatype = trait.getFeature().getDatatype();
        this.isIntType = IsIntType(trait);
        this.inheritanceType = trait.getFeature().getInheritanceType();
    }

    private boolean IsIntType(Trait trait2) {
        int datatypeId = datatype.getId();
        return (datatypeId == Datatype.EnumOrdinalDatatypeId
            || datatypeId == Datatype.EnumNominalDatatypeId
            || datatypeId == Datatype.EnumOrdinalSingleDatatypeId
            || datatypeId == Datatype.YearDatatypeId
            || datatypeId == Datatype.IntegerDatatypeId);
    }

    public BaseTraitTaxonNode create(Taxon taxon) {
        if (isIntType) {
            Set<Integer> intValues = collectIntValues(taxon);
            if (inheritanceType.getId() == InheritanceType.Basic) {
                return new BasicTraitTaxonNode<Integer>(trait, taxon, intValues);
            } else return new NumericTraitTaxonNode<Integer>(trait, taxon, intValues);
        }

        Set<Double> doubleValues = collectDoubleValues(taxon);
        if (inheritanceType.getId() == InheritanceType.Basic) {
            return new BasicTraitTaxonNode<Double>(trait, taxon, doubleValues);
        } else return new NumericTraitTaxonNode<Double>(trait, taxon, doubleValues);
    }

    private Set<Integer> collectIntValues(Taxon taxon) {
        Set<Integer> values = null;
        switch (datatype.getId()) {
            case Datatype.EnumOrdinalDatatypeId:
            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalSingleDatatypeId: {
                values = collectIntValues(taxon, EnumerateDatatype.QualifiedTableName);
                break;
            }
            case Datatype.YearDatatypeId: {
                values = collectIntValues(taxon, YearDatatype.QualifiedTableName);
                break;
            }
            case Datatype.IntegerDatatypeId: {
                values = collectIntValues(taxon, IntegerDatatype.QualifiedTableName);
                break;
            }
            default:
                throw new InvalidParameterException(String.format("Basic inheritance for datatype '%d': value not assignable to int", datatype.getId()));
        }
        return values;
    }

    private Set<Double> collectDoubleValues(Taxon taxon) {
        Set<Double> values = null;
        switch (datatype.getId()) {
            case Datatype.PercentageDatatypeId: {
                values = collectDoubleValues(taxon, PercentageDatatype.QualifiedTableName);
                break;
            }
            case Datatype.RealDatatypeId: {
                values = collectDoubleValues(taxon, RealDatatype.QualifiedTableName);
                break;
            }
            case Datatype.RealMultiDatatypeId: {
                values = collectDoubleValues(taxon, RealMultiDatatype.QualifiedTableName);
                break;
            }
            default:
                throw new InvalidParameterException(String.format("Basic inheritance for datatype '%d' not supported", datatype.getId()));
        }
        return values;
    }

    private Set<Double> collectDoubleValues(Taxon taxon, String tableName) {
        String sql = buildSql(taxon, tableName);
        return doExtractDoubleValues(sql);
    }

    private Set<Integer> collectIntValues(Taxon taxon, String tableName) {
        String sql = buildSql(taxon, tableName);

        return doExtractIntegerValues(sql);
    }

    private Set<Integer> doExtractIntegerValues(String sql) {
        List<SqlRow> rows = getRows(sql);

        Set<Integer> set = new HashSet<Integer>();

        for (SqlRow row : rows) {
            int enumId = row.getInteger("value");
            set.add(enumId);
        }
        return set;
    }

    private Set<Double> doExtractDoubleValues(String sql) {
        List<SqlRow> rows = getRows(sql);

        Set<Double> set = new HashSet<Double>();
        for (SqlRow row : rows) {
            double value = row.getDouble("value");
            set.add(value);
        }
        return set;
    }

    private List<SqlRow> getRows(String sql) {
        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();
        return rows;
    }

    private String buildSql(Taxon taxon, String tableName) {
        String sql = String.format(
            " SELECT trait_id, taxon_id, value " +
                " FROM " + tableName +
                " WHERE trait_id=%d AND taxon_id=%d ",
            trait.getId(), taxon.getId());

        return sql;
    }
}
