package service.trait.collect;

import models.Syntaxon;
import models.Taxon;
import models.traits.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.trait.collect.visitors.INodeVisitor;
import service.trait.excel.TraitDataProviderFactory;

import java.security.InvalidParameterException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Stack;

public class TraitTaxonTreeBuilder {
    private final Trait trait;
    private final TraitDataProviderFactory traitDataFactory;
    private final Map<Integer, Syntaxon> allSyntaxonMap;
    private final MultiValueNodeFactory multiValueNodeFactory;

    private final Logger logger = LoggerFactory.getLogger(TraitTaxonTreeBuilder.class);


    public TraitTaxonTreeBuilder(Trait trait) {
        this.trait = trait;
        this.traitDataFactory = new TraitDataProviderFactory(trait.getFeature().getDatatype());
        this.allSyntaxonMap = Syntaxon.find().query()
            .where()
            .eq("rank", trait.getFeature().getSyntaxonRestrictedRankId())
            .findMap();
        this.multiValueNodeFactory = new MultiValueNodeFactory(trait);
    }

    public void visit(BaseTraitTaxonNode node, INodeVisitor visitor) {
        node.accept(visitor);
        for (BaseTraitTaxonNode child : node.getChildren()) {
            visit(child, visitor);
        }
    }

    private Map<Integer, Taxon> buildTaxonsByLeftKey() {
        Map<Integer, Taxon> map = new HashMap<>();

        List<Taxon> taxons = Taxon.find().query().orderBy("lft asc").findList();
        for (Taxon t : taxons) {
            map.put(t.getLeft(), t);
        }
        return map;
    }

    public BaseTraitTaxonNode buildTree() throws InvalidParameterException {
        Map<Integer, Taxon> taxonsByLeftKey = buildTaxonsByLeftKey();
        Taxon rootTaxon = taxonsByLeftKey.get(1); //get taxon root
        Stack<BaseTraitTaxonNode> stack = new Stack<>();
        BaseTraitTaxonNode rootNode = createTraitTaxonDetail(rootTaxon);
        stack.add(rootNode);

        for (int i = rootTaxon.getLeft() + 1; i <= rootTaxon.getRight(); i++) {
            Taxon t = taxonsByLeftKey.get(i);

            if (t != null) {
                if (t.isSuppressed()) {
                    //we should skip whole subtree of this taxon
                    logger.debug("Skipping suppressed taxon " + t.getNameLat());
                    i = t.getRight();
                    continue;
                }

                //moving down
                BaseTraitTaxonNode node = createTraitTaxonDetail(t);
                stack.peek().addChild(node);

                stack.push(node);
            } else //completing processing of already visited node
            {
                Taxon currentTop = stack.peek().getTaxon();
                if (i < currentTop.getRight()) {
                    //in case there was a "hole" in the left-ordering
                    continue;
                }
                stack.pop();
            }
        }
        return rootNode;
    }

    private BaseTraitTaxonNode createTraitTaxonDetail(Taxon taxon) throws InvalidParameterException {
        int inheritanceType = trait.getFeature().getInheritanceType().getId();
        switch (inheritanceType) {
            case InheritanceType.EnumAdditive:
                return new EnumAdditiveTraitTaxonNode(trait, taxon, traitDataFactory);
            case InheritanceType.EnumStandard:
                return new EnumStandardTraitTaxonNode(trait, taxon, traitDataFactory);
            case InheritanceType.EnumSingle:
                return new EnumSingleTraitTaxonNode(trait, taxon, traitDataFactory);
            case InheritanceType.Month:
                return new MonthInheritanceTraitTaxonNode(trait, taxon);
            case InheritanceType.Bool:
                DatatypePK pk = new DatatypePK();
                pk.setTaxonId(taxon.getId());
                pk.setTraitId(trait.getId());
                BoolDatatype datatype = BoolDatatype.find().byId(pk);
                return new BoolTraitTaxonNode(trait, taxon, datatype);
            case InheritanceType.Basic:
                return multiValueNodeFactory.create(taxon);
            case InheritanceType.Numeric:
                return multiValueNodeFactory.create(taxon);
            case InheritanceType.IntervalShallow:
            case InheritanceType.IntervalDeep:
                return resolveIntervalInheritanceType(taxon);
            case InheritanceType.EnumSyntaxon:
                return resolveSyntaxonInheritanceType(taxon);
            case InheritanceType.Distribution:
                return resolveAggregatedDistributionType(taxon);

        }

        throw new InvalidParameterException(String.format("Trait-taxon tree for inheritance type '%d' not supported.", inheritanceType));
    }

    private BaseTraitTaxonNode resolveAggregatedDistributionType(Taxon taxon) {
        List<DistributionReadOnlyDatatype> roDatatypes = DistributionReadOnlyDatatype.find().query().where().eq("taxonId", taxon.getId()).findList();

        DistributionTraitTaxonNode node = new DistributionTraitTaxonNode(trait, taxon);
        for (DistributionReadOnlyDatatype roDatatype : roDatatypes) {
            node.getOriginalValues().Quadrants.add(roDatatype.getQuadrant());
            node.getOriginalValues().Squares.add(roDatatype.getSquare());
        }
        return node;
    }

    private BaseTraitTaxonNode resolveSyntaxonInheritanceType(Taxon taxon) {
        Map<Integer, SyntaxonDatatype> syntaxons = SyntaxonDatatype.find().query()
            .where()
            .eq("taxon_id", taxon.getId())
            .eq("trait_id", trait.getId())
            .findMap();
        return new EnumSyntaxonTraitTaxonNode(trait, taxon, syntaxons, allSyntaxonMap);
    }

    private BaseTraitTaxonNode resolveIntervalInheritanceType(Taxon taxon) {
        DatatypePK dt = new DatatypePK();
        dt.setTaxonId(taxon.getId());
        dt.setTraitId(trait.getId());
        IntervalAvgDatatype model = IntervalAvgDatatype.find().byId(dt);
        return new IntervalAvgTraitTaxonNode(trait, taxon, model);
    }
}
