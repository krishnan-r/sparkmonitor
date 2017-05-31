from ipykernel.comm import Comm
# TODO Take care of cases where spark is not installed
from pyspark import SparkContext
from threading import Thread
import time
import logging
from .monitorlistener import MonitorSparkListener


class Monitor():

    def __init__(self,ipython):
        global logger
        self.ipython=ipython
        logger=logging.getLogger('sparkmonitor.monitor')
        logger.info('init monitor called')

    def connectContext(self, sc):
        logger.info('SparkContext supplied by user')
        self.sc = sc

    def startMonitor(self):
        if not hasattr(self,'listener'):
            self.listener=MonitorSparkListener(self)
            self.listener.register(self.sc)
        else: logger.warn('Listener already registered.')

    def send(self,msg):
        self.comm.send(msg)

    def handle_message(self,msg): 
        logger.info('Comm Message: %s',msg)

    def register_comm(self):
        logger.info('Registering comm from kernel')
        self.comm = Comm(target_name='SparkMonitor', data={'msgtype': 'commopen'})
        logger.info('Comm registered %s',self.comm)
        
        # Add a callback for received messages.
        @self.comm.on_msg
        def _recv(msg):
            self.handle_message(msg)
        
