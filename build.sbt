name := "pladiasWeb"

version := "1.0-SNAPSHOT"

import sbt.io.Path
import scala.sys.process.Process

libraryDependencies ++= Seq(
  jdbc,
  javaWs,
  "org.eclipse.angus" % "angus-mail" % "2.0.5",
  "commons-codec" % "commons-codec" % "1.23.0",
  "commons-io" % "commons-io" % "2.22.0",
  "org.apache.commons" % "commons-text" % "1.15.0",
  "com.google.guava" % "guava" % "33.8.0-jre",
  "org.apache.commons" % "commons-lang3" % "3.21.0",
  "org.mockito" % "mockito-core" % "5.24.0"  % "test",
  "org.apache.commons" % "commons-csv" % "1.14.1",
  "org.apache.pdfbox" % "pdfbox" % "3.0.8",
  "org.apache.poi" % "poi-ooxml" % "5.5.1",
  "net.postgis" % "postgis-jdbc" % "2025.1.1",
  "org.postgresql" % "postgresql" % "42.7.14",
  "com.approvaltests" % "approvaltests" % "22.2.1" % Test,
  guice,
  javaForms,
  "com.github.karelcemus" %% "play-i18n" % "3.0.0",
  "de.mkammerer" % "argon2-jvm" % "2.12"
)

// Align Jackson versions: Play/Pekko are built against 2.14.x, Ebean 19.6 against 2.22.x.
// jackson-module-scala must have the same minor version as jackson-databind, otherwise the app fails at startup.
// Since 2.20, jackson-annotations uses a two-part version only (e.g. "2.22").
val jacksonVersion = "2.22.4"
val jacksonAnnotationsVersion = "2.22"

dependencyOverrides ++= Seq(
  "com.fasterxml.jackson.core" % "jackson-core" % jacksonVersion,
  "com.fasterxml.jackson.core" % "jackson-annotations" % jacksonAnnotationsVersion,
  "com.fasterxml.jackson.core" % "jackson-databind" % jacksonVersion,
  "com.fasterxml.jackson.module" %% "jackson-module-scala" % jacksonVersion,
  "com.fasterxml.jackson.module" % "jackson-module-parameter-names" % jacksonVersion,
  "com.fasterxml.jackson.datatype" % "jackson-datatype-jdk8" % jacksonVersion,
  "com.fasterxml.jackson.datatype" % "jackson-datatype-jsr310" % jacksonVersion,
  "com.fasterxml.jackson.dataformat" % "jackson-dataformat-cbor" % jacksonVersion
)
scalaVersion := "3.3.9"

lazy val root = (project in file("."))
  .enablePlugins(PlayJava, PlayEbean)

routesGenerator := InjectedRoutesGenerator

// Should work, but unfortunately does not force a build refresh
watchSources ++= {
  val manifest = baseDirectory.value / "public" / "react" / ".vite" / "manifest.json"
  if (manifest.exists) Seq(manifest) else Seq.empty[File]
}

watchSources ++= {
  val frontendSrc = file("frontend/src")
  (frontendSrc ** "*").get.filter(_.isFile)
}

Universal / mappings ++= {
  val publicDir = baseDirectory.value / "public"
  Path.allSubpaths(publicDir).toSeq.map { case (file, rel) =>
    file -> s"public/$rel"
  }
}

// Ebean Migration Tasks
lazy val generateDDL = taskKey[Unit]("Generuje DDL migrační soubory z Ebean modelů")
lazy val generateBaseline = taskKey[Unit]("Generuje baseline DDL pro existující databázi")
lazy val runMigrations = inputKey[Unit]("Spustí databázové migrace")

generateDDL := {
  (Compile / runMain).toTask(" db.DDLGenerator generate").value
}

generateBaseline := {
  (Compile / runMain).toTask(" db.DDLGenerator baseline").value
}

runMigrations := {
  import scala.util.{Try, Success, Failure}

  val args = Def.spaceDelimited("<jdbcUrl> <username> <password>").parsed
  if (args.length != 3) {
    throw new IllegalArgumentException("Usage: runMigrations <jdbcUrl> <username> <password> (example: jdbc:postgresql://localhost:5432/pladias play play)")
  }
  val Seq(jdbcUrl, username, password) = args
  
  val cp = (Compile / fullClasspath).value
  val r = (Compile / runner).value
  val s = streams.value
  
  val result: Try[Unit] = r.run("db.DbMigrationRunner", cp.files, Seq(jdbcUrl, username, password), s.log)
  result match {
    case Failure(exception) => sys.error(s"Migration failed: ${exception.getMessage}")
    case Success(_) => s.log.info("Migration success.")
  }
}
