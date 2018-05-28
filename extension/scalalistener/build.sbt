name := "sparkmonitor"

version := "1.0"

scalaVersion := "2.11.8"

organization := "cern"

val sparkVersion = "2.1.1"

libraryDependencies ++= List(
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "net.sf.py4j" % "py4j" % "0.10.4"
)
artifactPath in Compile in packageBin :=
   (baseDirectory { base => base / "../sparkmonitor/listener.jar" }).value
