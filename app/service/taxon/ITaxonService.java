package service.taxon;

import models.Taxon;
import models.User;

import java.util.Set;

public interface ITaxonService {
    Set<User> getInheritedRevisors(Taxon taxon);

    Set<Taxon> getSubtree(Taxon root);
}
