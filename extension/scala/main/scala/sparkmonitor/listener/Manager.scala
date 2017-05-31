package sparkmonitor.listener

object Manager {
  var listeners: Map[String, Listener] = Map()

  def register(listener: Listener): String = {
    this.synchronized {
      val uuid = java.util.UUID.randomUUID().toString
      listeners = listeners + (uuid -> listener)
      uuid
    }
  }

  def unregister(uuid: String) = {
    this.synchronized {
      listeners = listeners - uuid
    }
  }

  def notifyAll(message: String): Unit = {
    for { (_, listener) <- listeners } listener.notify(message)
  }

}