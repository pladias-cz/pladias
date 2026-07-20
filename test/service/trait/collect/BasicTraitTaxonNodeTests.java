package service.trait.collect;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import io.ebean.Model;
import models.Taxon;
import models.traits.Datatype;
import models.traits.Feature;
import models.traits.IntegerDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;

public class BasicTraitTaxonNodeTests 
{
	private Trait trait;
	private Taxon taxon;

	@Before
	public void setUp()
	{
		trait = new Trait();
		trait.setId(100);
		taxon = new Taxon();
		taxon.setId(200);
		
		Datatype datatype = new Datatype();
		datatype.setId(Datatype.IntegerDatatypeId); 
		Feature feature = new Feature();
		feature.setDatatype(datatype);
		trait.setFeature(feature);
	}
	
	@After
	public void tearDown()
	{
		trait = null;
		taxon = null;
	}
	
	@Test
	public void originalValuesCopiedToComposedValues()
	{
		Set<Integer> values = new HashSet<Integer>();
		values.add(1);
		values.add(2);
		BasicTraitTaxonNode<Integer> node = new BasicTraitTaxonNode<Integer>(trait, taxon, values) ;
		node.addAggregated(10);
		node.addAggregated(11);
		node.addInherited(51);
		node.addInherited(52);
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(6, entities.size());
		
		List<IntegerDatatype> details = toList(entities, IntegerDatatype.class);
		
		int[] composedValues = filterByType(details, TraitDetailsEntryType.Aggregated);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {10,11}, composedValues);
		
		composedValues = filterByType(details, TraitDetailsEntryType.Inherited);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {51,52}, composedValues);
		
		composedValues = filterByType(details, TraitDetailsEntryType.Composite);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {1,2}, composedValues);
	}
	
	@Test
	public void aggregatedValuesCopiedToComposedValues()
	{
		BasicTraitTaxonNode<Integer> node = new BasicTraitTaxonNode<Integer>(trait, taxon, new HashSet<Integer>());
		node.addAggregated(10);
		node.addAggregated(11);
		node.addInherited(51);
		node.addInherited(52);
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(6, entities.size());
		
		List<IntegerDatatype> details = toList(entities, IntegerDatatype.class);
		
		int[] composedValues = filterByType(details, TraitDetailsEntryType.Aggregated);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {10,11}, composedValues);
		
		composedValues = filterByType(details, TraitDetailsEntryType.Inherited);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {51,52}, composedValues);
		
		composedValues = filterByType(details, TraitDetailsEntryType.Composite);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {10,11}, composedValues);
	}
	
	@Test
	public void inheritedValuesCopiedToComposedValues()
	{
		BasicTraitTaxonNode<Integer> node = new BasicTraitTaxonNode<Integer>(trait, taxon, new HashSet<Integer>());
		node.addInherited(51);
		node.addInherited(52);
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(4, entities.size());
		
		List<IntegerDatatype> details = toList(entities, IntegerDatatype.class);
		
		int[] composedValues = filterByType(details, TraitDetailsEntryType.Inherited);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {51,52}, composedValues);
		
		composedValues = filterByType(details, TraitDetailsEntryType.Composite);
		Arrays.sort(composedValues);
		Assert.assertArrayEquals(new int[] {51,52}, composedValues);
	}
	
	private int[] filterByType(List<IntegerDatatype> details, TraitDetailsEntryType entryType) {
		return details.stream()
		.filter((v) -> isOfType(v, entryType))
		.flatMapToInt(v -> IntStream.of(v.getValue()))
		.toArray();
	}
	
	private boolean isOfType(IntegerDatatype detail, TraitDetailsEntryType type)
	{
		return (detail.getEntryType() == type.getIndex());
	}
	
	private<T extends Model> List<T> toList(List<Model> input, Class<T> type)
	{
		List<T> result = new ArrayList<T>();
		for (Model m : input) {
			result.add((T)m);
		}
		return result;
	}
}
