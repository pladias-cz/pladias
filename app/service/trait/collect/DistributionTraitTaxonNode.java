package service.trait.collect;

import com.google.common.collect.Sets;
import io.ebean.Model;
import models.Taxon;
import models.traits.DistributionDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import service.trait.collect.visitors.INodeVisitor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DistributionTraitTaxonNode extends BaseTraitTaxonNode {

    private final DistributionDetails aggregated = new DistributionDetails();
    private final DistributionDetails inherited = new DistributionDetails();
    private final DistributionDetails originalValues = new DistributionDetails();

    public DistributionTraitTaxonNode(Trait trait, Taxon taxon) {
        super(trait, taxon);
    }

    @Override
    public void accept(INodeVisitor visitor) {
        visitor.visit(this);
    }

    @Override
    public List<Model> getComputedEntities() throws Exception {
        List<Model> result = new ArrayList<Model>();

        result.add(createEntity(TraitDetailsEntryType.Original, originalValues));
        result.add(createEntity(TraitDetailsEntryType.Inherited, inherited));
        result.add(createEntity(TraitDetailsEntryType.Aggregated, aggregated));
        result.add(createEntity(TraitDetailsEntryType.Composite, computeCompositeDetails()));

        return result;
    }

    private boolean isUniqueChild(BaseTraitTaxonNode child) {
        BaseTraitTaxonNode parent = child.getParent();
        return (parent != null && parent.getChildren().size() == 1);
    }

    private DistributionDetails computeCompositeDetails() {
        DistributionDetails composite = new DistributionDetails();
        DistributionTraitTaxonNode ancestor = getHighestSingleChildParent();

        composite.Squares = Sets.union(ancestor.originalValues.Squares,
            ancestor.aggregated.Squares);

        composite.Quadrants = Sets.union(ancestor.originalValues.Quadrants,
            ancestor.aggregated.Quadrants);

        return composite;
    }

    private DistributionTraitTaxonNode getHighestSingleChildParent() {
        BaseTraitTaxonNode node = this;
        while (isUniqueChild(node)) {
            node = node.getParent();
        }
        return (DistributionTraitTaxonNode) node;
    }

    private Model createEntity(TraitDetailsEntryType entryType, DistributionDetails details) {
        DistributionDatatype dt = new DistributionDatatype();
        dt.setTaxonId(taxon.getId());
        dt.setTraitId(trait.getId());
        dt.setEntryType(entryType.getIndex());
        dt.setQuadrantsCount(details.Quadrants.size());
        dt.setSquaresCount(details.Squares.size());
        return dt;
    }

    public DistributionDetails getAggregated() {
        return aggregated;
    }

    public DistributionDetails getInherited() {
        return inherited;
    }

    public DistributionDetails getOriginalValues() {
        return originalValues;
    }

    public static class DistributionDetails {
        public Set<Integer> Squares = new HashSet<Integer>();
        public Set<Integer> Quadrants = new HashSet<Integer>();
    }

}
