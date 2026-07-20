package dto;

public record DownloadDto(
    String description,
    String manager,
    String version,
    String url
) {
}
