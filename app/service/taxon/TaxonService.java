package service.taxon;

import comparators.TaxonLatNameComparator;
import io.ebean.Expr;
import models.Taxon;
import models.User;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class TaxonService implements ITaxonService {
    @Override
    public Set<User> getInheritedRevisors(Taxon taxon) {
        Taxon[] taxonHierarchy = taxon.getParentHierarchy();
        Set<User> supervisors = new HashSet<>();
        for (Taxon t : taxonHierarchy) {
            List<User> taxonSupervisors = t.getSupervisors();
            supervisors.addAll(taxonSupervisors);
        }
        return supervisors;
    }

    @Override
    public Set<Taxon> getSubtree(Taxon rootTaxon) {
        return Taxon.find().query().where().conjunction()
            .add(Expr.ge("left", rootTaxon.getLeft()))
            .add(Expr.le("right", rootTaxon.getRight()))
            .endJunction()
            .orderBy("nameLat asc")
            .findSet();
    }

    @Override
    public List<Taxon> getInheritedlyAssignedTaxa(User user) {
        Set<Taxon> directlyAssignedTaxa = user.getSupervisedTaxons();
        List<Taxon> inheritedlyAssignedTaxa = new ArrayList<>();
        if (directlyAssignedTaxa == null) {
            return inheritedlyAssignedTaxa;
        }

        Map<Long, Taxon> byId = new LinkedHashMap<>();
        for (Taxon taxon : directlyAssignedTaxa) {
            for (Taxon subtaxon : getSubtree(taxon)) {
                byId.putIfAbsent(subtaxon.getId(), subtaxon);
            }
        }
        inheritedlyAssignedTaxa.addAll(byId.values());
        inheritedlyAssignedTaxa.sort(new TaxonLatNameComparator());
        return inheritedlyAssignedTaxa;
    }
    //TODO: merge with TaxonSearchService
}
