## now:

- V:
  - api token per uživatel (column name např api_token)
  - zavést hash místo cipher pro heslo usera - asi by bylo nejsnazší současná hesla jen skriptem decipher > hash > update, takže v migraci by se přidal nový sloupec "hashed_password", smazat "temp_password". Původně jsem navrhoval jít postupně (viz temp_password column), ale teď s ekloním k tomu to udělat přímočaře, hlavně proto aby to bylo časově ohraničené a nemuselo se držet v hlavě
  - myslet na api endpoint y jako samostatnou sekci černého
- P: refresh cloud jako příprava pro migraci cevs + floraveg

## next:
- P: až po odstranění cipher = přesun repozitáře na GitHub (mj. bez zdrojáků css/js, jen minifikované), build test branch + tagy
- V: CSV pro mapu - jeslti se nepletu tak chtěli aby se tam CSV "hromadila" - ale teď se mi zdá že je to 1:1, že se drží jen poslední..:
- ```sql SELECT taxon_id, COUNT(*) AS cnt
FROM atlas.csv_map_details
GROUP BY taxon_id
HAVING COUNT(*) > 1;```
