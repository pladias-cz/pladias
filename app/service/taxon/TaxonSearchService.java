package service.taxon;

import comparators.TaxonLatNameComparator;
import dto.TaxonAutocompleteDto;
import dto.TaxonDto;
import io.ebean.Expr;
import models.Taxon;
import models.TaxonRank;
import utils.TaxonRanksUtils;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class TaxonSearchService {

    public static List<Taxon> getImportableTaxons(String prefix) {
        return Taxon.find().query().where().eq("suppressed", false).istartsWith("name_lat", prefix).isIn("rank.id", TaxonRanksUtils.getImportableRankIds()).orderBy("name_lat").findList();
    }

    public static List<TaxonAutocompleteDto> getImportableTaxonsDto(String prefix) {
        return Taxon.find().query().select("id, nameLat, nameHtml").where().eq("suppressed", false).istartsWith("nameLat", prefix).isIn("rank.id", TaxonRanksUtils.getImportableRankIds()).orderBy("nameLat").findList().stream().map(t -> new TaxonAutocompleteDto(t.getId(), t.getNameLat(), t.getNameHtml())).toList();
    }

    public static List<TaxonAutocompleteDto> getAllImportableTaxonsDto() {
        return TaxonSearchService.getImportableTaxonsDto("");
    }

    public static List<TaxonAutocompleteDto> getEditableFamiliaMembersDto(Taxon taxon) {
        return TaxonSearchService.getEditableFamiliaMembers(taxon).stream().map(t -> new TaxonAutocompleteDto(t.getId(), t.getNameLat(), t.getNameHtml())).toList();
    }

    public static List<Taxon> getEditableTaxonsForRevisors(String prefix) {
        return Taxon.find().query().where().eq("suppressed", false).istartsWith("name_lat", prefix).isIn("rank.id", TaxonRanksUtils.getAssignableToRevisorsRankIds()).orderBy("name_lat").findList();
    }

    public static List<Taxon> getAllTaxonsWithPrefix(String prefix) {
        return Taxon.find().query().where().istartsWith("name_lat", prefix).orderBy("name_lat").findList();
    }

    public static List<TaxonAutocompleteDto> getAllTaxonsDtoWithPrefix(String prefix) {
        return Taxon.find().query().select("id, nameLat, nameHtml").where().istartsWith("nameLat", prefix).orderBy("nameLat")
            // .setMaxRows(20)
            .findList().stream().map(t -> new TaxonAutocompleteDto(t.getId(), t.getNameLat(), t.getNameHtml())).toList();
    }

    public static List<TaxonAutocompleteDto> getParents(Taxon taxon) {
        return Taxon.find().query().select("id, nameLat, nameHtml").where().lt("lft", taxon.getLeft()).gt("rgt", taxon.getRight()).orderBy("lft").findList().stream().map(t -> new TaxonAutocompleteDto(t.getId(), t.getNameLat(), t.getNameHtml())).toList();
    }

    public static List<TaxonAutocompleteDto> getFirstChildren(Taxon taxon) {
        return Taxon.find().query().select("id, nameLat, nameHtml").where().gt("lft", taxon.getLeft()).lt("rgt", taxon.getRight()).eq("depth", taxon.getDepth() + 1).orderBy("lft").findList().stream().map(t -> new TaxonAutocompleteDto(t.getId(), t.getNameLat(), t.getNameHtml())).toList();
    }

    public static List<TaxonAutocompleteDto> getPotentialNewParents(Taxon t, String prefix, ITaxonService taxonService) {
        List<Taxon> candidates = Taxon.find().query().where().ilike("nameLat", prefix + "%").findList();

        Taxon parent = t.getParent();
        if (parent != null) {
            candidates.remove(parent);
        }
        Set<Taxon> subtaxons = taxonService.getSubtree(t);
        candidates.removeAll(subtaxons);

        candidates.sort(new TaxonLatNameComparator());

        return candidates.stream().map(tx -> new TaxonAutocompleteDto(tx.getId(), tx.getNameLat(), tx.getNameHtml())).collect(Collectors.toList());
    }

    public static Taxon getTaxon(long id) {
        return Taxon.find().byId(id);
    }

    public static TaxonDto getTaxonDto(long id) {
        Taxon t = Taxon.find().byId(id); // vrací Taxon nebo null
        if (t == null) {
            return null;
        }

        return new TaxonDto(t.getId(), t.getNameLat(), t.getNameHtml(), t.getNameCz(), t.getAuthor(), t.getHybridParentage(), t.getComment(), t.getParent().getId(), t.isSuppressed(), t.getRank().getId());
    }

    public static List<Taxon> getEditableFamiliaMembers(Taxon taxon) {
        Taxon familiaRoot = Taxon.find().query().where().lt("left", taxon.getLeft()).gt("right", taxon.getRight()).ge("rank.id", TaxonRank.FamilyId).orderBy("rank.id").setMaxRows(1).findOne();

        return Taxon.find().query().where().eq("suppressed", false).ge("left", familiaRoot.getLeft()).le("right", familiaRoot.getRight()).disjunction().conjunction().add(Expr.gt("rank.id", TaxonRank.FormulaAggregateSameGenus)).add(Expr.lt("rank.id", TaxonRank.FormulaFormDifferentSpeciesId)).endJunction().conjunction().add(Expr.gt("rank.id", TaxonRank.SubseriesId)).add(Expr.lt("rank.id", TaxonRank.HybridGenusId)).endJunction().conjunction().add(Expr.gt("rank.id", TaxonRank.HybridSubseriesId)).add(Expr.lt("rank.id", TaxonRank.InformalHigherRankVariousId)).endJunction().conjunction().add(Expr.gt("rank.id", TaxonRank.InformalHigherRankVariousId)).add(Expr.lt("rank.id", TaxonRank.FormulaGenusId)).endJunction().endJunction().orderBy("nameLat").findList();
    }
}
