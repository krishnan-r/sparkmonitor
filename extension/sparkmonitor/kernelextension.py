"""SparkMonitor IPython Kernel Extension

Receives data from listener and forwards to frontend.
Adds a configuration object to users namespace.
"""

import socket
import logging
import os
from threading import Thread

ipykernel_imported = True
spark_imported = True
try:
    from ipykernel import zmqshell
except ImportError:
    ipykernel_imported = False

try:
    from pyspark import SparkConf
except ImportError:
    try:
        import findspark
        findspark.init()
        from pyspark import SparkConf
    except Exception:
        spark_imported = False


class ScalaMonitor:
    """Main singleton object for the kernel extension"""

    def __init__(self, ipython):
        """Constructor

        ipython is the instance of ZMQInteractiveShell
        """
        self.ipython = ipython

    def start(self):
        """Creates the socket thread and returns assigned port"""
        self.scalaSocket = SocketThread()
        return self.scalaSocket.startSocket()  # returns the port

    def getPort(self):
        """Return the socket port"""
        return self.scalaSocket.port

    def send(self, msg):
        """Send a message to the frontend"""
        self.comm.send(msg)

    def handle_comm_message(self, msg):
        """Handle message received from frontend 

        Does nothing for now as this only works if kernel is not busy.
        """
        logger.info("COMM MESSAGE:  \n %s", str(msg))

    def register_comm(self):
        """Register a comm_target which will be used by frontend to start communication."""
        self.ipython.kernel.comm_manager.register_target(
            "SparkMonitor", self.target_func)

    def target_func(self, comm, msg):
        """Callback function to be called when a frontend comm is opened"""
        logger.info("COMM OPENED MESSAGE: \n %s \n", str(msg))
        self.comm = comm

        @self.comm.on_msg
        def _recv(msg):
            self.handle_comm_message(msg)
        comm.send({"msgtype": "commopen"})


class SocketThread(Thread):
    """Class to manage a socket in a background thread to talk to the scala listener."""

    def __init__(self):
        """Constructor, initializes base class Thread."""
        self.port = 0
        Thread.__init__(self)

    def startSocket(self):
        """Starts a socket on a random port and starts listening for connections"""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.bind(("localhost", self.port))
        self.sock.listen(5)
        self.port = self.sock.getsockname()[1]
        logger.info("Socket Listening on port %s", str(self.port))
        self.start()
        return self.port

    def run(self):
        """Overrides Thread.run

        Creates a socket and waits(blocking) for connections
        When a connection is closed, goes back into waiting.
        """
        while(True):
            logger.info("Starting socket thread, going to accept")
            (client, addr) = self.sock.accept()
            logger.info("Client Connected %s", addr)
            totalMessage = ""
            while True:
                messagePart = client.recv(4096)
                if not messagePart:
                    logger.info("Scala socket closed - empty data")
                    break
                totalMessage += messagePart.decode()
                # Messages are ended with ;EOD:
                pieces = totalMessage.split(";EOD:")
                totalMessage = pieces[-1]
                messages = pieces[:-1]
                for msg in messages:
                    logger.info("Message Received: \n%s\n", msg)
                    self.onrecv(msg)
            logger.info("Socket Exiting Client Loop")
            client.shutdown(socket.SHUT_RDWR)
            client.close()

    def start(self):
        """Starts the socket thread"""
        Thread.start(self)

    def sendToScala(self, msg):
        """Send a message through the socket."""
        return self.socket.send(msg)

    def onrecv(self, msg):
        """Forwards all messages to the frontend"""
        sendToFrontEnd({
            "msgtype": "fromscala",
            "msg": msg
        })


def load_ipython_extension(ipython):
    """Entrypoint, called when the extension is loaded.

    ipython is the InteractiveShell instance
    """
    global ip, monitor  # For Debugging

    global logger
    logger = logging.getLogger("sparkmonitorkernel")
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    # For debugging this module - Writes logs to a file
    fh = logging.FileHandler("sparkmonitor_kernelextension.log", mode="w")
    fh.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(levelname)s:  %(asctime)s - %(name)s - %(process)d - %(processName)s - \
        %(thread)d - %(threadName)s\n %(message)s \n")
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    if ipykernel_imported:
        if not isinstance(ipython, zmqshell.ZMQInteractiveShell):
            logger.warn(
                "SparkMonitor: Ipython not running through notebook. So exiting.")
            return
    else:
        return

    ip = ipython
    logger.info("Starting Kernel Extension")
    monitor = ScalaMonitor(ip)
    monitor.register_comm()  # Communication to browser
    monitor.start()

    # Injecting conf into users namespace
    if spark_imported:
        # Get conf if user already has a conf for appending
        conf = ipython.user_ns.get("conf")
        if conf:
            logger.info("Conf: " + conf.toDebugString())
            if isinstance(conf, SparkConf):
                configure(conf)
        else:
            conf = SparkConf()  # Create a new conf
            configure(conf)
            ipython.push({"conf": conf})  # Add to users namespace


def unload_ipython_extension(ipython):
    """Called when extension is unloaded TODO if any"""
    logger.info("Extension Unloaded")
    pass


def configure(conf):
    """Configures the provided conf object. 

    Sets the Java Classpath and listener jar file path to "conf".
    Also sets an environment variable for ports for communication with scala listener.
    """
    global monitor
    port = monitor.getPort()
    print("SparkConf Configured, Starting to listen on port:", str(port))
    os.environ["SPARKMONITOR_KERNEL_PORT"] = str(port)
    logger.info(os.environ["SPARKMONITOR_KERNEL_PORT"])
    conf.set("spark.extraListeners",
             "sparkmonitor.listener.JupyterSparkMonitorListener")
    #jarpath = os.path.abspath(os.path.dirname(__file__)) + "/listener.jar"
    import pkg_resources
    jarpath = pkg_resources.resource_filename(__name__, "/listener.jar")
    logger.info("Adding jar from %s ", jarpath)
    print("JAR PATH:" + jarpath)
    conf.set("spark.driver.extraClassPath", jarpath)


def sendToFrontEnd(msg):
    """Send a message to the frontend through the singleton monitor object."""
    global monitor
    monitor.send(msg)
