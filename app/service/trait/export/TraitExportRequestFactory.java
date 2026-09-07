package service.trait.export;

import exceptions.NotEligibleException;
import models.Taxon;
import models.TaxonRank;
import models.User;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.StringUtils;
import play.i18n.Messages;
import service.trait.comparator.TraitComparator;
import taxons.config.TaxonConfiguration;
import utils.TaxonRanksUtils;
import utils.UserUtils;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Transforms the complex export form into a {@link TraitExportRequest} and verifies that
 * the requested data may be exported.
 */
public class TraitExportRequestFactory {

    /**
     * Form bound from the complex export request - the input contract of the complex export.
     */
    public static class ComplexExportForm {

        private String taxonList;

        private String[] ranks;

        private Integer[] entryTypes;

        private boolean suppressedExcluded;

        public String getTaxonList() {
            return taxonList;
        }

        public void setTaxonList(String taxonList) {
            this.taxonList = taxonList;
        }

        public String[] getRanks() {
            return ranks;
        }

        public void setRanks(String[] ranks) {
            this.ranks = ranks;
        }

        public Integer[] getEntryTypes() {
            return entryTypes;
        }

        public void setEntryTypes(Integer[] entryTypes) {
            this.entryTypes = entryTypes;
        }

        public boolean isSuppressedExcluded() {
            return suppressedExcluded;
        }

        public void setSuppressedExcluded(boolean suppressedExcluded) {
            this.suppressedExcluded = suppressedExcluded;
        }
    }

    @Inject
    private TaxonConfiguration taxonConfiguration;

    public List<Integer> buildTraitIdList(String[] traitIds) {
        if (traitIds == null || traitIds.length == 0) {
            return Collections.emptyList();
        }
        return Arrays.stream(traitIds).map(Integer::parseInt).collect(Collectors.toList());
    }
    /**
     * @return latin names from the pasted taxon list that are not stored in the taxon database
     */
    public List<String> selectInvalidTaxonNames(String latinTaxonList) {
        List<String> results = new ArrayList<String>();
        List<String> names = splitTaxonNames(latinTaxonList);
        if (names.isEmpty()) {
            return results;
        }

        List<Taxon> taxonList = Taxon.find().all();
        Set<String> taxonSet = new HashSet<String>();
        for (Taxon t : taxonList) {
            taxonSet.add(t.getNameLat());
        }

        for (String s : names) {
            if (!taxonSet.contains(s)) {
                results.add(s);
            }
        }
        return results;
    }

    public TraitExportRequest create(ComplexExportForm exportRequest, List<Integer> traitIdList) {
        TraitExportRequest details = new TraitExportRequest();
        details.taxonIdList = buildTaxonIdList(exportRequest);
        details.entryTypes = buildEntryTypeSet(exportRequest.getEntryTypes());
        details.rankIds = buildRankIdList(exportRequest.getRanks());
        details.traitList = getSortedTraitList(traitIdList);
        return details;
    }

    /**
     * @throws NotEligibleException if the user is not allowed to download at least one of the traits
     */
    public void verifyUserAllowedToExport(User currentUser, Messages messages, List<Trait> traitList) throws NotEligibleException {
        for (Trait trait : traitList) {
            if (!UserUtils.isElligibleForTraitDownload(currentUser, trait)) {
                String featureName = trait.getFeature().getNameCz() != null
                                     ? trait.getFeature().getNameCz()
                                     : trait.getFeature().getNameEn();
                String message = messages.at("TraitExportController.userNotElligibleToExportTrait", featureName);
                throw new NotEligibleException(message);
            }
        }
    }

    // handles LF as well as CRLF line endings and trims the individual names
    private List<String> splitTaxonNames(String latinTaxonList) {
        if (StringUtils.isBlank(latinTaxonList)) {
            return new ArrayList<String>();
        }

        List<String> names = new ArrayList<String>();
        for (String name : latinTaxonList.split("\\R")) {
            if (StringUtils.isNotBlank(name.trim())) {
                names.add(name.trim());
            }
        }
        return names;
    }

    private List<Integer> buildTaxonIdList(ComplexExportForm exportInfo) {
        List<String> taxonNames = splitTaxonNames(exportInfo.getTaxonList());
        if (taxonNames.isEmpty()) {
            return taxonConfiguration.getTaxonIds(exportInfo.isSuppressedExcluded());
        }
        return taxonConfiguration.getTaxonIds(taxonNames, exportInfo.isSuppressedExcluded());
    }

    private List<Integer> buildRankIdList(String[] ranks) {
        if (ranks == null || ranks.length == 0) {
            return TaxonRanksUtils.getExportableRankIds();
        }
        return TaxonRank.find().query().where().in("nameEng", Arrays.asList(ranks)).findIds();
    }

    private Set<TraitDetailsEntryType> buildEntryTypeSet(Integer[] entryTypes) {
        if (entryTypes == null || entryTypes.length == 0) {
            return new HashSet<TraitDetailsEntryType>(
                Arrays.asList(
                    TraitDetailsEntryType.Original,
                    TraitDetailsEntryType.Inherited,
                    TraitDetailsEntryType.Aggregated)
            );
        }

        Set<TraitDetailsEntryType> resultSet = new HashSet<TraitDetailsEntryType>();
        for (int e : entryTypes) {
            resultSet.add(TraitDetailsEntryType.make(e));
        }
        return resultSet;
    }

    private List<Trait> getSortedTraitList(List<Integer> traitIdList) {
        //there is a limitation in Ebean that where().in(...) clause only works correctly with List used within the in(...) clause.
        List<Trait> traitList = Trait.find().query().where().in("id", traitIdList).findList();
        traitList.sort(TraitComparator.INSTANCE);
        return traitList;
    }
}
