# Changes in DB

Change the classes in `app/models`. Then run the next command. The development container 'play' from [GitHub](https://github.com/pladias-cz/sbt/tree/v2) is required.

```
docker compose run --rm play generateDDL
```

This will generate the model change files:
* `conf/dbmigration/1.X.sql` with the SQL code to update the database.
  You can edit the SQL code (for example, add an index or adjust some values).
* `conf/dbmigration/1.X.model.xml` with changes from the previous model.

Check the SQL file and then you can try applying the changes to the development database.

```
docker compose run --rm play "runMigrations jdbc:postgresql://pladias_master:5432/pladias pladias pladias"
```