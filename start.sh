#/bin/bash

cd /home/ubuntu/app && java -cp "lib/*:conf" db.DbMigrationRunner jdbc:postgresql://$DB_HOST:5432/$DB_NAME pladias $DB_PLADIAS_PASSWORD
/home/ubuntu/app/bin/pladiasweb
