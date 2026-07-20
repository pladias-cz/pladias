package taxons.config;

import io.ebean.ExpressionList;
import models.Taxon;
import utils.ConfigHelper;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class TaxonConfiguration {

    private static final String ExcludedTaxonIdsFromTraits = "excludedTaxonIdsFromTraits";

    private List<Integer> _excludedTaxons = null;

    public List<Integer> getExcludedTaxons() {
        if (_excludedTaxons == null) {
            _excludedTaxons = LoadExcludedTaxons();
        }
        return _excludedTaxons;
    }

    public List<Integer> getTaxonIds(boolean excludeSuppressed) {
        ExpressionList<Taxon> expr = Taxon.find().query()
            .where()
            .notIn("id", getExcludedTaxons());

        if (excludeSuppressed) {
            expr = expr.eq("suppressed", false);
        }
        return toTaxonIds(expr);
    }

    public List<Integer> getTaxonIds(List<String> taxonNames, boolean excludeSuppressed) {

        ExpressionList<Taxon> expr = Taxon.find().query()
            .where()
            .in("name_lat", taxonNames)
            .notIn("id", getExcludedTaxons());

        if (excludeSuppressed) {
            expr = expr.eq("suppressed", false);
        }

        return toTaxonIds(expr);
    }

    private List<Integer> toTaxonIds(ExpressionList<Taxon> query) {
        List<Long> taxonIds = query.findIds();

        return taxonIds.stream()
            .map(Long::intValue)
            .collect(Collectors.toList());
    }

    private List<Integer> LoadExcludedTaxons() {
        try {
            return ConfigHelper.getIntList(ExcludedTaxonIdsFromTraits);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
