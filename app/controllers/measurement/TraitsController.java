package controllers.measurement;

import controllers.ControllerBase;


import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

import javax.inject.Inject;

import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Sheet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import controllers.security.Authorized;
import excel.ExcelHelper;
import io.ebean.DB;
import io.ebean.Model;
import io.ebean.Transaction;
import mail.MailService;
import models.User;
import models.UserActivity;
import models.dto.UploadedFile;
import models.traits.Datatype;
import models.traits.Feature;
import models.traits.InheritanceType;
import models.traits.Section;
import models.traits.Trait;
import models.traits.ValueComment;
import models.traits.VisibilityStatus;
import platform.ProjectConstants;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.libs.Files.TemporaryFile;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Http.Request;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import repositories.ITraitRepository;
import scheduler.SingleThreadedExecutor;
import service.excel.impl.WorkbookWrapper;
import service.excel.impl.WorkbookWrapperFactory;
import service.trait.ITraitService;
import service.trait.excel.TraitsExportService;
import service.trait.excel.TraitsImportService;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import settings.user.UserOptions;
import tasks.TraitRebuildTask;
import utils.ExcelUtils;
import utils.JsonResult;
import utils.PladiasStringUtils;
import utils.SessionUtils;
import utils.UserUtils;
import views.utils.SectionUtils;

public class TraitsController extends ControllerBase
{
	private static final int SheetId = 0;
	private static final int MaxSourceLen = 150;

	//private static final String ValidationAction = "validation";
	private static final String ImportAction = "import";
	private static final String ValidationAction = "validation";

	private static final String ExcelDatatypeDefinitionId = "data";
	private static final String AttachmentId = "attachment";

	private final Logger logger = LoggerFactory.getLogger(TraitsController.class);

	@Inject
	private ITraitService traitService;

	@Inject
	private SingleThreadedExecutor singleThreadedExecutor;

	@Inject
	private FormFactory formFactory;

	@Inject
	MailService mailService;

	@Inject
	private ITraitRepository traitRepository;


	public static class TraitsFormInfo
	{
		@Required
		public Long owner;
		@Required
		public Integer featureId;
		public String source;
		public String descriptionCz;
		public String descriptionEn;
		public Integer visibility;
		public String operation;
		public Long getOwner() {
			return owner;
		}
		public void setOwner(Long owner) {
			this.owner = owner;
		}
		public Integer getFeatureId() {
			return featureId;
		}
		public void setFeatureId(Integer featureId) {
			this.featureId = featureId;
		}
		public String getSource() {
			return source;
		}
		public void setSource(String source) {
			this.source = source;
		}
		public String getDescriptionCz() {
			return descriptionCz;
		}
		public void setDescriptionCz(String descriptionCz) {
			this.descriptionCz = descriptionCz;
		}
		public String getDescriptionEn() {
			return descriptionEn;
		}
		public void setDescriptionEn(String descriptionEn) {
			this.descriptionEn = descriptionEn;
		}
		public Integer getVisibility() {
			return visibility;
		}
		public void setVisibility(Integer visibility) {
			this.visibility = visibility;
		}
		public String getOperation() {
			return operation;
		}
		public void setOperation(String operation) {
			this.operation = operation;
		}
	}

