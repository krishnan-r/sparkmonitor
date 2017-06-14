package sparkmonitor.listener

import java.io.{File, FileWriter}

object Manager {
  var listeners: Map[String, Listener] = Map()

  def register(listener: Listener): String = {    this.synchronized {
      val uuid = java.util.UUID.randomUUID().toString
      listeners = listeners + (uuid -> listener)
      println("SPARKLISTENER: Listener registered from python: "+uuid)
      uuid

    }
  }
  def unregister(uuid: String) = {
    this.synchronized {
      listeners = listeners - uuid
    }
  }

  def notifyAll(message: String): Unit = {
    println("SPARKLISTENER: Sending messsage to python"+message)
    for {(_, listener) <- listeners} listener.notify(message)
  }
}