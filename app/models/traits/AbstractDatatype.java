package models.traits;

import io.ebean.*;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.MappedSuperclass;

@MappedSuperclass
@SuppressWarnings("serial")
public class AbstractDatatype extends Model {
    @EmbeddedId
    private DatatypePK datatypePk;


    public AbstractDatatype() {
    }

    public DatatypePK getDatatypePk() {
        return datatypePk;
    }

    public void setDatatypePk(DatatypePK pk) {
        this.datatypePk = pk;
    }
}
