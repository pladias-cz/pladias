package app.dto.atlas;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for RecordValidationStatus entity.
 */
public class RecordValidationStatusDto {

    @JsonProperty("id")
    private int id;

    @JsonProperty("description")
    private String description;

    @JsonProperty("color")
    private String color;

    @JsonProperty("priority")
    private int priority;

    public RecordValidationStatusDto() {
    }

    public RecordValidationStatusDto(int id, String description, String color, int priority) {
        this.id = id;
        this.description = description;
        this.color = color;
        this.priority = priority;
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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }
}
