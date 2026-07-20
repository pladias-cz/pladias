package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.UserMinimalDto;
import dto.atlas.TaxonStatisticsDto;
import models.Taxon;
import models.User;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.taxon.ITaxonService;
import utils.JsonResult;

import javax.inject.Inject;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Controller for managing taxon statistics in the Atlas module.
 * Provides endpoints for retrieving taxon statistics information.
 */
@Security.Authenticated(Authorized.class)
public class TaxonStatisticsController extends ControllerBase {

    @Inject
    private ITaxonService taxonService;

    /**
     * Get statistics for a specific taxon by ID.
     * Only accessible by authorized users.
     *
     * @param request HTTP request
     * @param taxonId The ID of the taxon to get statistics for
     * @return JSON response with taxon statistics DTO
     */
    public Result getInfo(Http.Request request, Long taxonId) {
        Taxon taxon = Taxon.find().byId(taxonId);

        if (taxon == null) {
            return badRequest(JsonResult.buildError("Taxon not found with id: " + taxonId));
        }

        Set<User> supervisors = taxonService.getInheritedRevisors(taxon);
        List<UserMinimalDto> supervisorsDto = supervisors.stream()
            .map(UserMinimalDto::fromUser)
            .collect(Collectors.toList());

        TaxonStatisticsDto statsDto = TaxonStatisticsDto.fromTaxonStatistics(taxon.getStatistics(), supervisorsDto);
        return ok(JsonResult.buildSuccess(statsDto));
    }
}
