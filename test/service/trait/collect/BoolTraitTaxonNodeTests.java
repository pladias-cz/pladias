package service.trait.collect;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import io.ebean.Model;
import models.Taxon;
import models.traits.BoolDatatype;
import models.traits.Datatype;
import models.traits.DatatypePK;
import models.traits.Feature;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;

public class BoolTraitTaxonNodeTests 
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
		datatype.setId(Datatype.BooleanDatatypeId); 
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
		BoolDatatype dt = new BoolDatatype();
		DatatypePK dtPk = new DatatypePK();
		dtPk.setEntryType(TraitDetailsEntryType.Original.getIndex());
		dtPk.setTaxonId(taxon.getId());
		dtPk.setTraitId(trait.getId());
		dt.setValue(true);
		
		dt.setValue(true);
		BoolTraitTaxonNode node = new BoolTraitTaxonNode(trait, taxon, dt);
		
		node.setInherited(false);
		Boolean[] aggregatedValues = node.getAggregated();
		aggregatedValues[0] = false;
		aggregatedValues[1] = true;
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(4, entities.size());
		
		List<BoolDatatype> details = toList(entities, BoolDatatype.class);
		
		List<BoolDatatype> values = filterAllByType(details, TraitDetailsEntryType.Aggregated);
		assertEquals(2, values.size());
		assertFalse(values.get(0).isValue());
		assertTrue(values.get(1).isValue());
		
		BoolDatatype composedValue = filterFirstByType(details, TraitDetailsEntryType.Inherited);
		assertFalse(composedValue.isValue());
		
		composedValue = filterFirstByType(details, TraitDetailsEntryType.Composite);
		assertTrue(composedValue.isValue());
	}
	
	@Test
	public void aggregatedValuesCopiedToComposedValues()
	{
		Trait trait = new Trait();
		trait.setId(100);
		Taxon taxon = new Taxon();
		taxon.setId(200);
		
		Datatype datatype = new Datatype();
		datatype.setId(Datatype.BooleanDatatypeId); 
		Feature feature = new Feature();
		feature.setDatatype(datatype);
		trait.setFeature(feature);
		
		BoolTraitTaxonNode node = new BoolTraitTaxonNode(trait, taxon, null);
		
		Boolean[] aggregatedValues = node.getAggregated();
		aggregatedValues[0] = false;
		
		node.setInherited(true);
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(3, entities.size());
		
		List<BoolDatatype> details = toList(entities, BoolDatatype.class);
		
		List<BoolDatatype> values = filterAllByType(details, TraitDetailsEntryType.Aggregated);
		assertEquals(1, values.size());
		assertFalse(values.get(0).isValue());
		
		BoolDatatype composedValue = filterFirstByType(details, TraitDetailsEntryType.Composite);
		assertFalse(composedValue.isValue());
	}
	
	@Test
	public void inheritedValuesCopiedToComposedValues()
	{
		Trait trait = new Trait();
		trait.setId(100);
		Taxon taxon = new Taxon();
		taxon.setId(200);
		
		Datatype datatype = new Datatype();
		datatype.setId(Datatype.BooleanDatatypeId); 
		Feature feature = new Feature();
		feature.setDatatype(datatype);
		trait.setFeature(feature);
		
		BoolTraitTaxonNode node = new BoolTraitTaxonNode(trait, taxon, null);
		node.setInherited(true);
		
		List<Model> entities = node.getComputedEntities();
		assertEquals(2, entities.size());
		
		List<BoolDatatype> details = toList(entities, BoolDatatype.class);
		
		BoolDatatype value = filterFirstByType(details, TraitDetailsEntryType.Inherited);
		assertTrue(value.isValue());
		
		value = filterFirstByType(details, TraitDetailsEntryType.Composite);
		assertNotNull(value);
		assertTrue(value.isValue());
	}
	
	private BoolDatatype filterFirstByType(List<BoolDatatype> details, TraitDetailsEntryType entryType) {
		return details.stream()
		.filter((v) -> isOfType(v, entryType))
		.findFirst()
		.get();
	}
	
	private List<BoolDatatype> filterAllByType(List<BoolDatatype> details, TraitDetailsEntryType entryType) {
		return details.stream()
		.filter((v) -> isOfType(v, entryType))
		.collect(Collectors.toList());
	}
	
	private boolean isOfType(BoolDatatype detail, TraitDetailsEntryType type)
	{
		return (detail.getDatatypePk().getEntryType() == type.getIndex());
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
