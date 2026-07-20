package cache;

import java.util.HashMap;
import java.util.Map;

import org.joda.time.DateTime;
import org.joda.time.ReadableInstant;

import io.ebean.Model;
import models.Taxon;
import models.TaxonMapSettings;

public class TaxonCache {
	
	class Value
	{
		public ReadableInstant expiration;
		public Object object;
	}
	
	private static TaxonCache instance = new TaxonCache();
	
	public static TaxonCache getInstance()
	{
		return instance;
	}
	
	private Map<String, Value> cache; 
	
	public TaxonCache()
	{
	    HashMap<String,Value> map = new HashMap<>();
		cache = java.util.Collections.synchronizedMap(map);
	}
	
	public void clear()
	{
	    cache.clear();
	}
	
	public Taxon getTaxon(long id)
	{
		return getObject(id, Taxon.class, new IEntityFactory<Long, Taxon>(){
			
			@Override
			public Taxon fetch(Long id) {
				return Taxon.find().byId(id);
			}
		});
	}
	
	public TaxonMapSettings getTaxonMapSettings(long id)
	{
		return getObject(id, TaxonMapSettings.class, new IEntityFactory<Long, TaxonMapSettings>(){
			
			@Override
			public TaxonMapSettings fetch(Long id) {
				return TaxonMapSettings.find().byId(id);
			}
		});
	}
	
	public void update(TaxonMapSettings settings)
	{
		String key = createKey(TaxonMapSettings.class, settings.getId());
		Value value = cache.get(key);
		if (value == null)
		{
			value = new Value();	
		}
		value.object = settings;
		value.expiration = getDefaultExpiration();
		cache.put(key, value);
	}
	
	public void update(Taxon taxon)
	{
		String key = createKey(Taxon.class, taxon.getId());
		Value value = cache.get(key);
		if (value == null)
		{
			value = new Value();	
		}
		value.object = taxon;
		value.expiration = getDefaultExpiration();
		cache.put(key, value);
	}
	
	public void clear(Taxon taxon)
	{
		String key = createKey(Taxon.class, taxon.getId());
		cache.remove(key);
	}
	
	public void clear(TaxonMapSettings settings)
	{
		String key = createKey(TaxonMapSettings.class, settings.getId());
		cache.remove(key);
	}
	
	private <T extends Model> String createKey(Class<T> clazz, long id)
	{
		return clazz.getName() + id;
	}
	
	
	private <T extends Model> T getObject(long id, Class<T> clazz, IEntityFactory<Long, T> factory){
		String key = createKey(clazz, id);
		
		Value value = cache.get(key);
		if (value == null)
		{
			value = new Value();
			value.expiration = getDefaultExpiration();
			value.object = factory.fetch(id);
			cache.put(key, value);
		}
		else 
		{
			ReadableInstant now = DateTime.now().toInstant();
			if (value.expiration != null && value.expiration.isBefore(now))
			{
				//if expired
				value.object = factory.fetch(id);
				value.expiration = getDefaultExpiration();
			}
		}
		
		return (T)value.object;
	}

	private ReadableInstant getDefaultExpiration() {
		return DateTime.now().plusMinutes(30);
	}
}
