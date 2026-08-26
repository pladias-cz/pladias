package controllers.measurement;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.*;
import models.User;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import models.traitsExport.TraitExportSnapshot;
import play.mvc.*;
import play.mvc.Security;
import utils.JsonResult;
import utils.SessionUtils;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
public class MeasurementController extends ControllerBase {

    public Result getAggregationTypes() {
        List<TraitAggregationTypeDto> dtos = InheritanceType.find().query()
            .orderBy("key")
            .findList()
            .stream()
            .map(t -> new TraitAggregationTypeDto(
                t.getId(),
                t.getKey(),
                t.getDescription()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }


    public Result getDatatypes() {
        List<TraitDatatypeDto> dtos = Datatype.find().query()
            .orderBy("key")
            .findList()
            .stream()
            .map(t -> new TraitDatatypeDto(
                t.getId(),
                t.getKey(),
                t.getNameCz(),
                t.getDescriptionCz(),
                t.getMultiplicity(),
                t.isDominantValue(),
                t.getFrequency(),
                t.isCommentable(),
                t.isUnmeasurable()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getVisibilityStatus() {
        List<VisibilityStatus> dtos = VisibilityStatus.find().query()
            .orderBy("id")
            .findList();

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeatureGroups() {
        List<MeasurementFeatureGroupDto> dtos = Section.find().query()
            .where()
            .eq("depth", 1)
            .orderBy("lft")
            .findList()
            .stream()
            .map(t -> new MeasurementFeatureGroupDto(
                t.getId(),
                t.getNameCz()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getTraitExportSnapshots() {
        List<TraitExportSnapshotDto> dtos = TraitExportSnapshot.find().query()
            .orderBy("datetime DESC")
            .findList()
            .stream()
            .map(t -> new TraitExportSnapshotDto(
                t.getId(),
                t.getDescription(),
                t.getDatetime()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getTraitsOfFeature(Http.Request request, Integer id) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        List<MeasurementTraitDto> dtos = Trait.find().query()
            .where()
            .eq("feature.id", id)
            .eq("deleted", false)
            .orderBy("id")
            .findList()
            .stream()
            .map(t -> new MeasurementTraitDto(
                t.getId(),
                t.getCreateTimestamp().toInstant().toString(),
                t.getTotalTaxonCount(),
                t.getSource(),
                t.getDescriptionCz(),
                t.getOwner().getFullname(),
                t.getVisibilityStatus().getDescriptionCz(),
                t.hasAttachment(),
                t.isDefault(),
                currentUser.isTraitAdmin() || !t.getVisibilityStatus().isAdmin(),
                currentUser.supervises(t.getFeature()),
                currentUser.isAnalyst()

            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeaturesOfGroup(Integer id) {
        List<MeasurementFeatureDto> dtos = Feature.find().query()
            .fetch("section")
            .where()
            .eq("section.id", id)
            .orderBy("succession")
            .findList()
            .stream()
            .map(t -> new MeasurementFeatureDto(
                t.getId(),
                t.getNameCz(),
                t.getAdmin().getFullname(),
                t.getAdmin().getEmail(),
                t.getExplanationCz(),
                t.getBibliographyCz(),
                t.getDatatype().getId(),
                t.getInheritanceType().getId(),
                t.getEnumerate() != null
                    ? t.getEnumerate().getId()
                    : null,
                t.getMinimum(),
                t.getMaximum(),
                t.getUnit() != null
                    ? t.getUnit().getNameCz()
                    : null,
                t.getSection() != null
                    ? t.getSection().getNameCz()
                    : ""
            ))
            .toList();

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeature(Integer id) {
        Feature t = Feature.find().byId(id);
        if (t == null) {
            return badRequest(JsonResult.error("No feature"));
        }

        MeasurementFeatureDto dto = new MeasurementFeatureDto(
            t.getId(),
            t.getNameCz(),
            t.getAdmin().getFullname(),
            t.getAdmin().getEmail(),
            t.getExplanationCz(),
            t.getBibliographyCz(),
            t.getDatatype().getId(),
            t.getInheritanceType().getId(),
            t.getEnumerate() != null
                ? t.getEnumerate().getId()
                : null,
            t.getMinimum(),
            t.getMaximum(),
            t.getUnit() != null
                ? t.getUnit().getNameCz()
                : null,
            t.getSection() != null
                ? t.getSection().getNameCz()
                : null
        );

        return ok(JsonResult.buildSuccess(dto));

    }


    public Result getEnumerateValues(Integer id) {
        List<EnumerateValueDto> dtos = EnumerateValue.find().query()
            .where()
            .eq("enumerate_id", id)
            .orderBy("succession")
            .findList()
            .stream()
            .map(t -> new EnumerateValueDto(
                t.getId(),
                t.getNameCz(),
                t.getDescriptionCz()

            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getTraitDetailsEntryType() {
        List<Map<String, Object>> values = Arrays.stream(TraitDetailsEntryType.values())
            .map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", t.name());
                m.put("index", t.getIndex());
                return m;
            })
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(values));
    }

}
