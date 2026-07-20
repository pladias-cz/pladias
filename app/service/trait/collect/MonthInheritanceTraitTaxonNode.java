package service.trait.collect;

import helpers.ranges.RangeList;
import io.ebean.DB;
import io.ebean.Model;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.Taxon;
import models.traits.DatatypePK;
import models.traits.MonthDatatype;
import models.traits.MonthDatatypePK;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.Range;
import service.trait.collect.visitors.INodeVisitor;

import java.util.ArrayList;
import java.util.List;

/*
▪	povolené datové typy: month
▪	dědění: pouze u vrcholu, ktere maji prave jednoho syna
▪	agregace: k rodiči se přiřadí rozsah měsíců minMěsíc(potomci)-maxMěsíc(potomci).
    Měsice se uvažují pouze v rámci jednoho roku. To pak znamená začátek a konec kvetení – nezachytí to ale případnou díru v celém intervalu. takže se nabízí doplnit to 12 dummy variable pro měsíce s uvedením 0/1
*/
public class MonthInheritanceTraitTaxonNode extends BaseTraitTaxonNode {

    private final List<MonthDatatype> rows;
    private final RangeList aggregated = new RangeList();
    private final RangeList inherited = new RangeList();
    private final RangeList composed = new RangeList();

    public MonthInheritanceTraitTaxonNode(Trait trait, Taxon taxon) {
        super(trait, taxon);

        DatatypePK pk = new DatatypePK();
        pk.setTraitId(trait.getId());
        pk.setTaxonId(taxon.getId());
        rows = fetchMonths(trait, taxon);
    }

    public List<MonthDatatype> getMonths() {
        return rows;
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

    @Override
    public List<Model> getComputedEntities() {
        List<Model> results = new ArrayList<Model>();

        for (MonthDatatype row : rows) {
            MonthDatatypePK monthPk = row.getDatatypePk();
            Range<Integer> range = Range.between(monthPk.getMinimum(), monthPk.getMaximum());
            composed.add(range);
        }

        for (Range<Integer> range : aggregated.getIntervals()) {
            MonthDatatype datatype = populateEntity(TraitDetailsEntryType.Aggregated, range);
            results.add(datatype);
            composed.add(range);
        }

        for (Range<Integer> range : composed.getIntervals()) {
            MonthDatatype datatype = populateEntity(TraitDetailsEntryType.Composite, range);
            results.add(datatype);

        }
        return results;
    }

    private MonthDatatype populateEntity(TraitDetailsEntryType entryType, Range<Integer> range) {
        MonthDatatypePK pk = new MonthDatatypePK();
        pk.setTaxonId(taxon.getId());
        pk.setTraitId(trait.getId());
        pk.setEntryType(entryType.getIndex());
        pk.setMinimum(range.getMinimum());
        pk.setMaximum(range.getMaximum());

        MonthDatatype datatype = new MonthDatatype();
        datatype.setDatatypePk(pk);
        return datatype;
    }

    public List<Range<Integer>> getAggregatedRanges() {
        return aggregated.getIntervals();
    }

    public void addAggregatedRange(Range<Integer> range) {
        aggregated.add(range);
    }

    public List<Range<Integer>> getInheritedRanges() {
        return inherited.getIntervals();
    }

    public void addIhneritedRange(Range<Integer> range) {
        inherited.add(range);
    }

    private List<MonthDatatype> fetchMonths(Trait trait, Taxon taxon) {

        String sql = String.format(
            " SELECT trait_id, taxon_id, entry_type, minimum, maximum, dominant " +
                " FROM  " + MonthDatatype.QualifiedTableName +
                " WHERE trait_id=" + trait.getId() +
                " AND taxon_id=" + taxon.getId() +
                " AND entry_type=" + TraitDetailsEntryType.Original.getIndex());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<MonthDatatype> results = new ArrayList<MonthDatatype>();
        for (SqlRow row : rows) {
            MonthDatatype datatype = convertToEntity(row);
            results.add(datatype);
        }
        return results;
    }

    private MonthDatatype convertToEntity(SqlRow row) {
        MonthDatatypePK pk = new MonthDatatypePK();
        pk.setTraitId(row.getLong("trait_id"));
        pk.setTaxonId(row.getLong("taxon_id"));
        pk.setEntryType(row.getInteger("entry_type"));
        pk.setMaximum(row.getInteger("maximum"));
        pk.setMinimum(row.getInteger("minimum"));

        MonthDatatype datatype = new MonthDatatype();
        datatype.setDatatypePk(pk);
        datatype.setDominant(row.getBoolean("dominant"));
        return datatype;
    }
}
