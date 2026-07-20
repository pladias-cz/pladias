package app.dto.atlas;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO for RecordOriginalityStatus entity.
 */
public class RecordOriginalityStatusDto {

    @JsonProperty("id")
    private int id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("icon")
    private String icon;

    @JsonProperty("priority")
    private int priority;

    public RecordOriginalityStatusDto() {
    }

    public RecordOriginalityStatusDto(int id, String name, String icon, int priority) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.priority = priority;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }
}
