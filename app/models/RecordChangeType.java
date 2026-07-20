package models;

import io.ebean.annotation.EnumValue;

public enum RecordChangeType {
    @EnumValue("location")
    LOCATION,

    @EnumValue("description")
    DESCRIPTION,

    @EnumValue("flag")
    FLAG,

    @EnumValue("comment")
    COMMENT,

    @EnumValue("taxon")
    TAXON
}
