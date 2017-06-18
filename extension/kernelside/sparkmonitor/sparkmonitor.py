import socket
from threading import Thread
import logging
from ipykernel import zmqshell
import os


class ScalaMonitor:
    def __init__(self, ipython):
        self.ipython = ipython

    def start(self):
        self.scalaSocket = SocketThread()
        self.scalaSocket.startSocket()

    def getPort(self):
        return self.scalaSocket.port

    def send(self, msg):
        self.comm.send(msg)

    def handle_comm_message(self, msg):
        logger.info('COMM MESSAGE:  \n %s', str(msg))

    def register_comm(self):
        self.ipython.kernel.comm_manager.register_target(
            'SparkMonitor', self.target_func)

    def target_func(self, comm, msg):
        logger.info("COMM OPENED MESSAGE: \n %s \n", str(msg))
        self.comm = comm

        @self.comm.on_msg
        def _recv(msg):
            self.handle_comm_message(msg)
        comm.send({'msgtype': 'commopen'})


class SocketThread(Thread):

    def __init__(self):
        self.port = 0
        Thread.__init__(self)

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
                totalMessage += messagePart
                pieces = totalMessage.split(";EOD:")
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

    def onrecv(self, msg):
        sendToFrontEnd({
            'msgtype':"fromscala",
            'msg':msg
        })
        pass

#---------------------------------Module level functions for ipython exten


def load_ipython_extension(ipython):
    # Called when the extension is loaded.
    # ipython is the InteractiveShell instance
    global ip, monitor

    #-----Configure logging for the extension, currently writing to a file in same directory as notebook.

    global logger
    logger = logging.getLogger('sparkscalamonitor')
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    fh = logging.FileHandler('scalamonitorextension.log')  # ,mode='w')
    fh.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        '%(levelname)s:  %(asctime)s - %(name)s - %(process)d - %(processName)s - \
        %(thread)d - %(threadName)s\n %(message)s \n')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    #-------------------------------------------------------------------------

    if not isinstance(ipython, zmqshell.ZMQInteractiveShell):
        logger.warn(
            "SparkMonitor: Ipython not running through notebook. So exiting.")
        return

    ip = ipython
    logger.info('Starting Kernel Extension')
    monitor = ScalaMonitor(ip)
    monitor.register_comm()
    monitor.start()


def unload_ipython_extension(ipython):
    # Called when extension is unloaded TODO
    logger.info("Extension UNLOADED")
    pass


def configure(conf):
    global monitor
    port = monitor.getPort()
    print("SparkConf Configured, Starting to listen on port:", str(port))
    logger.info("SparkConf configured with port %s", str(port))
    # Configuring Spark Conf
    conf.set("sparkmonitor.port", port)
    conf.set('spark.extraListeners',
             'sparkmonitor.listener.PythonNotifyListener')
    # TODO make the jar relative to package path in such a way that pip
    # install does not break path.
    jarpath = os.path.abspath(os.path.dirname(__file__)) + "/listener.jar"
    logger.info("Adding jar from %s ", jarpath)
    print("JAR PATH:" + jarpath)
    conf.set('spark.driver.extraClassPath', jarpath)


def sendToFrontEnd(msg):
    global monitor
    monitor.send(msg)
