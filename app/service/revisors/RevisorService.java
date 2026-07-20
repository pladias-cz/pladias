package service.revisors;

import cache.TaxonCache;
import exceptions.NotEligibleException;
import models.RevisionStatus;
import models.Taxon;
import models.TaxonMapSettings;
import models.User;
import play.i18n.Messages;
import service.comment.ICommentService;
import service.config.IConfigService;
import service.map.revision.RevisionUpdateService;
import service.taxon.ITaxonService;

import javax.inject.Inject;

public class RevisorService implements IRevisorService {

    @Inject
    private ITaxonService taxonService;

    @Inject
    private ICommentService commentService;

    @Inject
    private IConfigService configService;

    public void assignRevisorsToTaxon(User currentUser, User[] revisors, Taxon taxon, Messages messages) throws NotEligibleException {
        if (taxon == null) {
            throw new NotEligibleException("Invalid taxon");
        }
        if (revisors.length == 0) {
            throw new NotEligibleException("No revisor specified");
        }

        for (User revisor : revisors) {
            revisor.getSupervisedTaxons().add(taxon);
            revisor.update();
        }

        for (Taxon t : taxonService.getSubtree(taxon)) {
            updateRevisionUpdateService(currentUser, t, messages);
            TaxonCache.getInstance().clear(t);

        }
        commentService.bindRevisorsToUnresolvedComments(revisors, taxon);
    }

    private void updateRevisionUpdateService(User currentUser, Taxon t, Messages messages) throws NotEligibleException {
        TaxonMapSettings taxonMapSettings = TaxonMapSettings.find().byId(t.getId());
        if (taxonMapSettings != null &&
            taxonMapSettings.getRevisionStatus().getId() == RevisionStatus.StatusNotStarted) {
            RevisionUpdateService service = new RevisionUpdateService(currentUser, taxonService, configService, messages);
            service.update(taxonMapSettings, RevisionStatus.StatusAssigned);
        }
    }


}
