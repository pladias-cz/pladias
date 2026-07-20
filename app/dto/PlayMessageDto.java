package dto;

public record PlayMessageDto(
    Long id,
    String key,
    String language,
    String value
) {
}
