package sparkmonitor.listener

import org.apache.spark.scheduler._
import org.json4s._
import org.json4s.JsonDSL._
import org.json4s.jackson.JsonMethods._
import org.apache.spark._


import org.apache.spark.SparkContext


class PythonNotifyListener(conf: SparkConf) extends SparkListener {
  println("Configuration: "+conf)

  override def onJobStart(jobStart: SparkListenerJobStart): Unit = synchronized {
    println("SPARKLISTENER: Job Started" + jobStart)

 val jobGroup = for (
      props <- Option(jobStart.properties);
      group <- Option(props.getProperty("spark.jobGroup.id"))
    ) yield group
 
 val numTasks= {
      val allStages = jobStart.stageInfos
      val missingStages = allStages.filter(_.completionTime.isEmpty)
      missingStages.map(_.numTasks).sum
    }

val json= ("jobGroup" -> jobGroup) ~
          ("jobId" -> jobStart.jobId) ~
          ("status" -> "RUNNING") ~
          ("submissionTime" -> Option(jobStart.time).filter(_ >= 0)) ~
          ("stageIds" -> jobStart.stageIds) ~
          ("numTasks" -> numTasks)

 println("SPARKLISTENER JobStart: "+ pretty(render(json)))

  }
  

override def onJobEnd(jobEnd: SparkListenerJobEnd): Unit = synchronized {
   
    var status
    jobEnd.jobResult match {
      case JobSucceeded =>
        status = "SUCCEEDED"
      case JobFailed(_) =>
        status = "FAILED"
      }
     
   val json=("jobId" -> jobEnd.jobId) ~
          ("status" -> status) ~
          ("completionTime" -> Option(jobEnd.time).filter(_ >= 0)) ~
          ("stageIds" -> jobStart.stageIds) ~
          ("numTasks" -> numTasks)

 println("SPARKLISTENER JobStart: "+ pretty(render(json)))
 
  }


















  override def onTaskEnd(taskEnd: SparkListenerTaskEnd) {
    val recordsWritten = taskEnd.taskMetrics.outputMetrics.recordsWritten
    //val message = compact(render(
//      ("recordsWritten" -> recordsWritten)
  //  ))
    //Manager.notifyAll(message)
  }
}

object PythonNotifyListener {
  def main(args: Array[String]): Unit = {
    println("SPARKLISTENER: Main Started (not called from spark)")
  }
}
