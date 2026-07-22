## now:

**V:**
- mapový náhled výsledků vyhledávání, bulkEdit

**P:**
- pomalost databáze v CERIT
- optimalizace detailMap

## next:
**V:**
- CSV pro mapu - jeslti se nepletu tak chtěli aby se tam CSV "hromadila" - ale teď se mi zdá že je to 1:1, že se drží jen poslední..:
```sql SELECT taxon_id, COUNT(*) AS cnt
    FROM atlas.csv_map_details
    GROUP BY taxon_id
    HAVING COUNT(*) > 1;
```

**P:**
- floraveg/cevs do ceritu jako text
- mykoTest v cerit
