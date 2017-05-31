package sparkmonitor.listener

import org.apache.spark.scheduler.{SparkListener, SparkListenerTaskEnd}
import org.json4s._
import org.json4s.JsonDSL._
import org.json4s.jackson.JsonMethods._

/* A simple listener which captures SparkListenerTaskEnd,
 * extracts numbers of records written by the task
 * and converts to JSON. You can of course add handlers 
 * for other events as well.
 */
class PythonNotifyListener extends SparkListener { 


  override def onTaskEnd(taskEnd: SparkListenerTaskEnd) {
    val recordsWritten = taskEnd.taskMetrics.outputMetrics.recordsWritten
    val message = compact(render(
      ("recordsWritten" ->  recordsWritten)
    ))
    Manager.notifyAll(message)
  }
}