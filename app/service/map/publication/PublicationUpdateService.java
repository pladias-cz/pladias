package service.map.publication;

import cache.TaxonCache;
import exceptions.NotEligibleException;
import global.ServerConstants;
import io.ebean.DB;
import io.ebean.Transaction;
import mail.MailInfo;
import mail.MailMessage;
import mail.MailService;
import models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.config.IConfigService;
import service.csv.CsvMapService;
import service.map.MapStatusUpdateService;
import service.taxon.ITaxonService;
import service.taxon.RecordRetrievalService;
import utils.TaxonUtils;
import utils.UserUtils;
import utils.records.RecordQuadrantDistribution;

import javax.mail.MessagingException;
import java.util.List;
import java.util.Set;

public class PublicationUpdateService extends MapStatusUpdateService {
    private final CsvMapService csvMapService;
    private final RecordRetrievalService recordRetrievalService;

    private final Logger _logger = LoggerFactory.getLogger(PublicationUpdateService.class);

    public PublicationUpdateService(User currentUser, ITaxonService taxonService, IConfigService configService, Messages messages) {
        super(currentUser, taxonService, configService, messages);
        recordRetrievalService = new RecordRetrievalService();
        csvMapService = new CsvMapService();
    }

    @Override
    public void update(TaxonMapSettings settings, int newPublicationStatus) throws Exception {
        try (Transaction transaction = DB.beginTransaction()) {
            doUpdate(settings, newPublicationStatus);
            transaction.commit();
        }
    }

    private void doUpdate(TaxonMapSettings settings, int newPublicationStatus) throws Exception {
        PublicationStatus newStatus = PublicationStatus.find().byId(newPublicationStatus);
        if (newStatus == null) {
            throw new IllegalArgumentException(messages.at("MapStatusUpdateService.invalidStatus"));
        }
        PublicationStatus oldStatus = settings.getPublicationStatus();
        verifyTransitionIsFeasible(oldStatus, newStatus);

        settings.setPublicationStatus(newStatus);
        _logger.info(String.format("MapPublication updated from state '%s' to state '%s'", oldStatus.getDescription(), newStatus.getDescription()));
        settings.update();

        long taxonId = settings.getId();
        TaxonCache.getInstance().clear(settings);
        if (newStatus.getId() == PublicationStatus.StatusNotStarted) {
            //nothing
        } else if (newStatus.getId() == PublicationStatus.ApprovedForProcessing) {
            User[] recipients = UserUtils.getMapDesigners();
            for (User u : recipients) {
                notifyAdminByEmail(settings, u);
            }
        } else if (newStatus.getId() == PublicationStatus.StatusPreviewPreparation) {
            try {
                deleteExistingCsvData(taxonId);
                deleteMapEntriesIfExist(taxonId);
                _logger.info("Existing map entries deleted");
                _logger.info("about to build record quadrant distribution");
                List<RecordQuadrantDistribution> recordsByQuadrant = recordRetrievalService.getIncludedInMapByQuadrant(settings);
                _logger.info("created record quadrant distribution");

                CsvMapDetails csvData = csvMapService.buildMapRecordCsvData(settings, recordsByQuadrant);
                csvData.save();
                _logger.info("Csv data built");
            } catch (Exception e) {
                _logger.error("exception during publication status change", e);
                throw e;
            }

        }

        if (newStatus.getId() == PublicationStatus.StatusPreview) {
            User admin = UserUtils.getMasterAdmin();
            notifyAdminByEmail(settings, admin);
            Taxon taxon = Taxon.find().byId(settings.getId());
            String contents = messages.at("PublicationUpdateService.taxonStatusChangeRevisorsMailContents",
                taxon.getNameLat(), getCurrentStatusDescription(settings));
            notifyRevisorsByEmail(settings, contents, admin);
        } else if (newStatus.getId() == PublicationStatus.StatusDone) {
            TaxonUtils.aggregateUnlock(settings.getId());
        }
    }