	@Security.Authenticated(Authorized.class)
	//@BodyParser.Of(value = BodyParser.MultipartFormData.class, maxLength = 1024*1024*10)
	//TODO change final destination for React!
	public  Result importResult(Http.Request request)
	{
		Session session = request.session();
		Messages messages = getMessages(request);
		Form<TraitsFormInfo> form = formFactory.form(TraitsFormInfo.class).bindFromRequest(request);

		if (form.hasErrors() || !validateRequest(form.get()))
		{
			String featureIdValue  = form.rawData().get("featureId");
			int featureId = Integer.parseInt(featureIdValue);
            return notFound(JsonResult.error(messages.at("TraitsController.FormContainsErrors")));

        }

		TraitsFormInfo traitInfo = form.get();

		Feature feature = Feature.find().byId(traitInfo.featureId);
		User currentUser = SessionUtils.getCurrentUser(session);
		if (!UserUtils.isElligibleForTraitImport(currentUser, feature))
		{
            return notFound(JsonResult.error(messages.at("TraitsController.UserNotElligible")));
		}

		if (ValidationAction.equals(traitInfo.operation) &&
			traitInfo.visibility == null)
		{
			//workaround that will not break the following computation
			traitInfo.visibility = VisibilityStatus.TraitAdminAccessId;
		}

		try(Transaction transaction = DB.beginTransaction())
		{
			Trait trait = null;
			boolean isImport = isImport(traitInfo);
			trait = createTrait(request, traitInfo);
			trait.save();
			if (isImport)
			{
				UserActivityService.recordActivity(session, UserActivity.TraitImport);
			}
			else
			{
				UserActivityService.recordActivity(session, UserActivity.TraitValidation);
			}

		    MultipartFormData<TemporaryFile> multipartBody = request.body().asMultipartFormData();
	        FilePart<TemporaryFile> filePart = multipartBody.getFile(ExcelDatatypeDefinitionId);
	        UploadedFile uploadedFile = new UploadedFile(filePart);
	        WorkbookWrapper wbWrapper = WorkbookWrapperFactory.createAndDelete(uploadedFile);
	    	TraitsImportService importService = getImportService(session, traitInfo.featureId, trait);

			Sheet sheet = wbWrapper.getWorkbook().getSheetAt(SheetId);
            boolean validated = importService.validate(wbWrapper, sheet);

			if (!validated || !isImport)
			{
				trait.delete();
			}

			if (!validated)
			{
			    models.TemporaryFile annotatedWorkbook = serializeWorkbook(wbWrapper);
                String url = controllers.common.routes.TemporaryFilesProviderController.download(annotatedWorkbook.getId()).absoluteURL(request, ProjectConstants.UseHttps);


                String message = isImport
						? messages.at("TraitsController.ImportFailed", url)
						: messages.at("TraitsController.ValidationFailed", url);
				transaction.commit();

                return notFound(JsonResult.error(message));
			}
			else
			{
				if (trait != null && isImport)
				{
					List<Model> data = importService.getDatatypes();
					int totalTaxonCount = importService.getTaxonCount();
					trait.setTotalTaxonCount(totalTaxonCount);
					trait.save();

					List<ValueComment> comments = importService.getComments();
					DB.insertAll(data);
					DB.insertAll(comments);
				}

				if (validated && isImport)
				{
					//induce population of complex-export tables
					logger.info("About to populate complex export table");
					traitService.recomputeTraitValues(trait);
					logTraitUploaded(session);

				}
				transaction.commit();

				String message = isImport
						? messages.at("TraitsController.ImportSucceeded", Integer.toString(importService.getDatatypes().size()))
						: messages.at("TraitsController.ValidationSucceeded");

                return ok(Json.toJson(message));
			}
		}
		catch (Exception e)
		{
			logger.error("Trait Validation/Import failed", e);
            return notFound(JsonResult.error("Import/validation failed: "+ e.getMessage()));
		}
	}

	private void logTraitUploaded(Session session)
	{
		ActivityDetails details  = new ActivityDetails();
		details.description = String.format("Trait uploaded");
		UserActivityService.recordActivity(session, UserActivity.ComplexTraitDownload, details);
		logger.info("Complex export table populated");
	}

	private static boolean validateRequest(TraitsFormInfo traitInfo) {
		if (ImportAction.equals(traitInfo.operation) && traitInfo.visibility == null)
		{
			return false;
		}
		return true;
	}

	private  models.TemporaryFile serializeWorkbook(WorkbookWrapper wbWrapper) throws IOException {
	    models.TemporaryFile tempFile = new models.TemporaryFile();
		tempFile.setData(ExcelUtils.serializeWorkbook(wbWrapper.getWorkbook()));
		tempFile.setFilename(wbWrapper.getFilename());
		String extension = FilenameUtils.getExtension(wbWrapper.getFilename()).toLowerCase();
		tempFile.setExtension(extension);
		tempFile.save();
		return tempFile;
	}

	private  TraitsImportService getImportService(Session session, int featureId, Trait trait) throws Exception
	{
		Feature feature = Feature.find().byId(featureId);
		UserOptions userOptions = new UserOptions(SessionUtils.getCurrentUser(session));
		TraitsImportService importService = new TraitsImportService(
				feature,
				trait != null ? trait.getId() : -1,
				userOptions,
				getMessages(session));
		return importService;
	}

	private  Trait createTrait(Http.Request request, TraitsFormInfo traitInfo) throws IOException {
		Trait t = new Trait();
		t.setDescriptionCz(traitInfo.descriptionCz);
		t.setDescriptionEn(traitInfo.descriptionEn);
		Feature f = Feature.find().byId(traitInfo.featureId);
		t.setFeature(f);
		t.setVisibilityStatus(VisibilityStatus.find().byId(traitInfo.visibility));
		if (f.getSubordinateTraits().isEmpty())
		{
			t.setDefault(true);
		}
		t.setOwner(User.find().byId(traitInfo.owner));
		t.setSource(traitInfo.source);
		collectAttachment(request, traitInfo, t);
		return t;
	}

