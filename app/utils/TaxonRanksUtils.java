package utils;

import models.TaxonRank;

import java.util.Arrays;
import java.util.List;

public class TaxonRanksUtils {

    private static List<TaxonRank> exportableRanks = null;

    public static List<Integer> getExportableRankIds() {
        return Arrays.asList(
            TaxonRank.FormulaSpeciesDifferentGenera,
            TaxonRank.FormulaSpeciesSameGenus,
            TaxonRank.FormulaSubspeciesDifferentSpecies,

            TaxonRank.SubgenusId,
            TaxonRank.SectionId,
            TaxonRank.SeriesId,
            TaxonRank.SpeciesId,
            TaxonRank.SubspeciesId,
            TaxonRank.VarietyId,
            TaxonRank.FormId,

            TaxonRank.NothospeciesId,
            TaxonRank.NothosubspeciesId,
            TaxonRank.AggregateId,
            TaxonRank.InformalInfragenericVariousId,
            TaxonRank.GroupId,
            TaxonRank.CultivarId);
    }

    public static List<Integer> getImportableRankIds() {
        return Arrays.asList(
            TaxonRank.GenusId,
            TaxonRank.SectionId,
            TaxonRank.SeriesId,

            TaxonRank.FormulaSpeciesDifferentGenera,
            TaxonRank.FormulaSpeciesSameGenus,
            TaxonRank.FormulaSubspeciesDifferentSpecies,
            TaxonRank.FormulaSubspeciesSameSpeciesId,
            TaxonRank.FormulaVarietyDifferentSpeciesId,
            TaxonRank.FormulaVarietySameSpeciesId,

            TaxonRank.SpeciesId,
            TaxonRank.SubspeciesId,
            TaxonRank.VarietyId,
            TaxonRank.SubvarietyId,
            TaxonRank.FormId,
            TaxonRank.SubformId,

            TaxonRank.NothospeciesId,
            TaxonRank.NothosubspeciesId,
            TaxonRank.NothovarietyId,
            TaxonRank.HybridSubvarietyId,
            TaxonRank.HybridFormId,
            TaxonRank.HybridSubformId,
            TaxonRank.InformalHigherRankVariousId,
            TaxonRank.AggregateId,
            TaxonRank.InformalInfragenericVariousId,
            TaxonRank.InformalInfraspecificVariousId,
            TaxonRank.GroupId,
            TaxonRank.CultivarId);
    }

    public static List<Integer> getAssignableToRevisorsRankIds() {
        return Arrays.asList(
            TaxonRank.GenusId,
            TaxonRank.SectionId,
            TaxonRank.SeriesId,

            TaxonRank.FormulaSpeciesDifferentGenera,
            TaxonRank.FormulaSpeciesSameGenus,
            TaxonRank.FormulaSubspeciesDifferentSpecies,
            TaxonRank.FormulaSubspeciesSameSpeciesId,

            TaxonRank.SpeciesId,
            TaxonRank.SubspeciesId,
            TaxonRank.VarietyId,
            TaxonRank.SubvarietyId,
            TaxonRank.FormId,
            TaxonRank.SubformId,

            TaxonRank.NothospeciesId,
            TaxonRank.NothosubspeciesId,
            TaxonRank.NothovarietyId,
            TaxonRank.HybridSubvarietyId,
            TaxonRank.HybridFormId,
            TaxonRank.HybridSubformId,

            TaxonRank.AggregateId,
            TaxonRank.InformalInfragenericVariousId,
            TaxonRank.InformalInfraspecificVariousId,
            TaxonRank.GroupId,
            TaxonRank.CultivarId
        );
    }

    public static List<TaxonRank> getExportableRanks() {
        if (exportableRanks == null) {
            List<Integer> ids = getExportableRankIds();
            exportableRanks = TaxonRank.find().query().where().idIn(ids).orderBy("succession asc").findList();
        }

        return exportableRanks;
    }
}
