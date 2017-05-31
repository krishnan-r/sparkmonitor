package sparkmonitor.listener

/* You can add arbitrary methods here, 
 * as long as these match corresponding Python interface 
 */
trait Listener {
  /* This will be implemented by a Python class.
   * You can of course use more specific types, 
   * for example here String => Unit */
  def notify(x: Any): Any
}