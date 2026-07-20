package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.*;
import org.apache.commons.io.IOUtils;
import org.apache.pdfbox.util.PDFMergerUtility;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.FormFactory;
import play.i18n.Messages;
import play.libs.Files.TemporaryFile;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.map.publication.PublicationUpdateService;
import service.taxon.ITaxonService;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;


@Security.Authenticated(Authorized.class)
public class PdfMapController extends ControllerBase {
    final static Logger logger = LoggerFactory.getLogger(PdfMapController.class);
    @Inject
    private FormFactory formFactory;
    @Inject
    private ITaxonService taxonService;
    @Inject
    private IConfigService configService;

    //todo - move this to some service...
    public static byte[] buildPdfMapByteStream(long taxonId) {
        PdfMap pdfMap = PdfMap.find(taxonId, PdfMap.PdfType);
        PdfMap frontPage = PdfMap.find(taxonId, PdfMap.PdfTypeFrontpage);
        if (!pdfMap.isOverridden() && frontPage != null) {
            return mergePdfDocs(frontPage, pdfMap);
        }
        return pdfMap.getData();
    }

    private static byte[] mergePdfDocs(PdfMap... docs) {
        try {
            PDFMergerUtility merger = new PDFMergerUtility();
            for (PdfMap pdf : docs) {
                merger.addSource(new ByteArrayInputStream(pdf.getData()));
            }
            ByteArrayOutputStream destStream = new ByteArrayOutputStream();
            merger.setDestinationStream(destStream);
            merger.mergeDocuments();
            return destStream.toByteArray();
        } catch (Exception e) {
            logger.error("Unable to merge pdf docs", e);
            return docs[0].getData();
        }
    }

    /**
     * Downloads PNG map for a given taxon.
     *
     * @param taxonId the taxon ID
     * @return PNG image file
     */
    public Result downloadPng(Long taxonId) {
        PdfMap pdfMap = PdfMap.find(taxonId, PdfMap.PngType);
        if (pdfMap == null || pdfMap.getData() == null) {
            return notFound(JsonResult.buildError("PNG map not found for this taxon"));
        }

        String filename = String.format("attachment; filename=%s", pdfMap.getFilename());
        return ok(pdfMap.getPdfMapInputStream())
            .withHeader("Content-disposition", filename)
            .as("image/png");
    }

    /**
     * Uploads PNG map for a given taxon.
     * Expects multipart/form-data with a file field named "pngFile".
     *
     * @param request the HTTP request
     * @param taxonId the taxon ID
     * @return JSON success or error response
     */
    public Result uploadPng(Http.Request request, Long taxonId) {
        try {
            logger.info("PdfMapController.uploadPng() called for taxonId: " + taxonId);
            return doUploadPng(request, taxonId);
        } catch (Exception e) {
            logger.error("Exception while executing uploadPng()", e);
            return badRequest(JsonResult.buildError(e.toString()));
        }
    }

    private Result doUploadPng(Http.Request request, Long taxonId) throws Exception {
        Messages messages = getMessages(request);
        User currentUser = SessionUtils.getCurrentUser(request.session());

        // Check user eligibility
        if (!currentUser.isMapAdmin()) {
            return ok(JsonResult.error(messages.at("UploadPdfMapPreview.userNotEligible")));
        }

        // Validate taxon exists
        Taxon taxon = Taxon.find().byId(taxonId);
        if (taxon == null) {
            return ok(JsonResult.error(messages.at("UploadPdfMapPreview.missingTaxonId")));
        }

        // Validate taxon is mappable
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);
        if (settings == null) {
            return ok(JsonResult.error(messages.at("UploadPdfMapPreview.taxonNotMappable")));
        }

        // Validate publication status
        int pubStatusId = settings.getPublicationStatus().getId();
        if (pubStatusId != PublicationStatus.StatusPreviewPreparation &&
            pubStatusId != PublicationStatus.StatusPreview) {
            return ok(JsonResult.error(messages.at("UploadPdfMapPreview.invalidPublicationStatusForMapPreviewUpload")));
        }

        // Get file from multipart form data
        MultipartFormData<TemporaryFile> body = request.body().asMultipartFormData();
        if (body == null) {
            return ok(JsonResult.error("No file data provided"));
        }

        FilePart<TemporaryFile> filePart = body.getFile("pngFile");
        if (filePart == null) {
            return ok(JsonResult.error("No PNG file provided"));
        }

        // Read file data
        byte[] pngData;
        try (InputStream is = Files.newInputStream(filePart.getRef().path())) {
            pngData = IOUtils.toByteArray(is);
        }

        // Save or update PNG map
        PdfMap pngMap = PdfMap.findOrCreate(taxonId, PdfMap.PngType);
        pngMap.setData(pngData);
        pngMap.setFilename(filePart.getFilename());
        pngMap.save();

        // Handle publication update
        PublicationUpdateService service = new PublicationUpdateService(currentUser, taxonService, configService, messages);
        service.handleMapUpload(taxonId, pngMap);

        return ok(JsonResult.buildSuccess());
    }

}
