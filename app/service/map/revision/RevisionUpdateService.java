package service.map.revision;

import exceptions.NotEligibleException;
import models.*;
import models.Record;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.config.IConfigService;
import service.map.MapStatusUpdateService;
import service.taxon.ITaxonService;
import utils.UserUtils;

import java.util.ArrayList;
import java.util.List;

public class RevisionUpdateService extends MapStatusUpdateService {
    private static final int TaxonEditTreshold = 10;
    private static final int RecordsSupervisorUploadCount = 10;

    private final Logger _logger = LoggerFactory.getLogger(RevisionUpdateService.class);

    public RevisionUpdateService(User currentUser, ITaxonService taxonService, IConfigService configService, Messages messages) {
        super(currentUser, taxonService, configService, messages);
    }

    @Override
    public void update(TaxonMapSettings settings, int newRevisionStatus) throws NotEligibleException {
        RevisionStatus newStatus = RevisionStatus.find().byId(newRevisionStatus);
        if (newStatus == null) {
            throw new IllegalArgumentException(messages.at("MapStatusUpdateService.invalidStatus"));
        }
        Taxon taxon = Taxon.find().byId(settings.getId());
        RevisionStatus oldStatus = settings.getRevisionStatus();
        oldStatus.refresh();
        verifyTransitionIsFeasible(oldStatus, newStatus, taxon);

        settings.setRevisionStatus(newStatus);
        _logger.info(String.format("MapRevision updated from state '%s' to state '%s'", oldStatus, newStatus));
        settings.update();

        if (newStatus.getId() == RevisionStatus.StatusMapSubmitted) {
            User admin = UserUtils.getMasterAdmin();
            notifyAdminByEmail(settings, admin);
        } else if (newStatus.getId() == RevisionStatus.StatusCompleting) {
            String contents = messages.at("RevisionUpdateService.taxonStatusChangeRevisorsMailContents",
                taxon.getNameLat(), getCurrentStatusDescription(settings));
            notifyRevisorsByEmail(settings, contents, null);
        } else if (newStatus.getId() == RevisionStatus.StatusClosed) {
            User admin = UserUtils.getMasterAdmin();
            notifyAdminByEmail(settings, admin);
        }
    }

    private boolean needsMapAdminRights(RevisionStatus oldStatus, RevisionStatus newStatus) {
        int newStatusId = newStatus.getId();
        return (newStatusId == RevisionStatus.StatusAssigned ||
            newStatusId == RevisionStatus.StatusReview ||
            newStatusId == RevisionStatus.StatusCompleting);
    }

    private void verifyTransitionIsFeasible(RevisionStatus oldStatus, RevisionStatus newStatus, Taxon taxon) throws NotEligibleException {

        boolean requiresMapAdminRights = needsMapAdminRights(oldStatus, newStatus);

        int oldStatusId = oldStatus.getId();
        int newStatusId = newStatus.getId();

        if (requiresMapAdminRights) {
            if (!currentUser.isMapAdmin())
                throw new NotEligibleException(messages.at("MapStatusUpdateService.insufficientRights"));
        } else {
            if (!currentUser.isMapAdmin() && (oldStatusId + 1 != newStatusId)) {
                throw new NotEligibleException(messages.at("MapStatusUpdateService.noSuchTransition", oldStatus.getDescription(), newStatus.getDescription()));
            }
        }

        if (newStatusId == RevisionStatus.StatusNotStarted && !taxon.getSupervisors().isEmpty()) {
            throw new NotEligibleException(
                messages.at("MapStatusUpdateService.statusNotStartedCanOnlyBeSetByEmptyingSupervisorList"));
        }
    }

    public void updateRevisionIfTresholdMet(TaxonMapSettings settings) {
        if (settings.getRevisionStatus().getId() != RevisionStatus.StatusAssigned) {
            return;
        }

        Taxon taxon = Taxon.find().byId(settings.getId());
        List<User> supervisors = taxon.getSupervisors();
        List<Long> supervisorIds = new ArrayList<>();
        for (User u : supervisors) {
            supervisorIds.add(u.getId());
        }

        int recordsUploadedBySupervisor = Record.find().query().where().in("batch.author.id", supervisorIds).eq("taxon.id", taxon.getId()).findCount();
        RevisionStatus revisionStatus = settings.getRevisionStatus();

        _logger.info(String.format("Taxon: %d-%s, revision status: %d-%s, records imported by supervisors: %s, edit count: %s",
            taxon.getId(), taxon.getNameLat(), revisionStatus.getId(), revisionStatus.getDescription(),
            recordsUploadedBySupervisor, settings.getEditCount()));
        if (settings.getEditCount() >= TaxonEditTreshold ||
            recordsUploadedBySupervisor >= RecordsSupervisorUploadCount) {
            RevisionStatus newStatus = RevisionStatus.find().byId(RevisionStatus.StatusMapInProgress);
            settings.setRevisionStatus(newStatus);
            settings.update();
        }
    }

    @Override
    protected String getCurrentStatusDescription(TaxonMapSettings settings) {
        return settings.getRevisionStatus().getDescription() + " (revize map)";
    }
}
