package service.trait.collect.visitors;

import service.trait.collect.*;

public interface INodeVisitor {
    void visit(EnumStandardTraitTaxonNode enumStandardTaxonDetail);

    void visit(EnumSingleTraitTaxonNode enumSingleTaxonDetail);

    void visit(EnumAdditiveTraitTaxonNode enumAdditiveTaxonDetail);

    void visit(MonthInheritanceTraitTaxonNode monthInheritanceTraitTaxonDetail);

    void visit(BoolTraitTaxonNode booleanTraitTaxonDetail);

    void visit(BasicTraitTaxonNode<?> basicTraitTaxonDetail);

    void visit(NumericTraitTaxonNode<?> numericTraitTaxonDetail);

    void visit(IntervalAvgTraitTaxonNode intervalAvgTraitTaxonDetail);

    void visit(EnumSyntaxonTraitTaxonNode enumSyntaxonDetail);

    void visit(DistributionTraitTaxonNode aggregatedDistTaxonTraitDetail);

}
