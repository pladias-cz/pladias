package service.trait.collect.visitors;

import com.google.common.collect.Sets;
import helpers.ranges.RangeList;
import models.traits.EnumerateValue;
import models.traits.MonthDatatype;
import models.traits.MonthDatatypePK;
import org.apache.commons.lang3.BooleanUtils;
import org.apache.commons.lang3.Range;
import play.Logger;
import service.trait.collect.*;

import java.util.*;

public class NodesPopulatingVisitor implements INodeVisitor {
    @Override
    public void visit(EnumSingleTraitTaxonNode enumSingleTaxonDetail) {
        List<BaseTraitTaxonNode> children = enumSingleTaxonDetail.getChildren();

        if (children.size() == 1) {
            EnumSingleTraitTaxonNode child = (EnumSingleTraitTaxonNode) children.get(0);

            //update the only child
            Map<Integer, Boolean> childInheritedValues = child.getInheritedValues();
            Map<Integer, Boolean> inheritedValues = enumSingleTaxonDetail.getInheritedValues();
            Set<Integer> ownValues = enumSingleTaxonDetail.getValues();

            Integer max = null;
            if (!ownValues.isEmpty()) {
                max = getMax(ownValues);
            }
            if (!inheritedValues.isEmpty()) {
                int inheritedValuesMax = getMax(inheritedValues);
                if (max == null) {
                    max = inheritedValuesMax;
                } else if (max < inheritedValuesMax) {
                    max = inheritedValuesMax;
                }
            }
            if (max != null) {
                childInheritedValues.put(max, true);
            }
        }

        visitChildren(children);

        //aggregate the values from all children to current node
        Map<Integer, Boolean> aggregatedvalues = enumSingleTaxonDetail.getAggregatedValues();
        Integer max = null;

        for (BaseTraitTaxonNode ch : children) {
            try {
                Set<Integer> childValues = ((EnumBaseTraitTaxonNode) ch).getValues();
                Map<Integer, Boolean> childAggregatedValues = ((EnumBaseTraitTaxonNode) ch).getAggregatedValues();
                if (childValues.size() == 0 && childAggregatedValues.size() == 0)
                    continue;

                Integer currentMax = getMaxValue(childValues);
                if (max == null) {
                    max = currentMax;
                } else if (currentMax != null) {
                    if (max < currentMax) {
                        max = currentMax;
                    }
                }


                for (Map.Entry<Integer, Boolean> entry : childAggregatedValues.entrySet()) {
                    if (max == null) {
                        max = entry.getKey();
                    } else {
                        if (max < entry.getKey() && entry.getValue()) {
                            max = entry.getKey();
                        }
                    }
                }
            } catch (Exception e) {
                Logger.error("Failed while extracting (min,max) from child taxon node.", e);
            }
        }

        if (max != null) {
            aggregatedvalues.put(max, true);
        }
    }

    private Integer getMax(Map<Integer, Boolean> values) {
        if (values.isEmpty()) {
            return null;
        }
        Integer max = Integer.MIN_VALUE;
        for (Map.Entry<Integer, Boolean> v : values.entrySet()) {
            if (max < v.getKey() && v.getValue()) max = v.getKey();
        }
        return max;
    }

    private Integer getMax(Set<Integer> values) {
        if (values.isEmpty()) {
            return null;
        }
        Integer max = Integer.MIN_VALUE;
        for (int v : values) {
            if (max < v) max = v;
        }
        return max;
    }

    private Integer getMaxValue(Set<Integer> values) {
        if (values.isEmpty()) {
            return null;
        }
        int max = Integer.MIN_VALUE;
        for (int v : values) {
            if (max < v) max = v;
        }
        return max;
    }

