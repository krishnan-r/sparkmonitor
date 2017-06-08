from ipykernel import zmqshell
from .monitor import Monitor
import logging


def connectContext(sc):
    global monitor
    monitor.connectContext(sc)
    monitor.startMonitor()

def load_ipython_extension(ipython):
    # Called when the extension is loaded.
    # ipython is the InteractiveShell instance
    global ip, monitor
    
    #-----Configure logging for the extension, currently writing to a file.
    global logger
    logger = logging.getLogger('sparkmonitor')
    logger.setLevel(logging.DEBUG)
    logger.propagate=False
    fh = logging.FileHandler('monitorextension.log',mode='w')
    fh.setLevel(logging.DEBUG)
   
    formatter = logging.Formatter('%(levelname)s:  %(asctime)s - %(name)s - %(process)d - %(processName)s - %(thread)d - %(threadName)s\n %(message)s \n')
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    #------

    if not isinstance(ipython, zmqshell.ZMQInteractiveShell):
        logger.warn("SparkMonitor: Ipython not running through notebook. So exiting.")
        return
    
    ip = ipython
    monitor = Monitor(ip)
    monitor.register_comm()
 
def unload_ipython_extension(ipython):
    # Called when extension is unloaded
    pass
