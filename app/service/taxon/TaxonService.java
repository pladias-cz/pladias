package service.taxon;

import io.ebean.Expr;
import models.Taxon;
import models.User;

import java.util.HashSet;
import java.util.List;
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
    //TODO: merge with TaxonSearchService
}
