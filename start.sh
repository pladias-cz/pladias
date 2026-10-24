```bash
#!/bin/bash
set -e # stop if anything went wrong

cd /home/ubuntu/app

echo "Starting database migration..."

: "${DB_HOST:?DB_HOST is not set}"
: "${DB_NAME:?DB_NAME is not set}"
: "${DB_USER:?DB_USER is not set}"
: "${DB_PASSWORD:?DB_PASSWORD is not set}"

java -cp "lib/*:conf" db.DbMigrationRunner \
  "jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}" \
  "$DB_USER" "$DB_PASSWORD"

echo "Migration finished successfully."

exec /home/ubuntu/app/bin/pladiasweb
```