	private  boolean isImport(TraitsFormInfo traitInfo)
	{
		return ImportAction.equals(traitInfo.operation);
	}

	private  void collectAttachment(Http.Request request, TraitsFormInfo traitInfo, Trait trait) throws IOException {
	    Messages messages = getMessages(request);
	    MultipartFormData<TemporaryFile> body = request.body().asMultipartFormData();
        FilePart<TemporaryFile> filePart = body.getFile(AttachmentId);

        if (filePart != null)
		{
            UploadedFile uploadedFile = new UploadedFile(filePart);
			ExcelHelper.verifyExcelFilename(uploadedFile.getName(), messages);
			FileInputStream fis = new FileInputStream(uploadedFile.getFile());
			trait.setAttachment(IOUtils.toByteArray(fis));
			fis.close();
			trait.setAttachmentType(getAttachmentTypeFromFilename(uploadedFile.getName()));
			uploadedFile.delete();
		}
	}

	private  String getAttachmentTypeFromFilename(String filename)
	{
		String extension = FilenameUtils.getExtension(filename);
		if (extension != null)
			extension = extension.toLowerCase();

		return extension;
	}

	@Security.Authenticated(Authorized.class)
	public  Result setDefault(Http.Request request, int traitId)
	{
		Messages messages = getMessages(request);
		Trait trait = Trait.find().byId(traitId);
		if (trait == null)
			return ok(JsonResult.error(messages.at("TraitsController.TraitDoesNotExits")));

		User currentUser = SessionUtils.getCurrentUser(request.session());
		if (!currentUser.isTraitAdmin() && currentUser.equals(trait.getFeature().getAdmin()))
		{
			return ok(JsonResult.error(messages.at("TraitsController.UserNotElligible")));
		}

		Feature f = trait.getFeature();
		List<Trait> traits = f.getSubordinateTraits();

		for (Trait t : traits)
		{
			t.setDefault(false);
		}
		trait.setDefault(true);

		try(Transaction transaction = DB.beginTransaction())
		{
			DB.saveAll(traits);
			DB.save(trait);
			transaction.commit();
		}
		catch (Exception e)
		{
			logger.error("Unable to set default trait", e);
			return ok(JsonResult.error(messages.at("TraitsController.UnableToSetDefaultTrait")));
		}

		return ok(JsonResult.buildSuccess());
	}

	@Security.Authenticated(Authorized.class)
	public  Result delete(Http.Request request, int traitId)
	{
		Trait trait = Trait.find().byId(traitId);
		Feature feature = trait.getFeature();
		User user = SessionUtils.getCurrentUser(request.session());
		Messages messages = getMessages(request);

		if (UserUtils.isElligibleForTraitDeletion(user, feature))
		{
			trait.setDeleted(true);
			boolean isDefault = trait.isDefault();

			try
			{
				trait.setDefault(false);
				trait.save();
				if (isDefault)
				{
					assignNewDefaultTrait(feature.getId());
				}
                return ok(Json.toJson(messages.at("TraitsController.traitDeleted")));

			}
			catch (Exception e)
			{
                return notFound(JsonResult.error(messages.at("TraitsController.deletionFailed")));
			}
		}
		else
		{
            return notFound(JsonResult.error(messages.at("TraitsController.UserNotElligible")));

		}
	}

	private  void assignNewDefaultTrait(int featureId)
	{
		Trait newDefault = null;

		newDefault = Trait.find().query().where()
				.eq("feature.id", featureId)
				.eq("deleted", false)
				.orderBy("id asc")
				.setMaxRows(1)
				.findOne();
		if (newDefault!= null)
		{
			newDefault.setDefault(true);
			newDefault.save();
		}
	}

	@Security.Authenticated(Authorized.class)
	public Result recomputeTraits(Http.Request request)
	{
        Messages messages = getMessages(request);
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (!currentUser.isTraitAdmin())
        {
            return notFound(JsonResult.error(messages.at("TraitsController.UserNotElligible")));
        }

        TraitRebuildTask rebuildTask = new TraitRebuildTask(currentUser, traitRepository, traitService, mailService, messages);

        try
        {
            singleThreadedExecutor.register(() -> rebuildTask.execute());
        }
        catch (Exception e)
        {
            return internalServerError(e.getMessage());
        }
        return ok(Json.toJson(messages.at("TraitsController.RecomputationStarted")));

	}

