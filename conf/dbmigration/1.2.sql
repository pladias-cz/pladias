-- apply alter tables
alter table geodata.phytochorions alter column name type text using name::text;