    @Override
    public void visit(EnumAdditiveTraitTaxonNode enumAdditiveTaxonDetail) {
        List<BaseTraitTaxonNode> children = enumAdditiveTaxonDetail.getChildren();
        if (children.size() == 1) {
            EnumAdditiveTraitTaxonNode child = (EnumAdditiveTraitTaxonNode) children.get(0);

            //update the only child
            Map<Integer, Boolean> inheritedValues = child.getInheritedValues();
            Set<Integer> ownValues = enumAdditiveTaxonDetail.getValues();
            for (EnumerateValue e : enumAdditiveTaxonDetail.getEnumerate().getEnumerateValues()) {
                if (!ownValues.isEmpty()) {
                    int enumId = e.getId();
                    boolean isSet = ownValues.contains(e.getId());
                    inheritedValues.put(enumId, isSet);
                }
            }
        }

        visitChildren(enumAdditiveTaxonDetail.getChildren());

        //aggregate the values from all children to current node
        Map<Integer, Boolean> aggregatedvalues = enumAdditiveTaxonDetail.getAggregatedValues();
        for (BaseTraitTaxonNode child : children) {
            EnumAdditiveTraitTaxonNode childDetail = ((EnumAdditiveTraitTaxonNode) child);

            //for additive inheritance, the aggregated values are built transitively towards root of the tree
            for (Map.Entry<Integer, Boolean> pair : childDetail.getAggregatedValues().entrySet()) {
                int key = pair.getKey();
                boolean isSet = pair.getValue();
                if (!aggregatedvalues.containsKey(key) || isSet) {
                    aggregatedvalues.put(key, isSet);
                }

            }

            Set<Integer> ownValues = childDetail.getValues();
            if (!ownValues.isEmpty()) {
                for (EnumerateValue enumVal : childDetail.getEnumerate().getEnumerateValues()) {
                    boolean isSet = ownValues.contains(enumVal.getId());
                    if (!aggregatedvalues.containsKey(enumVal.getId()) || isSet) {
                        aggregatedvalues.put(enumVal.getId(), isSet);
                    }
                }
            }
        }
    }

    @Override
    public void visit(EnumStandardTraitTaxonNode enumStdTaxonDetail) {
        List<BaseTraitTaxonNode> children = enumStdTaxonDetail.getChildren();
        if (children.size() == 1) {
            EnumStandardTraitTaxonNode child = (EnumStandardTraitTaxonNode) children.get(0);

            //update the only child
            Map<Integer, Boolean> childInheritedValues = child.getInheritedValues();
            Map<Integer, Boolean> ancestorInheritedValues = enumStdTaxonDetail.getInheritedValues();

            //copy ancestor inh. values to child
            childInheritedValues.putAll(ancestorInheritedValues);

            Set<Integer> ancestorOwnValues = enumStdTaxonDetail.getValues();
            if (!ancestorInheritedValues.isEmpty() || !ancestorOwnValues.isEmpty())
                for (EnumerateValue enumVal : child.getEnumerate().getEnumerateValues()) {
                    int enumValId = enumVal.getId();
                    boolean isSet = ancestorOwnValues.contains(enumValId);
                    if (!childInheritedValues.containsKey(enumValId) || isSet) {
                        //always record TRUE value. Record FALSE only if this enumVal was not set (existing value could be either TRUE or FALSE)
                        childInheritedValues.put(enumValId, isSet);
                    }
                }
        }

        visitChildren(enumStdTaxonDetail.getChildren());

        //aggregate the values from all children to current node
        Map<Integer, Boolean> aggregatedvalues = enumStdTaxonDetail.getAggregatedValues();
        for (BaseTraitTaxonNode child : children) {
            for (Map.Entry<Integer, Boolean> childAggrValEntry : ((EnumStandardTraitTaxonNode) child).getAggregatedValues().entrySet()) {
                int key = childAggrValEntry.getKey();

                boolean isSet = childAggrValEntry.getValue();
                if (!aggregatedvalues.containsKey(key) || isSet) {
                    aggregatedvalues.put(key, isSet);
                }
            }

            Set<Integer> childOwnValues = ((EnumStandardTraitTaxonNode) child).getValues();
            if (!childOwnValues.isEmpty()) {
                for (EnumerateValue e : enumStdTaxonDetail.getEnumerate().getEnumerateValues()) {
                    int key = e.getId();
                    boolean isSet = childOwnValues.contains(key);
                    if (!aggregatedvalues.containsKey(key) || isSet) {
                        aggregatedvalues.put(key, isSet);
                    }
                }
            }
        }
    }

