package service.trait.collect;

import models.Taxon;
import models.traits.Trait;
import service.trait.collect.visitors.INodeVisitor;

import java.util.Collection;

public class BasicTraitTaxonNode<T> extends MultiValueTraitTaxonNodeBase<T> {

    public BasicTraitTaxonNode(Trait trait, Taxon taxon, Collection<T> values) {
        super(trait, taxon, values);
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

}
