package service.trait.collect.visitors;

import io.ebean.Model;
import play.Logger;
import service.trait.collect.*;

import java.util.ArrayList;
import java.util.List;

public class DataExtractingVisitor implements INodeVisitor {

    private final List<Model> entitiesCollection = new ArrayList<Model>();

    public List<Model> getEntities() {
        return entitiesCollection;
    }

    public void visit(EnumStandardTraitTaxonNode enumStandardTaxonDetail) {
        collectEntities(enumStandardTaxonDetail);
        visitChildren(enumStandardTaxonDetail.getChildren());
    }

    public void visit(EnumSingleTraitTaxonNode enumSingleTaxonDetail) {
        collectEntities(enumSingleTaxonDetail);
        visitChildren(enumSingleTaxonDetail.getChildren());
    }

    public void visit(EnumAdditiveTraitTaxonNode enumAdditiveTaxonDetail) {
        collectEntities(enumAdditiveTaxonDetail);
        visitChildren(enumAdditiveTaxonDetail.getChildren());
    }

    public void visit(MonthInheritanceTraitTaxonNode monthInheritanceTraitTaxonDetail) {
        collectEntities(monthInheritanceTraitTaxonDetail);
        visitChildren(monthInheritanceTraitTaxonDetail.getChildren());
    }

    public void visit(BoolTraitTaxonNode boolTraitTaxonDetail) {
        collectEntities(boolTraitTaxonDetail);
        visitChildren(boolTraitTaxonDetail.getChildren());
    }

    public void visit(BasicTraitTaxonNode<?> basicTraitTaxonDetail) {
        collectEntities(basicTraitTaxonDetail);
        visitChildren(basicTraitTaxonDetail.getChildren());
    }

    public void visit(NumericTraitTaxonNode<?> numericTraitTaxonDetail) {
        collectEntities(numericTraitTaxonDetail);
        visitChildren(numericTraitTaxonDetail.getChildren());
    }

    public void visit(DistributionTraitTaxonNode aggregatedDistTaxonTraitDetail) {
        collectEntities(aggregatedDistTaxonTraitDetail);
        visitChildren(aggregatedDistTaxonTraitDetail.getChildren());
    }

    public void visit(IntervalAvgTraitTaxonNode intervalAvgTraitTaxonDetail) {
        collectEntities(intervalAvgTraitTaxonDetail);
        visitChildren(intervalAvgTraitTaxonDetail.getChildren());
    }

    public void visit(EnumSyntaxonTraitTaxonNode enumSyntaxonDetail) {
        collectEntities(enumSyntaxonDetail);
        visitChildren(enumSyntaxonDetail.getChildren());
    }

    private void visitChildren(List<BaseTraitTaxonNode> children) {
        for (BaseTraitTaxonNode e : children) {
            e.accept(this);
        }
    }

    private void collectEntities(BaseTraitTaxonNode node) {
        try {
            List<Model> entities = node.getComputedEntities();
            entitiesCollection.addAll(entities);
        } catch (Exception e) {
            Logger.error("Failed to collect entities", e);
            throw new RuntimeException(e);
        }
    }
}
