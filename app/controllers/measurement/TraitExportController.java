package controllers.measurement;

import controllers.ControllerBase;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import utils.JsonResult;
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

import play.data.Form;
import play.data.FormFactory;

@Security.Authenticated(Authorized.class)
public class TraitExportController extends TraitBaseController
{
    final Logger logger = LoggerFactory.getLogger(TraitExportController.class);

    @Inject
    private TaxonConfiguration taxonConfiguration;

	@Inject
	private FormFactory formFactory;
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

		public Result complexExportResult(Http.Request request) throws Exception
    	{
    	     Form<ComplexExportForm> form = formFactory.form(ComplexExportForm.class).bindFromRequest(request);
    	     if (form.hasErrors())
             {
                 return badRequest("Invalid input");
             }
    	     TraitExportRequest exportDetails = getComplexDetailsFromRequest(form.get(), request);
    		 List<String> invalidTaxonNames = selectInvalidTaxonNames(form.get().taxonList);

    		 User currentUser = SessionUtils.getCurrentUser(request.session());

    		 if (!invalidTaxonNames.isEmpty())
    		 {
    			 Messages messages = getMessages(request);
    			 List<Taxon> validTaxons = Taxon.find().query().where().in("id", exportDetails.taxonIdList).orderBy("name_lat").findList();
    			 //TODO return valid and nonvalid taxa names and handle in UI  JsonResult.buildError(validTaxons, invalidTaxonNames, messages));
    			 return badRequest();
    		 }

    		 try
    		 {
    			 Session session = request.session();
    			 verifyUserAllowedToExport(session, exportDetails.traitList);
    			 logComplexExport(session);
    			 TraitExportResponse traitDetails = buildComplexExport(session, exportDetails);
    			 return toResult(traitDetails);
    		 }
    		 catch (Exception e)
    		 {
    		     logger.error("Failure during trait export", e);
    			 return badRequest("Error during trait export");
    		 }
    	}

    	private void logComplexExport(Session session)
    	{
    		ActivityDetails details  = new ActivityDetails();
    		details.description = String.format("Trait complex export");
    		UserActivityService.recordActivity(session, UserActivity.ComplexTraitDownload, details);
    	}

    	public static class ComplexExportForm
        	{
        		private String  taxonList;

        		private String[]  ranks;

        		private Integer[] entryTypes;

        		private boolean suppressedExcluded;

        		public String getTaxonList() {
        			return taxonList;
        		}
        		public void setTaxonList(String taxonList) {
        			this.taxonList = taxonList;
        		}
        		public String[] getRanks() {
        			return ranks;
        		}
        		public void setRanks(String[] ranks) {
        			this.ranks = ranks;
        		}
        		public Integer[] getEntryTypes() {
        			return entryTypes;
        		}
        		public void setEntryTypes(Integer[] entryTypes) {
        			this.entryTypes = entryTypes;
        		}
                public boolean isSuppressedExcluded() {
                    return suppressedExcluded;
                }
                public void setSuppressedExcluded(boolean suppressedExcluded) {
                    this.suppressedExcluded = suppressedExcluded;
                }
        	}

        		private TraitExportRequest getComplexDetailsFromRequest(
            	            ComplexExportForm exportRequest, Http.Request request)
            	{
                    Map<String,String[]> map = request.body().asFormUrlEncoded();
                    String[] traitIds =  map.get("traitIds[]");

                    TraitExportRequest details = new TraitExportRequest();
                    details.taxonIdList = buildTaxonIdList(exportRequest);
                    details.entryTypes = buildEntryTypeSet(exportRequest.entryTypes);
                    details.rankIds = buildRankIdList(exportRequest.ranks);
                    details.traitList = getSortedTraitList(buildTraitIdList(traitIds));
                    return details;
            	}


	private List<Trait> getSortedTraitList(List<Integer> traitIdList) {
		//there is a limitation in Ebean that where().in(...) clause only works correctly with List used within the in(...) clause.
		List<Trait> traitList = Trait.find().query().where().in("id", traitIdList).findList();
		traitList.sort(TraitComparator.INSTANCE);
		return traitList;
	}


    private List<String> selectInvalidTaxonNames(String latinTaxonList) {
		List<String> results = new ArrayList<String>();
		if (StringUtils.isBlank(latinTaxonList))
		{
			return results;
		}
		List<Taxon> taxonList = Taxon.find().all();
		Set<String> taxonSet = new HashSet<String>();
		for (Taxon t : taxonList)
		{
			taxonSet.add(t.getNameLat());
		}

		String[] splittedTaxonNames = latinTaxonList.trim().split("\\r\\n");
		for (String s : splittedTaxonNames)
		{
			if (!taxonSet.contains(s))
				results.add(s);
		}
		return results;
	}

		private void verifyUserAllowedToExport(Session session, List<Trait> traitList) throws NotEligibleException
    	{
    		Messages messages = getMessages(session);
    		User currentUser = SessionUtils.getCurrentUser(session);
    		for (Trait trait : traitList)
    		{
    			if (!UserUtils.isElligibleForTraitDownload(currentUser, trait))
    			{
    				String featureName = trait.getFeature().getNameCz() != null
    									 ? trait.getFeature().getNameCz()
    									 : trait.getFeature().getNameEn();
    				String message = messages.at("TraitExportController.userNotElligibleToExportTrait", featureName);
    				throw new NotEligibleException(message);
    			}
    		}
    	}


	private List<Integer> buildRankIdList(String[] ranks) {
		if (ranks == null || ranks.length == 0)
		{
			return TaxonRanksUtils.getExportableRankIds();
		}
		List<Integer> rankIdList = TaxonRank.find().query().where().in("nameEng", Arrays.asList(ranks)).findIds();
		return rankIdList;
	}

	private List<Integer> buildTraitIdList(String[] traitIds) {
		return Arrays.asList(traitIds).stream().map(Integer::parseInt).collect(Collectors.toList());
	}

	private List<Integer> buildTaxonIdList(ComplexExportForm exportInfo) {

        String latinTaxonList = exportInfo.taxonList;

	    if (StringUtils.isBlank(latinTaxonList))
		{
			return  taxonConfiguration.getTaxonIds(exportInfo.isSuppressedExcluded());
		}

		String[] splittedTaxonNames = latinTaxonList.trim().split("\\r\\n");
	    return taxonConfiguration.getTaxonIds(
	            Arrays.asList(splittedTaxonNames),
	            exportInfo.isSuppressedExcluded());
	}

		private Set<TraitDetailsEntryType> buildEntryTypeSet(Integer[] entryTypes) {
    		if (entryTypes == null || entryTypes.length == 0)
    		{
    			return new HashSet<TraitDetailsEntryType>(
    					Arrays.asList(
    							TraitDetailsEntryType.Original,
    							TraitDetailsEntryType.Inherited,
    							TraitDetailsEntryType.Aggregated)
    			);
    		}

    		Set<TraitDetailsEntryType> resultSet = new HashSet<TraitDetailsEntryType>();
    		for (int e : entryTypes)
    		{
    			resultSet.add(TraitDetailsEntryType.make(e));
    		}
    		return resultSet;
    	}
}