    @Override
    public void visit(MonthInheritanceTraitTaxonNode monthInheritanceTraitTaxonDetail) {

        List<BaseTraitTaxonNode> children = monthInheritanceTraitTaxonDetail.getChildren();
        if (children.size() == 1) {
            MonthInheritanceTraitTaxonNode child = (MonthInheritanceTraitTaxonNode) children.get(0);
            RangeList ranges = new RangeList();

            for (MonthDatatype datatype : monthInheritanceTraitTaxonDetail.getMonths()) {
                MonthDatatypePK datatypePk = datatype.getDatatypePk();
                ranges.add(Range.between(
                    datatypePk.getMinimum(),
                    datatypePk.getMaximum()));
            }
            for (Range<Integer> range : monthInheritanceTraitTaxonDetail.getInheritedRanges()) {
                ranges.add(range);
            }

            for (Range<Integer> range : ranges.getIntervals())
                child.addIhneritedRange(range);
        }

        visitChildren(monthInheritanceTraitTaxonDetail.getChildren());

        RangeList aggregatedRanges = new RangeList();
        for (BaseTraitTaxonNode child : children) {
            MonthInheritanceTraitTaxonNode childDetail = (MonthInheritanceTraitTaxonNode) child;
            for (MonthDatatype childMonthDatatype : childDetail.getMonths()) {
                MonthDatatypePK childDatatypePk = childMonthDatatype.getDatatypePk();

                aggregatedRanges.add(Range.between(
                    childDatatypePk.getMinimum(),
                    childDatatypePk.getMaximum()));
            }

        }
        for (Range<Integer> range : aggregatedRanges.getIntervals()) {
            monthInheritanceTraitTaxonDetail.addAggregatedRange(range);
        }
    }

    private void visitChildren(List<BaseTraitTaxonNode> children) {
        for (BaseTraitTaxonNode e : children) {
            e.accept(this);
        }
    }


    @Override
    public void visit(BoolTraitTaxonNode boolTraitTaxonDetail) {
        List<BaseTraitTaxonNode> children = boolTraitTaxonDetail.getChildren();

        if (children.size() == 1) {
            Boolean originalValue = boolTraitTaxonDetail.getOriginalValue();
            Boolean inheritedValue = boolTraitTaxonDetail.getInherited();
            BoolTraitTaxonNode child = (BoolTraitTaxonNode) children.get(0);

            if (originalValue != null) {
                child.setInherited(originalValue);
            }
            if (inheritedValue != null) {
                if (child.getInherited() == null) {
                    child.setInherited(inheritedValue);
                } else {
                    boolean[] disjunction = new boolean[]{originalValue, inheritedValue};
                    child.setInherited(BooleanUtils.or(disjunction));
                }
            }
        }

        visitChildren(boolTraitTaxonDetail.getChildren());

        for (BaseTraitTaxonNode child : children) {
            BoolTraitTaxonNode detail = (BoolTraitTaxonNode) child;
            Boolean childValue = detail.getOriginalValue();
            Boolean[] aggregatedChild = detail.getAggregated();
            Boolean[] aggregatedValues = boolTraitTaxonDetail.getAggregated();
            if (childValue != null) {
                aggregatedValues[Boolean.FALSE.equals(childValue) ? 0 : 1] = childValue;
            }
            if (aggregatedChild[0] != null) {
                aggregatedValues[0] = Boolean.FALSE;
            }
            if (aggregatedChild[1] != null) {
                aggregatedValues[1] = Boolean.TRUE;
            }
        }
    }

    @Override
    public void visit(BasicTraitTaxonNode basicTraitTaxonDetail) {
        List<BaseTraitTaxonNode> children = basicTraitTaxonDetail.getChildren();

        if (children.size() == 1) {
            Set<?> originalValues = basicTraitTaxonDetail.getOriginalValues();
            Set<?> inheritedValues = basicTraitTaxonDetail.getInherited();
            BasicTraitTaxonNode<?> child = (BasicTraitTaxonNode<?>) children.get(0);

            for (Object value : originalValues) {
                child.addInherited(value);
            }

            for (Object value : inheritedValues) {
                child.addInherited(value);
            }
        }

        visitChildren(children);

        if (children.size() == 1) {
            BasicTraitTaxonNode<?> detail = (BasicTraitTaxonNode<?>) children.get(0);
            Set<?> childValues = detail.getOriginalValues();
            Set<?> childAggrValues = detail.getAggregated();

            for (Object value : childValues) {
                basicTraitTaxonDetail.addAggregated(value);
            }

            for (Object value : childAggrValues) {
                basicTraitTaxonDetail.addAggregated(value);
            }
        }
    }

