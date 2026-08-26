package controllers.measurement;

import controllers.ControllerBase;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import javax.inject.Inject;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import controllers.security.Authorized;
import exceptions.NotEligibleException;
import models.Taxon;
import models.TaxonRank;
import models.User;
import models.UserActivity;
import models.traits.InheritanceType;
import models.traits.Section;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Http.Request;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import service.trait.comparator.TraitComparator;
import service.trait.export.TraitExportRequest;
import service.trait.export.TraitExportResponse;
import service.trait.export.TraitExportService;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import taxons.config.TaxonConfiguration;
import utils.SessionUtils;
import utils.TaxonRanksUtils;
import utils.UserUtils;
import views.utils.SectionUtils;

@Security.Authenticated(Authorized.class)
public class TraitExportController extends TraitBaseController
{
    final Logger logger = LoggerFactory.getLogger(TraitExportController.class);

    @Inject
    private TaxonConfiguration taxonConfiguration;

	public Result exportTrait(Request request, Integer traitId) throws Exception
	{
		Messages messages = getMessages(request);
		Trait trait = Trait.find().byId(traitId);
		if (trait==null)
		{
			return badRequest("Trait not found");
		}
		if (!isInheritanceTypeSupported(trait))
		{
			return badRequest("Trait type not supported");
		}
		Session session = request.session();
		User user = SessionUtils.getCurrentUser(session);
		if (!UserUtils.isElligibleForTraitDownload(user, trait))
		{
			return badRequest(messages.at("TraitsController.UserNotElligible"));
		}

		TraitExportResponse traitDetails = buildExport(session, trait);
		return toResult(traitDetails);
	}

	private TraitExportResponse buildExport(Session session, Trait trait) throws Exception {
		User currentUser = SessionUtils.getCurrentUser(session);
		Messages messages = getMessages(session);

		TraitExportService exportService = new TraitExportService(messages, currentUser, trait);
		return exportService.buildDetailedExport();
	}

	private boolean isInheritanceTypeSupported(Trait trait) {

		int inheritanceType = trait.getFeature().getInheritanceType().getId();

		return inheritanceType == InheritanceType.EnumAdditive ||
				inheritanceType == InheritanceType.EnumSingle ||
				inheritanceType == InheritanceType.EnumStandard ||
				inheritanceType == InheritanceType.Month ||
				inheritanceType == InheritanceType.Bool ||
				inheritanceType == InheritanceType.Basic ||
				inheritanceType == InheritanceType.Numeric ||
				inheritanceType == InheritanceType.IntervalShallow ||
				inheritanceType == InheritanceType.IntervalDeep ||
				inheritanceType == InheritanceType.EnumSyntaxon ||
				inheritanceType == InheritanceType.Distribution;
	}
}