	@Security.Authenticated(Authorized.class)
	public  Result downloadAttachment(int traitId)
	{
		try
		{
			Trait trait = Trait.find().byId(traitId);
			byte[] data = trait.getAttachment();
			if (data == null)
			{
				return ok();
			}
            //use cs locale until a new requirement comes up
			Locale locale = Locale.forLanguageTag("cs");
			String filename = buildTraitExcelFilename(trait, locale, true);
	        return ok(data)
	        	.withHeader("Content-disposition", String.format("attachment; filename=%s", filename))
	        	.as("application/x-download");
		}
		catch (Exception e)
		{
			logger.error("error during trait attachment export:", e);
			return ok("export se nezdaril");
		}
	}

	//this method is intentionally NOT secured with authentication - as it is accessed from pladias.cz
	public  Result downloadTraitDataByFeature(Http.Request request, int featureId, String language)
	{
		Feature feature = Feature.find().byId(featureId);
		Messages messages = getMessages(request);

		if (feature == null)
		{
			return ok(messages.at("TraitsController.InvalidFeature"));
		}

		Locale locale = new Locale.Builder().setLanguageTag(language).build();
		List<Trait> traits = feature.getSubordinateTraits();
		Trait candidate = findTraitCandidate(traits);

		if (candidate == null)
		{
			return ok(messages.at("TraitsController.NoSuitableTraitFound"));
		}
		return doDownloadTraitData(request, candidate, null, locale);
	}

	private Trait findTraitCandidate(List<Trait> traits)
	{
		Trait candidate = null;
		for (Trait t : traits)
		{
			if (t.getVisibilityStatus().getId() != VisibilityStatus.PublicAccessId ||
				t.isDeleted())
			{
				continue;
			}

			if (t.isDefault())
			{
				candidate = t;
				break;
			}
			else if (candidate == null)
			{
				//we always prefer default trait to others
				candidate = t;
			}

		}
		return candidate;
	}

	@Security.Authenticated(Authorized.class)
	public  Result downloadTraitData(Request request, int traitId, String language)
	{
		Trait trait = Trait.find().byId(traitId);
		Messages messages = getMessages(request);

		Locale lang = Locale.forLanguageTag(language);

		User currentUser = SessionUtils.getCurrentUser(request.session());

		if (!UserUtils.isElligibleForTraitDownload(currentUser, trait))
		{
			return ok(JsonResult.error(messages.at("TraitsController.UserNotElligible")));
		}

		return doDownloadTraitData(request, trait, currentUser, lang);
	}

	private  Result doDownloadTraitData(Request request, Trait trait, User user, Locale locale)
	{
		try
		{
			Feature feature = trait.getFeature();
			UserOptions options = new UserOptions(user);
			Messages messages = getMessages(request);
			TraitsExportService exportService = new TraitsExportService(trait, options, messages, locale);
			if (user != null)
			{
				ActivityDetails details  = new ActivityDetails();
				details.description = String.format("trait #%d, '%s', feature #%d, '%s'",
						trait.getId(),
						StringUtils.isNotBlank(trait.getDescriptionEn()) ?
						StringUtils.abbreviate(trait.getDescriptionEn(), MaxSourceLen) :
						"",
						feature.getId(),
						feature.getNameEn());

				UserActivityService.recordActivity(request.session(), UserActivity.TraitDownload,
						details);
			}

			String filename = buildTraitExcelFilename(trait, locale, false);
	        return ok(exportService.doExport())
	        	.withHeader("Content-disposition", String.format("attachment; filename=%s", filename))
	        	.as("application/x-download");
		}
		catch (Exception e)
		{
			logger.error("error during trait export:", e);
			return ok("export se nezdaril");
		}
	}

	private  String escape(String s)
	{
		if (s == null)
			return "";

		return s.replace(" ", "_").replace(",", "_");
	}

	private  String buildTraitExcelFilename(Trait trait, Locale locale, boolean isAttachment)
	{
		boolean isEnglish = Locale.ENGLISH.equals(locale);
		Feature feature = trait.getFeature();
		String featureNameRaw =  isEnglish
				? feature.getNameEn()
				: feature.getNameCz();
		String featureName = escape(featureNameRaw);
		String source = escape(trait.getSource());
		if (StringUtils.isNotEmpty(source) && source.length() > MaxSourceLen)
		{
			source = source.substring(0, MaxSourceLen);
		}
		String filename;
		if (isAttachment) {
			String attachmentText = isEnglish ? "ATTACHMENT" : "PRILOHA";
			filename = String.format("%s_%s.%s", featureName, attachmentText, trait.getAttachmentType());
		}
		else {
			filename = String.format("%s.xlsx", featureName);
		}
		return PladiasStringUtils.normalize(filename);
	}
}
