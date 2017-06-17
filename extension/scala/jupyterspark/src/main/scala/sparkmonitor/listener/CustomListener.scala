package sparkmonitor.listener

import org.apache.spark.scheduler._
import org.json4s._
import org.json4s.JsonDSL._
import org.json4s.jackson.JsonMethods._
import org.apache.spark._

import org.apache.spark.SparkContext

import java.net._
import java.io._

class PythonNotifyListener(conf: SparkConf) extends SparkListener {
	println("SPARKLISTENER: Started ScalaListener Constructor")
  	println("SPARKLISTENER: Configuration: "+conf+"\n")
	
	val port = conf.get("sparkmonitor.port")
  	println("SPARKLISTENER: connecting to port"+conf.get("sparkmonitor.port"))

	val socket = new Socket("localhost",port.toInt)
	val out = new OutputStreamWriter(socket.getOutputStream())

	def send(msg:String):Unit={
		println("\nSPARKLISTENER: --------------Sending Message:------------------\n"+msg+
		"\nSPARKLISTENER: -------------------------------------------------\n")
		out.write(msg+";EOD:")
		out.flush()
	}

	def closeConnection():Unit={
		println("SPARKLISTNER: Closing Connection")
		out.close()
		socket.close()
	}

//--------------Listener Overrided functions-------------------------------------------------

	
	override def onApplicationStart(appStarted: SparkListenerApplicationStart):Unit = {
		println("SPARKLISTENER Application Started...Start Time: "+appStarted.time)
		send("SPARKLISTENER Application Started...Start Time: "+appStarted.time)
  	}

 	override def onApplicationEnd(appEnded: SparkListenerApplicationEnd):Unit =  {
		println("SPARKLISTENER Application ending...End Time: "+appEnded.time)
		send("SPARKLISTENER Application ending...End Time: "+appEnded.time)
  	}

	override def onJobStart(jobStart: SparkListenerJobStart): Unit = synchronized {

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
		 println("SPARKLISTENER JobStart: \n"+ pretty(render(json)) + "\n")

	}

	override def onJobEnd(jobEnd: SparkListenerJobEnd): Unit = synchronized {

		val json=("jobId" -> jobEnd.jobId) ~
    	("completionTime" -> Option(jobEnd.time).filter(_ >= 0))

 		println("SPARKLISTENER Job End: \n"+ pretty(render(json)) + "\n")
 
  	}

}


object PythonNotifyListener {
	def main(args: Array[String]): Unit = {
		println("SPARKLISTENER: Main Started (not called from spark)")
	}
}