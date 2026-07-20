package controllers.react;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import geom.Coordinates;
import helpers.parsers.CoordinatesParser;
import models.*;
import org.apache.commons.lang3.tuple.Pair;
import platform.ProjectConstants;
import play.Logger;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.taxon.TaxonSearchService;
import service.taxon.TaxonSerializationService;

import javax.inject.Inject;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;


@Security.Authenticated(Authorized.class)
public class ModelDataSourceController extends ControllerBase {
    private final static List<TaxonSynonym> EmptySynonymList = new ArrayList<TaxonSynonym>();

    @Inject
    private FormFactory formFactory;

    @Inject
    private IConfigService _configService;

    public Result getTaxonDetails(Http.Request request) {
        List<Taxon> taxons = Taxon.find().query().orderBy("lft").findList();
        Messages messages = getMessages(request);
        try {
            byte[] data = TaxonSerializationService.serialize(taxons);
            String filename = String.format("attachment; filename=%s", "taxonList.csv");
            return ok(data)
                .withHeader("Content-disposition", filename)
                .as("application/x-download");
        } catch (Exception e) {
            return ok(messages.at("ModelDataSource.taxonDetailsFailed"));
        }

    }

    public Result getTaxonsAndSynonyms(String prefix) {
        List<Taxon> taxons = getTaxonsByPrefix(prefix);
        List<TaxonSynonym> synonyms = TaxonSynonym.find().query().where().istartsWith("name_lat", prefix).findList();

        ArrayNode result = buildJsonForTaxons(taxons, synonyms);
        return ok(result);
    }

    private List<Taxon> getTaxonsByPrefix(String prefix) {
        if (prefix == null || prefix.length() < 2) {
            return new ArrayList<Taxon>();
        } else {
            return TaxonSearchService.getImportableTaxons(prefix);
        }
    }

    public Result getTaxons(String prefix) {
        List<Taxon> taxons = getTaxonsByPrefix(prefix);
        ArrayNode result = buildJsonForTaxons(taxons, EmptySynonymList);
        return ok(result);
    }

    public Result getTaxonsInclGenus(String prefix) {
        if (prefix == null || prefix.length() < 2) {
            return ok(Json.newObject().arrayNode());
        }
        List<Taxon> taxons = TaxonSearchService.getEditableTaxonsForRevisors(prefix);
        ArrayNode result = buildJsonForTaxons(taxons, EmptySynonymList);
        return ok(result);
    }

    public Result getTaxonsAll(String prefix) {
        if (prefix == null || prefix.length() < 2) {
            return ok(Json.newObject().arrayNode());
        }
        List<Taxon> taxons = TaxonSearchService.getAllTaxonsWithPrefix(prefix);
        ArrayNode result = buildJsonForTaxons(taxons, EmptySynonymList);
        return ok(result);
    }

    public Result getTaxaForRevisor(String prefix) {
        if (_configService.getBoolean(ProjectConstants.AllTaxaForRevisorKey)) {
            return getTaxonsAll(prefix);
        }
        return getTaxonsInclGenus(prefix);
    }

    private ArrayNode buildJsonForTaxons(List<Taxon> taxons, List<TaxonSynonym> synonyms) {
        ArrayNode result = Json.newObject().arrayNode();
        for (Taxon taxon : taxons) {
            ObjectNode o = Json.newObject();
            o.put("value", taxon.getNameLat());
            o.put("label", taxon.getNameLat());
            o.put("id", taxon.getId());
            o.put("isSynonym", false);
            result.add(o);
        }
        for (TaxonSynonym synonym : synonyms) {
            ObjectNode o = Json.newObject();
            o.put("value", synonym.getNameLat());
            o.put("label", synonym.getNameLat());
            o.put("id", synonym.getTaxon().getId()); //id of referenced taxon
            o.put("isSynonym", true);
            result.add(o);
        }
        return result;
    }

    public Result getProjects(String institutionId) {
        Institution institution = Institution.find().query().where().eq("id", institutionId).findOne();
        List<Project> projects = null;
        if (institution != null) {
            projects = institution.getProjects();
        } else {
            projects = Project.find().all();
        }

        projects.sort((o1, o2) -> Normalizer.normalize(o1.getName(), Normalizer.Form.NFD).compareTo(Normalizer.normalize(o2.getName(), Normalizer.Form.NFD)));


        ArrayNode result = Json.newObject().arrayNode();
        for (Project project : projects) {
            ObjectNode o = Json.newObject();
            o.put("name", project.getName());
            o.put("id", project.getId());
            result.add(o);
        }

        return ok(result);
    }

    public Result getInstitutions() {
        List<Institution> institutions = Institution.find().query().orderBy("name").findList();
        ArrayNode result = Json.newObject().arrayNode();
        for (Institution institution : institutions) {
            ObjectNode o = Json.newObject();
            o.put("name", institution.getName());
            o.put("id", institution.getId());
            result.add(o);
        }
        return ok(result);
    }

    public Result coordsToDD(Http.Request request) {

        ObjectNode result = Json.newObject();

        Form<RawCoordsForm> rawCoords = formFactory.form(RawCoordsForm.class).bindFromRequest(request);
        if (rawCoords.hasErrors()) {
            result.put("success", false);
            return ok(result);
        }

        try {
            Pair<Double, Double> lonLat = CoordinatesParser.parse(rawCoords.get().coords, getMessages(request));
            result.put("success", true);
            result.put("lon", lonLat.getLeft());
            result.put("lat", lonLat.getRight());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "unsupported coords format");
        }
        return ok(result);
    }

    public Result getReverseGeocoding(Double longitude, Double latitude, Integer bufferMeters) {
        try {
            Coordinates coords = Coordinates.of(longitude, latitude);
            QuadrantNew q = QuadrantNew.findByPoint(coords);
            List<District> districtHierarchy = District.findTownHierarchyByPoint(coords);
            District district = District.findDistrictByPoint(coords);
            Set<Phytochorion> phytochorions = Phytochorion.findByBuffer(coords, bufferMeters);

            ArrayNode result = Json.newObject().arrayNode();

            //overall result - false iff district == 0 (coords seem to be outside of mapped are)
            ObjectNode o = Json.newObject();
            o.put("success", Json.toJson(district != null));
            result.add(o);

            //quadrant
            o = Json.newObject();
            o.put("quadrant", Json.toJson(q));
            result.add(o);

            //district
            o = Json.newObject();
            o.put("district", Json.toJson(district));
            result.add(o);

            //districtHierarchy
            ArrayNode townArray = Json.newObject().arrayNode();
            for (District d : districtHierarchy) {
                o = Json.newObject();
                o.put("town", Json.toJson(d));
                townArray.add(o);
            }
            o = Json.newObject();
            o.put("townHierarchy", townArray);
            result.add(o);

            //phytochorions
            ArrayNode phytos = Json.newObject().arrayNode();
            for (Phytochorion p : phytochorions) {
                o = Json.newObject();
                o.put("phytochorion", Json.toJson(p));
                phytos.add(o);
            }
            o = Json.newObject();
            o.put("phytochorions", phytos);
            result.add(o);

            return ok(result);
        } catch (Exception e) {
            Logger.error("Unable to provide reverse geocoding", e);
        }
        return ok();
    }

    public static class RawCoordsForm {
        @Required
        public String coords;

        public String getCoords() {
            return coords;
        }

        public void setCoords(String coords) {
            this.coords = coords;
        }
    }
}
