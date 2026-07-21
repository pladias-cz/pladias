package service.trait.excel;

import io.ebean.*;
import models.Taxon;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class TraitDataProviderFactory {

    private final Logger logger = LoggerFactory.getLogger(TraitDataProviderFactory.class);
    private final Datatype metaDatatype;

    public TraitDataProviderFactory(Datatype metaDatatype) {
        this.metaDatatype = metaDatatype;
    }

    public List<Model> getData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        int datatypeId = metaDatatype.getId();
        List<Model> absList = new ArrayList<>();

        absList = switch (datatypeId) {
            case Datatype.BooleanDatatypeId -> collectBoolData(trait, taxonFilterList, entryTypes);
            case Datatype.EnumNominalDatatypeId, Datatype.EnumOrdinalDatatypeId, Datatype.EnumOrdinalSingleDatatypeId ->
                collectEnumData(trait, taxonFilterList, entryTypes);
            case Datatype.EnumSyntaxonsDatatypeId -> collectEnumSyntaxonData(trait, taxonFilterList, entryTypes);
            case Datatype.IntegerDatatypeId -> collectIntData(trait, taxonFilterList, entryTypes);
            case Datatype.YearDatatypeId -> collectYearData(trait, taxonFilterList, entryTypes);
            case Datatype.MonthDatatypeId -> collectMonthData(trait, taxonFilterList, entryTypes);
            case Datatype.RealDatatypeId -> collectRealData(trait, taxonFilterList, entryTypes);
            case Datatype.RealMultiDatatypeId -> collectRealMultiData(trait, taxonFilterList, entryTypes);
            case Datatype.PercentageDatatypeId -> collectPercentageData(trait, taxonFilterList, entryTypes);
            case Datatype.CrossTaxonDatatypeId -> collectCrossTaxonData(trait, taxonFilterList, entryTypes);
            case Datatype.IntervalAvgDatatypeId -> collectIntervalAvgData(trait, taxonFilterList, entryTypes);
            case Datatype.DistributionDatatypeId -> collectOccurrenceFrequencyData(trait, taxonFilterList, entryTypes);
            default -> absList;
        };
        return absList;
    }

    public List<Model> getData(Trait trait) {
        List<Integer> allTaxonIdList = getAllTaxonIds();

        return getData(trait,
            allTaxonIdList,
            new TraitDetailsEntryType[]{TraitDetailsEntryType.Original});
    }

    public List<Model> getAllData(Trait trait) {
        List<Integer> allTaxonIdList = getAllTaxonIds();
        return getData(trait, allTaxonIdList, TraitDetailsEntryType.values());
    }

    public Iterable<Model> getData(Trait trait, Taxon taxon) {
        int datatypeId = metaDatatype.getId();
        List<Model> absList = new ArrayList<>();

        switch (datatypeId) {
            case Datatype.BooleanDatatypeId:

                break;
            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalDatatypeId:
            case Datatype.EnumOrdinalSingleDatatypeId:
                absList = collectEnumData(trait, taxon);
                break;
            case Datatype.EnumSyntaxonsDatatypeId:
                break;
            case Datatype.IntegerDatatypeId:
                break;
            case Datatype.IntegerIndicatorsDatatypeId:
                break;
            case Datatype.YearDatatypeId:
                break;
            case Datatype.MonthDatatypeId:
                break;
            case Datatype.RealDatatypeId:
                break;
            case Datatype.RealMultiDatatypeId:
                break;
            case Datatype.PercentageDatatypeId:
                break;
            case Datatype.CrossTaxonDatatypeId:
                break;
            case Datatype.IntervalAvgDatatypeId:
                break;
        }
        return absList;
    }

    public boolean deleteTraitAndData(Trait trait) {
        try (Transaction transaction = DB.beginTransaction()) {
            deleteData(trait, TraitDetailsEntryType.values());
            trait.delete();
            transaction.commit();
            return true;
        } catch (Exception e) {
            logger.error(String.format("Unable to delete trait %d data", trait.getId()), e);
            return false;
        }
    }

    public void deleteData(Trait trait, TraitDetailsEntryType[] entryTypes) throws Exception {
        int datatypeId = trait.getFeature().getDatatype().getId();
        String tableName = switch (datatypeId) {
            case Datatype.BooleanDatatypeId -> BoolDatatype.QualifiedTableName;
            case Datatype.EnumNominalDatatypeId, Datatype.EnumOrdinalDatatypeId, Datatype.EnumOrdinalSingleDatatypeId ->
                EnumerateDatatype.QualifiedTableName;
            case Datatype.EnumSyntaxonsDatatypeId -> SyntaxonDatatype.QualifiedTableName;
            case Datatype.IntegerDatatypeId -> IntegerDatatype.QualifiedTableName;
            case Datatype.MonthDatatypeId -> MonthDatatype.QualifiedTableName;
            case Datatype.PercentageDatatypeId -> PercentageDatatype.QualifiedTableName;
            case Datatype.YearDatatypeId -> YearDatatype.QualifiedTableName;
            case Datatype.CrossTaxonDatatypeId -> CrossTaxonDatatype.QualifiedTableName;
            case Datatype.RealMultiDatatypeId -> RealMultiDatatype.QualifiedTableName;
            case Datatype.RealDatatypeId -> RealDatatype.QualifiedTableName;
            case Datatype.IntervalAvgDatatypeId -> IntervalAvgDatatype.QualifiedTableName;
            case Datatype.DistributionDatatypeId -> DistributionDatatype.QualifiedTableName;
            default -> {
                String message = String.format("Cannot delete unsupported datatype '%s'", trait.getFeature().getDatatype().getDescriptionEn());
                throw new Exception(message);
            }
        };

        String entryTypeSet = toSqlSet(entryTypes);

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("DELETE FROM ").append(tableName)
            .append(" WHERE trait_id=:traitId ")
            .append(" AND entry_type IN ").append(entryTypeSet).append(";");

        SqlUpdate sqlUpdate = DB.sqlUpdate(sqlBuilder.toString())
            .setParameter("traitId", trait.getId());

        sqlUpdate.execute();
    }

    private List<Model> collectBoolData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value " +
                " FROM  " + BoolDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());
        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            DatatypePK pk = new DatatypePK();
            BoolDatatype datatype = new BoolDatatype();
            datatype.setDatatypePk(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getBoolean("value"));
            absList.add(datatype);
        }
        return absList;
    }

    private String toSqlSet(TraitDetailsEntryType[] entryTypes) {

        Stream<Integer> intStream = Arrays.stream(entryTypes)
            .map(TraitDetailsEntryType::getIndex);

        return toSqlSet(intStream);
    }

    private String toSqlSet(Stream<Integer> intStream) {

        String commaSeparatedValues = intStream
            .map(String::valueOf)
            .collect(Collectors.joining(","));

        return wrapWithParentheses(commaSeparatedValues);
    }

    private String wrapWithParentheses(String value) {
        StringBuilder builder = new StringBuilder();
        builder.append(" (").append(value).append(") ");
        return builder.toString();
    }

    private List<Model> collectIntData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, value, entry_type, frequency " +
                " FROM " + IntegerDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            IntegerDatatype datatype = new IntegerDatatype();
            datatype.setTraitId(row.getLong("trait_id"));
            datatype.setTaxonId(row.getLong("taxon_id"));
            datatype.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getInteger("value"));
            datatype.setFrequency(row.getInteger("frequency"));

            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectMonthData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, minimum, maximum, dominant " +
                " FROM " + MonthDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            MonthDatatypePK pk = new MonthDatatypePK();
            pk.setMinimum(row.getInteger("minimum"));
            pk.setMaximum(row.getInteger("maximum"));
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            MonthDatatype datatype = new MonthDatatype();
            datatype.setDominant(row.getBoolean("dominant"));

            datatype.setDatatypePk(pk);
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectYearData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value, before, after " +
                " FROM " + YearDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            YearDatatype datatype = new YearDatatype();
            datatype.setTraitId(row.getLong("trait_id"));
            datatype.setTaxonId(row.getLong("taxon_id"));
            datatype.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getInteger("value"));
            datatype.setBefore(row.getBoolean("before"));
            datatype.setAfter(row.getBoolean("after"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectRealData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value " +
                " FROM  " + RealDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            DatatypePK pk = new DatatypePK();
            RealDatatype datatype = new RealDatatype();
            datatype.setDatatypePk(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getDouble("value"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectRealMultiData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value " +
                " FROM  " + RealMultiDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            RealMultiDatatype datatype = new RealMultiDatatype();
            datatype.setTraitId(row.getLong("trait_id"));
            datatype.setTaxonId(row.getLong("taxon_id"));
            datatype.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getDouble("value"));

            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectOccurrenceFrequencyData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, square_count, quadrant_count " +
                " FROM " + DistributionDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            DistributionDatatype datatype = new DistributionDatatype();
            datatype.setTraitId(row.getLong("trait_id"));
            datatype.setTaxonId(row.getLong("taxon_id"));
            datatype.setEntryType(row.getInteger("entry_type"));

            datatype.setSquaresCount(row.getInteger("square_count"));
            datatype.setQuadrantsCount(row.getInteger("quadrant_count"));

            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectIntervalAvgData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, minimum, maximum, subminimum, supramaximum, mean, sem " +
                " FROM " + IntervalAvgDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            DatatypePK pk = new DatatypePK();
            IntervalAvgDatatype datatype = new IntervalAvgDatatype();
            datatype.setDatatypePk(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            datatype.setMinimum(row.getDouble("minimum"));
            datatype.setMaximum(row.getDouble("maximum"));
            datatype.setExtremeMinimum(row.getDouble("subminimum"));
            datatype.setExtremeMaximum(row.getDouble("supramaximum"));
            datatype.setMean(row.getDouble("mean"));
            datatype.setStandardMeanError(row.getDouble("sem"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectCrossTaxonData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id,taxon_id2, entry_type, value " +
                " FROM  " + CrossTaxonDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            CrossTaxonDatatypePK pk = new CrossTaxonDatatypePK();
            CrossTaxonDatatype datatype = new CrossTaxonDatatype();
            datatype.setDatatypePk(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setTaxonId2(row.getLong("taxon_id2"));
            pk.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getDouble("value"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectPercentageData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value " +
                " FROM  " + PercentageDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            DatatypePK pk = new DatatypePK();
            PercentageDatatype datatype = new PercentageDatatype();
            datatype.setDatatypePk(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            datatype.setValue(row.getDouble("value"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectEnumData(Trait trait, Taxon taxon) {
        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, value, dominant, frequency, is_enabled " +
                " FROM  " + EnumerateDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d AND taxon_id=%d " +
                " AND entry_type = 1 " +
                " ORDER BY T.name_lat ASC ",
            trait.getId(), taxon.getId());

        return collectEnumDataCommon(sql);
    }

    private List<Model> collectEnumData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        StringBuilder builder = new StringBuilder();

        builder.append(String.format(
            " SELECT trait_id, taxon_id, entry_type, value, dominant, frequency, is_enabled " +
                " FROM  " + EnumerateDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet,
            trait.getId()));


        if (isOriginalEntriesOnlyExport(entryTypes)) {
            builder.append(" AND is_enabled = true ");
        }
        builder.append(" ORDER BY T.name_lat ASC ");
        return collectEnumDataCommon(builder.toString());
    }

    private boolean isOriginalEntriesOnlyExport(TraitDetailsEntryType[] entryTypes) {
        return entryTypes.length == 1 &&
            entryTypes[0] == TraitDetailsEntryType.Original;
    }

    private List<Model> collectEnumDataCommon(String sql) {
        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            EnumerateDatatype datatype = new EnumerateDatatype();
            EnumerateDatatypePK pk = new EnumerateDatatypePK();
            pk.setEnabled(row.getBoolean("is_enabled"));
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            pk.setValue(row.getInteger("value"));
            datatype.setDatatypePk(pk);

            datatype.setDominant(row.getBoolean("dominant"));
            datatype.setFrequency(row.getInteger("frequency"));

            absList.add(datatype);
        }
        return absList;
    }

    private List<Model> collectEnumSyntaxonData(Trait trait, List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        String taxonSqlSet = toSqlSet(taxonFilterList.stream());
        String entryTypeSet = toSqlSet(entryTypes);

        String sql = String.format(
            " SELECT trait_id, taxon_id, syntaxon_id, entry_type, dominant, frequency, value" +
                " FROM  " + SyntaxonDatatype.QualifiedTableName +
                " INNER JOIN taxons as T ON taxon_id = T.id " +
                " WHERE trait_id=%d " +
                " AND taxon_id IN " + taxonSqlSet +
                " AND entry_type IN " + entryTypeSet +
                " ORDER BY T.name_lat ASC ",
            trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<Model> absList = new ArrayList<>();
        for (SqlRow row : rows) {
            SyntaxonDatatypePK pk = new SyntaxonDatatypePK();
            SyntaxonDatatype datatype = new SyntaxonDatatype();
            datatype.setSytaxonDatatypePK(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            pk.setEntryType(row.getInteger("entry_type"));
            pk.setSyntaxonId(row.getInteger("syntaxon_id"));
            datatype.setDominant(row.getBoolean("dominant"));
            datatype.setFrequency(row.getInteger("frequency"));
            datatype.setValue(row.getBoolean("value"));
            absList.add(datatype);
        }
        return absList;
    }

    private List<Integer> getAllTaxonIds() {
        return Taxon.find().all()
            .stream().mapToInt(t -> (int) t.getId())
            .boxed()
            .collect(Collectors.toList());
    }
}
