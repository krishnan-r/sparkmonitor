name := "listener"

organization := "sparkmonitor"

scalaVersion := "2.11.8"

val sparkVersion = "2.1.1"

libraryDependencies ++= List(
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "net.sf.py4j" % "py4j" % "0.10.4"  // Just for the record
)