    @Override
    public void visit(NumericTraitTaxonNode numericInheritanceDetail) {
        List<BaseTraitTaxonNode> children = numericInheritanceDetail.getChildren();

        if (children.size() == 1) {
            NumericTraitTaxonNode<?> child = (NumericTraitTaxonNode<?>) children.get(0);

            //update the only child
            Set<?> inheritedValues = numericInheritanceDetail.getInherited();
            Set<?> originalValues = numericInheritanceDetail.getOriginalValues();

            for (Object inheritedValue : inheritedValues) {
                child.addInherited(inheritedValue);
            }
            for (Object origValue : originalValues) {
                child.addInherited(origValue);
            }
        }

        visitChildren(children);

        //aggregate the values from all children to current node

        for (BaseTraitTaxonNode ch : children) {

            Set<?> childOrigValues = ((NumericTraitTaxonNode<?>) ch).getOriginalValues();
            for (Object childOrigValue : childOrigValues) {
                numericInheritanceDetail.addAggregated(childOrigValue);
            }

            Set<?> childAggregValues = ((NumericTraitTaxonNode<?>) ch).getAggregated();
            for (Object childAggregValue : childAggregValues) {
                numericInheritanceDetail.addAggregated(childAggregValue);
            }
        }
    }

    @Override
    public void visit(IntervalAvgTraitTaxonNode intervalAvgTraitTaxonDetail) {
        List<BaseTraitTaxonNode> children = intervalAvgTraitTaxonDetail.getChildren();

        if (children.size() == 1) {
            IntervalAvgTraitTaxonNode child = (IntervalAvgTraitTaxonNode) children.get(0);

            //update the only child
            IntervalAvgTraitTaxonNode.IntervalAvgData inheritedValues = intervalAvgTraitTaxonDetail.getInheritedValue();
            IntervalAvgTraitTaxonNode.IntervalAvgData originalValues = intervalAvgTraitTaxonDetail.getOriginalValue();

            IntervalAvgTraitTaxonNode.IntervalAvgData childInherited = child.getInheritedValue();
            childInherited.collectValues(originalValues);
            childInherited.collectValues(inheritedValues);
        }

        visitChildren(children);

        if (intervalAvgTraitTaxonDetail.isShallowInheritance()) {
            processShallowIntervalAggregation(intervalAvgTraitTaxonDetail, children);
        } else {
            processDeepIntervalAggregation(intervalAvgTraitTaxonDetail);
        }

    }

    private void processDeepIntervalAggregation(IntervalAvgTraitTaxonNode intervalAvgTraitTaxonDetail) {
        IntervalAvgTraitTaxonNode.IntervalAvgData aggrData = intervalAvgTraitTaxonDetail.getAggregatedValue();
        int meanDescendantsCount = 0;
        List<BaseTraitTaxonNode> descendants = collectDescendants(intervalAvgTraitTaxonDetail);
        for (BaseTraitTaxonNode d : descendants) {
            IntervalAvgTraitTaxonNode intAvgDesc = (IntervalAvgTraitTaxonNode) d;
            IntervalAvgTraitTaxonNode.IntervalAvgData descOrigValues = intAvgDesc.getOriginalValue();
            if (descOrigValues.isEmpty())
                continue;

            if (descOrigValues.minimum != null) {
                if (aggrData.minimum == null || aggrData.minimum > descOrigValues.minimum) {
                    aggrData.minimum = descOrigValues.minimum;
                }
            }

            if (descOrigValues.maximum != null) {
                if (aggrData.maximum == null || aggrData.maximum < descOrigValues.maximum) {
                    aggrData.maximum = descOrigValues.maximum;
                }
            }

            if (descOrigValues.extremeMinimum != null) {
                if (aggrData.extremeMinimum == null || aggrData.extremeMinimum > descOrigValues.extremeMinimum) {
                    aggrData.extremeMinimum = descOrigValues.extremeMinimum;
                }
            }

            if (descOrigValues.extremeMaximum != null) {
                if (aggrData.extremeMaximum == null || aggrData.extremeMaximum < descOrigValues.extremeMaximum) {
                    aggrData.extremeMaximum = descOrigValues.extremeMaximum;
                }
            }

            if (descOrigValues.mean != null) {
                if (aggrData.mean == null) {
                    aggrData.mean = descOrigValues.mean;
                } else {
                    aggrData.mean += descOrigValues.mean;
                }
                meanDescendantsCount++;
            }
        }//for loop
        if (aggrData.mean != null) {
            aggrData.mean = aggrData.mean / (double) meanDescendantsCount;
        }
    }

    private List<BaseTraitTaxonNode> collectDescendants(BaseTraitTaxonNode traitTaxonDetail) {
        Queue<BaseTraitTaxonNode> queue = new LinkedList<BaseTraitTaxonNode>();
        queue.addAll(traitTaxonDetail.getChildren());

        List<BaseTraitTaxonNode> result = new ArrayList<BaseTraitTaxonNode>();
        while (!queue.isEmpty()) {
            BaseTraitTaxonNode elem = queue.remove();
            result.add(elem);
            for (BaseTraitTaxonNode child : elem.getChildren()) {
                queue.add(child);
            }
        }
        return result;
    }

