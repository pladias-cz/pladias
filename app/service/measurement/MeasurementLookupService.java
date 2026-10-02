package service.measurement;

import dto.EnumerateValueDto;
import dto.MeasurementFeatureDto;
import dto.MeasurementFeatureGroupDto;
import dto.MeasurementTraitDto;
import dto.TraitAggregationTypeDto;
import dto.TraitDatatypeDto;
import models.User;
import models.traits.Datatype;
import models.traits.EnumerateValue;
import models.traits.Feature;
import models.traits.InheritanceType;
import models.traits.Section;
import models.traits.Trait;
import models.traits.VisibilityStatus;
import models.traitsExport.TraitDetailsEntryType;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Read-only data of the measurements module: reference lists, features and trait listings.
 * All methods return DTOs ready to be serialized for the React UI.
 */
public class MeasurementLookupService {

    public List<TraitAggregationTypeDto> getAggregationTypes() {
        return InheritanceType.find().query()
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
    }

    public List<TraitDatatypeDto> getDatatypes() {
        return Datatype.find().query()
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
    }

    public List<VisibilityStatus> getVisibilityStatuses() {
        return VisibilityStatus.find().query()
            .orderBy("id")
            .findList();
    }

    public List<MeasurementFeatureGroupDto> getFeatureGroups() {
        return Section.find().query()
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
    }

    public List<MeasurementFeatureDto> getFeaturesOfGroup(int groupId) {
        return Feature.find().query()
            .fetch("section")
            .where()
            .eq("section.id", groupId)
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
    }

    /**
     * @return feature data or null when there is no such feature
     */
    public MeasurementFeatureDto getFeature(int featureId) {
        Feature t = Feature.find().byId(featureId);
        if (t == null) {
            return null;
        }

        return new MeasurementFeatureDto(
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
    }

    public List<EnumerateValueDto> getEnumerateValues(int enumerateId) {
        return EnumerateValue.find().query()
            .where()
            .eq("enumerate_id", enumerateId)
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
    }

    public List<MeasurementTraitDto> getTraitsOfFeature(User currentUser, int featureId) {
        return Trait.find().query()
            .where()
            .eq("feature.id", featureId)
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
    }

    public List<Map<String, Object>> getTraitDetailsEntryTypes() {
        return Arrays.stream(TraitDetailsEntryType.values())
            .map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", t.name());
                m.put("index", t.getIndex());
                return m;
            })
            .collect(Collectors.toList());
    }
}
