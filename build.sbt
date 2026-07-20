name := "pladiasWeb"

version := "1.0-SNAPSHOT"

import sbt.io.Path
import scala.sys.process.Process

resolvers += Resolver.url("Typesafe Ivy releases", url("https://repo.typesafe.com/typesafe/ivy-releases"))(Resolver.ivyStylePatterns)

libraryDependencies ++= Seq(
  jdbc,
  javaWs,
  "javax.activation" % "activation" % "1.1.1",
  "com.sun.mail" % "javax.mail" % "1.6.2",
  "commons-codec" % "commons-codec" % "1.15",
  "commons-io" % "commons-io" % "2.7",
  "org.apache.commons" % "commons-text" % "1.7",
  "com.google.guava" % "guava" % "19.0",
  "org.postgresql" % "postgresql" % "9.4-1206-jdbc42",
  "org.apache.commons" % "commons-lang3" % "3.8.1",
  "org.mockito" % "mockito-core" % "4.11.0"  % "test",
  "org.apache.commons" % "commons-csv" % "1.10.0",
  "org.apache.pdfbox" % "pdfbox-app" % "1.8.17",
  "org.apache.poi" % "poi-ooxml" % "5.0.0",
  "net.postgis" % "postgis-jdbc" % "2.1.7.2",
  "org.postgresql" % "postgresql" % "42.2.29",
  "com.approvaltests" % "approvaltests" % "22.2.1",
  guice,
  javaForms,
  "com.github.karelcemus" %% "play-i18n" % "3.0.0",
  "jakarta.persistence" % "jakarta.persistence-api" % "3.1.0",
  "io.ebean" % "ebean" % "17.1.0",
  "io.ebean" % "ebean-migration" % "14.3.0",
  "io.ebean" % "ebean-ddl-generator" % "17.1.0",
  "de.mkammerer" % "argon2-jvm" % "2.12"
).map(_.withSources())

dependencyOverrides ++= Seq(
  "com.fasterxml.jackson.core" % "jackson-core" % "2.15.4",
  "com.fasterxml.jackson.core" % "jackson-annotations" % "2.15.4",
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.15.4",
  
  "com.fasterxml.jackson.module" %% "jackson-module-scala" % "2.15.4"
)
scalaVersion := "3.3.7"

// Automatically resolve version conflicts by preferring the newest revision
ThisBuild / conflictManager := ConflictManager.latestRevision

// Treat evictions as warnings instead of hard errors (you'll still see them)
ThisBuild / evictionErrorLevel := Level.Warn

lazy val root = (project in file("."))
  .enablePlugins(PlayJava, PlayEbean)

routesGenerator := InjectedRoutesGenerator

//mělo by, ale bohužel nevynutí refresh buildu
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