    private void processShallowIntervalAggregation(IntervalAvgTraitTaxonNode intervalAvgTraitTaxonDetail,
                                                   List<BaseTraitTaxonNode> children) {

        if (children.size() == 1) {
            IntervalAvgTraitTaxonNode child = (IntervalAvgTraitTaxonNode) children.get(0);

            //update the only child
            IntervalAvgTraitTaxonNode.IntervalAvgData aggregatedValues = intervalAvgTraitTaxonDetail.getAggregatedValue();

            IntervalAvgTraitTaxonNode.IntervalAvgData childInherited = child.getAggregatedValue();
            IntervalAvgTraitTaxonNode.IntervalAvgData childOrigValues = child.getOriginalValue();

            aggregatedValues.collectValues(childInherited);
            aggregatedValues.collectValues(childOrigValues);
        }
    }

    @Override
    public void visit(EnumSyntaxonTraitTaxonNode enumSyntaxonDetail) {

        List<BaseTraitTaxonNode> children = enumSyntaxonDetail.getChildren();

        if (children.size() == 1) {
            EnumSyntaxonTraitTaxonNode child = (EnumSyntaxonTraitTaxonNode) children.get(0);

            Map<Integer, Boolean> childInheritedValues = child.getInherited();
            Map<Integer, Boolean> inheritedValues = enumSyntaxonDetail.getInherited();
            Map<Integer, Boolean> originalValues = enumSyntaxonDetail.getOriginalValues();

            childInheritedValues.putAll(originalValues);
            for (Map.Entry<Integer, Boolean> entry : inheritedValues.entrySet()) {
                int key = entry.getKey();

                if (!childInheritedValues.containsKey(key) || childInheritedValues.get(key) == false) {
                    childInheritedValues.put(key, entry.getValue());
                }
            }
        }

        visitChildren(children);

        if (children.size() == 1) {
            EnumSyntaxonTraitTaxonNode child = (EnumSyntaxonTraitTaxonNode) children.get(0);

            Map<Integer, Boolean> aggregatedValues = enumSyntaxonDetail.getAggregated();
            Map<Integer, Boolean> childOriginalValues = child.getOriginalValues();
            Map<Integer, Boolean> childAggregatedValues = child.getAggregated();

            aggregatedValues.putAll(childOriginalValues);
            for (Map.Entry<Integer, Boolean> entry : childAggregatedValues.entrySet()) {
                int key = entry.getKey();

                if (!aggregatedValues.containsKey(key) || aggregatedValues.get(key) == false) {
                    aggregatedValues.put(key, entry.getValue());
                }
            }

        }
    }

    @Override
    public void visit(DistributionTraitTaxonNode aggrDistTaxonTraitDetail) {
        List<BaseTraitTaxonNode> children = aggrDistTaxonTraitDetail.getChildren();
        DistributionTraitTaxonNode.DistributionDetails originalValues = aggrDistTaxonTraitDetail.getOriginalValues();

        if (children.size() == 1) {
            DistributionTraitTaxonNode.DistributionDetails inheritedValues = aggrDistTaxonTraitDetail.getInherited();

            DistributionTraitTaxonNode child = (DistributionTraitTaxonNode) children.get(0);
            DistributionTraitTaxonNode.DistributionDetails childInhValues = child.getInherited();

            childInhValues.Quadrants = Sets.union(
                originalValues.Quadrants,
                inheritedValues.Quadrants);

            childInhValues.Squares = Sets.union(
                originalValues.Squares,
                inheritedValues.Squares);
        }

        visitChildren(children);

        DistributionTraitTaxonNode.DistributionDetails aggrValues = aggrDistTaxonTraitDetail.getAggregated();
        for (BaseTraitTaxonNode child : children) {
            DistributionTraitTaxonNode aggrChild = (DistributionTraitTaxonNode) child;
            aggrValues.Quadrants.addAll(aggrChild.getOriginalValues().Quadrants);
            aggrValues.Quadrants.addAll(aggrChild.getAggregated().Quadrants);

            aggrValues.Squares.addAll(aggrChild.getOriginalValues().Squares);
            aggrValues.Squares.addAll(aggrChild.getAggregated().Squares);
        }
    }
}
