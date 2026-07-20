package service.trait.collect;

import io.ebean.Model;
import models.Taxon;
import models.traits.BoolDatatype;
import models.traits.DatatypePK;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import service.trait.collect.visitors.INodeVisitor;

import java.util.ArrayList;
import java.util.List;


/*•	povolené datové typy traitů: boolean
  •	agregace: z potomků na rodiče se přenášejí obě hodnoty, ve výpisu budou dva sloupce (TRUE/FALSE) a v nich 1/0 info zda tu hodnotu má.
  •	dědění: prázdní potomci přebírají hodnotu nejbližšího rodiče
*/
public class BoolTraitTaxonNode extends BaseTraitTaxonNode {

    private final Boolean[] aggregated = new Boolean[2];
    private Boolean inherited = null;
    private final BoolDatatype datatype;

    public BoolTraitTaxonNode(Trait trait, Taxon taxon, BoolDatatype originalValue) {
        super(trait, taxon);
        this.datatype = originalValue;
    }

    public Boolean getOriginalValue() {
        return (datatype != null ? datatype.isValue() : null);
    }

    public Boolean getInherited() {
        return inherited;
    }

    public void setInherited(boolean value) {
        inherited = value;
    }

    public Boolean[] getAggregated() {
        return aggregated;
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

    @Override
    public List<Model> getComputedEntities() {
        List<Model> result = new ArrayList<Model>();

        for (int i = 0; i < aggregated.length; i++) {
            if (aggregated[i] != null) {
                result.add(createDetail(TraitDetailsEntryType.Aggregated, aggregated[i]));
            }
        }

        if (inherited != null) {
            result.add(createDetail(TraitDetailsEntryType.Inherited, inherited));
        }

        Boolean composedValue = computeComposedValue();
        if (composedValue != null) {
            result.add(createDetail(TraitDetailsEntryType.Composite, composedValue));
        }

        return result;
    }

    private Boolean computeComposedValue() {
        if (datatype != null)
            return datatype.isValue();

        if (aggregated[0] != null && aggregated[1] != null) //both are non-null
        {
            return (aggregated[0] || aggregated[1]);
        } else if (aggregated[0] != null) //only one is non-null
        {
            return aggregated[0];
        } else if (aggregated[1] != null) {
            return aggregated[1];
        }

        return inherited;
    }

    private Model createDetail(TraitDetailsEntryType entryType, boolean value) {
        BoolDatatype boolDatatype = new BoolDatatype();
        DatatypePK pk = new DatatypePK();
        pk.entryType = entryType.getIndex();
        pk.setTraitId(trait.getId());
        pk.setTaxonId(taxon.getId());
        boolDatatype.setValue(value);
        boolDatatype.setDatatypePk(pk);
        return boolDatatype;
    }

}