    private void deleteExistingCsvData(Long id) {
        List<CsvMapDetails> oldCsvList = CsvMapDetails.find().query().where().eq("taxonId", id).findList();
        for (CsvMapDetails details : oldCsvList) {
            details.delete();
        }
    }

    private void deleteMapEntriesIfExist(long taxonId) {
        for (int type : new int[]{PdfMap.PdfType, PdfMap.PngType, PdfMap.PdfTypeFrontpage}) {
            PdfMap map = PdfMap.find(taxonId, type);
            if (map != null) {
                map.delete();
                _logger.info(String.format("Map type %d from taxon %d deleted.", type, taxonId));
            }
        }
    }

    public void handleMapUpload(long taxonId, PdfMap pngMap) throws Exception {
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);

        //notify revisors and admin
        _logger.info("about to notify revisors about pdf report");
        notifyPngUploaded(pngMap);
        update(settings, PublicationStatus.StatusPreview);
    }

    private void verifyTransitionIsFeasible(PublicationStatus oldStatus, PublicationStatus newStatus) throws NotEligibleException {

        if (!currentUser.isMapAdmin()) {
            throw new NotEligibleException(messages.at("MapStatusUpdateService.insufficientRights"));
        }

        int oldStatusId = oldStatus.getId();
        int newStatusId = newStatus.getId();

        if (oldStatusId == PublicationStatus.StatusNotStarted &&
            newStatusId == PublicationStatus.ApprovedForProcessing)
            return;

        if (oldStatusId == PublicationStatus.ApprovedForProcessing &&
            (newStatusId == PublicationStatus.StatusNotStarted ||
                newStatusId == PublicationStatus.StatusPreviewPreparation))
            return;

        if (oldStatusId == PublicationStatus.StatusPreviewPreparation &&
            (newStatusId == PublicationStatus.StatusNotStarted ||
                newStatusId == PublicationStatus.ApprovedForProcessing ||
                newStatusId == PublicationStatus.StatusPreview))
            return;

        if (oldStatusId == PublicationStatus.StatusPreview &&
            (newStatusId == PublicationStatus.StatusNotStarted ||
                newStatusId == PublicationStatus.ApprovedForProcessing ||
                newStatusId == PublicationStatus.StatusPreview ||
                newStatusId == PublicationStatus.StatusDone))
            return;

        if (oldStatusId == PublicationStatus.StatusDone &&
            newStatusId == PublicationStatus.StatusNotStarted)
            return;

        throw new NotEligibleException(
            messages.at("MapStatusUpdateService.noSuchTransition",
                oldStatus.getDescription(),
                newStatus.getDescription()));
    }

    @Override
    protected String getCurrentStatusDescription(TaxonMapSettings settings) {
        return settings.getPublicationStatus().getDescription() + " (publikace map)";
    }

    public void notifyPngUploaded(PdfMap pngMap) {
        long taxonId = pngMap.getTaxonId();
        Taxon taxon = Taxon.find().byId(taxonId);

        Set<User> recipients = taxonService.getInheritedRevisors(taxon);
        recipients.add(UserUtils.getMasterAdmin());

        for (User u : recipients) {
            notifyPngUploaded(pngMap, u);
        }
    }

    private void notifyPngUploaded(PdfMap pngMap, User recipient) {
        Taxon taxon = Taxon.find().byId(pngMap.getTaxonId());
        String hostname = ServerConstants.getHostname();
        String pngMapUrl = String.format("%s://%s/pdfMap/id/%d/type/%d", ServerConstants.Protocol, hostname, pngMap.getTaxonId(), PdfMap.PngType);
        String subject = messages.at("PublicationUpdateService.mapUploaded", taxon.getNameLat());
        String contents = messages.at("PublicationUpdateService.mapUploadedMailContents", pngMapUrl);
        MailInfo mailInfo = new MailInfo(subject, contents, recipient);

        try {
            MailMessage message = getMailMessage(mailInfo);
            new MailService(_configService).sendMail(message);
            _logger.info(String.format("Email about map upload sent to: '%s'", recipient.getEmail()));
        } catch (MessagingException e) {
            _logger.error("Unable to send e-mail notification", e);
        }
    }
}
