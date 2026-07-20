package app.dto.atlas;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for PublicationStatus entity.
 */
public class PublicationStatusDto {

    @JsonProperty("id")
    private int id;

    @JsonProperty("description")
    private String description;

    public PublicationStatusDto() {
    }

    public PublicationStatusDto(int id, String description) {
        this.id = id;
        this.description = description;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
