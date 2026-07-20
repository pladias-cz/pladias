package service.trait.collect;

import models.Taxon;
import models.traits.Trait;
import service.trait.collect.visitors.INodeVisitor;
import service.trait.excel.TraitDataProviderFactory;

public class EnumSingleTraitTaxonNode extends EnumBaseTraitTaxonNode {
    public EnumSingleTraitTaxonNode(Trait trait, Taxon taxon, TraitDataProviderFactory factory) {
        super(trait, taxon, factory);
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }
}
