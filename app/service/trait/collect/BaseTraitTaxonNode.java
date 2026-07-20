package service.trait.collect;

import io.ebean.Model;
import models.Taxon;
import models.traits.Trait;
import service.trait.collect.visitors.INodeVisitor;

import java.util.ArrayList;
import java.util.List;

abstract public class BaseTraitTaxonNode {
    protected Trait trait;
    protected Taxon taxon;
    protected BaseTraitTaxonNode parent;
    protected List<BaseTraitTaxonNode> children;

    public BaseTraitTaxonNode(Trait trait, Taxon taxon) {
        this.trait = trait;
        this.taxon = taxon;
        children = new ArrayList<BaseTraitTaxonNode>();
    }

    public Trait getTrait() {
        return trait;
    }

    public Taxon getTaxon() {
        return taxon;
    }

    public BaseTraitTaxonNode getParent() {
        return parent;
    }

    public void addChild(BaseTraitTaxonNode child) {
        child.parent = this;
        children.add(child);
    }

    public List<BaseTraitTaxonNode> getChildren() {
        return new ArrayList<BaseTraitTaxonNode>(children);
    }

    public abstract void accept(INodeVisitor visitor);

    public abstract List<Model> getComputedEntities() throws Exception;
}
