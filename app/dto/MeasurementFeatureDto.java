package dto;

public record MeasurementFeatureDto(
    Integer id,
    String name,
    String administrator,
    String email,
    String explanation,
    String bibliography,
    Integer datatype,
    Integer inheritance,
    Integer enumerate,
    Double minimum,
    Double maximum,
    String units,
    String section,
    /** whether the current user is a traitAdmin or the administrator of this feature (user.supervises(feature)) */
    Boolean canAdminister
) {
}
