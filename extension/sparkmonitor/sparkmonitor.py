import socket
from threading import Thread
import logging
ipykernel_imported = True
spark_imported = True
try:
    from ipykernel import zmqshell
except ImportError:
    ipykernel_imported = False

try:
    from pyspark import SparkConf
except ImportError:
    spark_imported = False

import os


class ScalaMonitor:
    # Main singleton object for the kernel extension
    def __init__(self, ipython):
        self.ipython = ipython

    def start(self):
        self.scalaSocket = SocketThread() 
        return self.scalaSocket.startSocket() # returns the port

    def getPort(self):
        return self.scalaSocket.port

    def send(self, msg):
        self.comm.send(msg)

    def handle_comm_message(self, msg):
        # Handle message recieved from frontend - do nothing for now as this only works if kernel is not busy
        logger.info('COMM MESSAGE:  \n %s', str(msg))

    def register_comm(self):
        # Register a comm_target which will be used by frontend to start communications.
        self.ipython.kernel.comm_manager.register_target(
            'SparkMonitor', self.target_func)

    def target_func(self, comm, msg):
        # On frontend comm opened
        logger.info("COMM OPENED MESSAGE: \n %s \n", str(msg))
        self.comm = comm

        @self.comm.on_msg
        def _recv(msg):
            self.handle_comm_message(msg)
        comm.send({'msgtype': 'commopen'})


class SocketThread(Thread):
    # Class to manage a socket in a background thread to talk to the scala listener
    def __init__(self):
        self.port = 0
        Thread.__init__(self)

    # Starts a socket on a random port and starts listening for connections
    def startSocket(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.bind(("localhost", self.port))
        self.sock.listen(5)
        self.port = self.sock.getsockname()[1]
        logger.info("Socket Listening on port %s", str(self.port))
        self.start()
        return self.port

    def run(self):
        while(True):
            logger.info("Starting socket thread, going to accept")
            (client, addr) = self.sock.accept()
            logger.info("Client Conntected %s", addr)
            totalMessage = ""
            while True:
                messagePart = client.recv(4096)
                if not messagePart:
                    logger.info("Scala socket closed - empty data")
                    break
                totalMessage += messagePart.decode()
                pieces = totalMessage.split(";EOD:") #Messages are ended with ;EOD: 
                totalMessage = pieces[-1]
                messages = pieces[:-1]
                for msg in messages:
                    logger.info("Message Recieved: \n%s\n", msg)
                    self.onrecv(msg)
            logger.info("Socket Exiting Client Loop")
            client.shutdown(socket.SHUT_RDWR)
            client.close()

    def start(self):
        Thread.start(self)

    def sendToScala(self, msg):
        return self.socket.send(msg)

    # Forwards all messages to the frontend
    def onrecv(self, msg):
        sendToFrontEnd({
            'msgtype': "fromscala",
            'msg': msg
        })
        pass

#-----------------Module level functions for ipython extension


def load_ipython_extension(ipython):
    # Called when the extension is loaded.
    # ipython is the InteractiveShell instance
    global ip, monitor  #For Debugging

    #-----Configure logging for the extension, currently writing to a file in same directory as notebook.

    global logger
    logger = logging.getLogger('sparkscalamonitor')
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    # For debugging this module - Writes logs to a file
    fh = logging.FileHandler('sparkmonitor_kernelextension.log',mode='w')
    fh.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        '%(levelname)s:  %(asctime)s - %(name)s - %(process)d - %(processName)s - \
        %(thread)d - %(threadName)s\n %(message)s \n')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    #-------------------------------------------------------------------------

    if ipykernel_imported:
        if not isinstance(ipython, zmqshell.ZMQInteractiveShell):
            logger.warn(
                "SparkMonitor: Ipython not running through notebook. So exiting.")
            return
    else:
        return

    ip = ipython
    logger.info('Starting Kernel Extension')
    monitor = ScalaMonitor(ip)
    monitor.register_comm()    # Communication to browser
    monitor.start()

    # Injecting conf into users namespace
    if(spark_imported):
        conf = ipython.user_ns.get('conf') # Get conf if user already has a conf for appending
        
        if(conf):
            logger.info("Conf: "+conf.toDebugString())
            if(isinstance(conf, SparkConf)):
                configure(conf)
            else:
                # If conf already exists and is not SparkConf then do nothing.
                pass
        else:
            # Create a new conf if one does not exist
            conf = SparkConf()
            configure(conf)
            ipython.push({
                "conf": conf
            }) # Add to users namespace
    else:
        # There is no pySpark module. do nothing
        pass


def unload_ipython_extension(ipython):
    # Called when extension is unloaded TODO if any
    logger.info("Extension UNLOADED")
    pass


def configure(conf):
    # Configures the provided conf object with the Java Classpath as well as JAR file path
    # Also sets environment variable for ports for communication with scala listener
    global monitor
    port = monitor.getPort()
    print("SparkConf Configured, Starting to listen on port:", str(port))
   
   
    # logger.info("SparkConf configured with port %s", str(port))
    # Configuring Spark Conf
    # conf.set("spark.monitor.port", port) #spark discards configs without spark[dot]*

    os.environ["SPARKMONITOR_KERNEL_PORT"] = str(port)

    logger.info(os.environ["SPARKMONITOR_KERNEL_PORT"])
    conf.set('spark.extraListeners',
             'sparkmonitor.listener.PythonNotifyListener')

    jarpath = os.path.abspath(os.path.dirname(__file__)) + "/listener.jar"
    logger.info("Adding jar from %s ", jarpath)
    print("JAR PATH:" + jarpath)
    conf.set('spark.driver.extraClassPath', jarpath)


def sendToFrontEnd(msg):
    # Send a message to the frontend through the singleton monitor object
    global monitor
    monitor.send(msg)
