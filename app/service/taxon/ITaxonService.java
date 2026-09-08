package service.taxon;

import models.Taxon;
import models.User;

import java.util.List;
import java.util.Set;

public interface ITaxonService {
    Set<User> getInheritedRevisors(Taxon taxon);

    Set<Taxon> getSubtree(Taxon root);

    /**
     * Taxa assigned to the user directly or inheritedly - every taxon the user supervises
     * together with its whole subtree. Deduplicated and sorted by Latin name.
     */
    List<Taxon> getInheritedlyAssignedTaxa(User user);
}
