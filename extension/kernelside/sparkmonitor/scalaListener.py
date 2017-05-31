from pyspark import SparkContext

class PythonListener(object):
    package = "sparkmonitor.listener"

    @staticmethod
    def get_manager():
        jvm = SparkContext.getOrCreate()._jvm
        manager = getattr(jvm, "{}.{}".format(PythonListener.package, "Manager"))
        return manager

    def __init__(self):
        self.uuid = None

    def notify(self, obj):
        """This method is required by Scala Listener interface
        we defined above.
        """
        print(obj)

    def register(self):
        manager = PythonListener.get_manager()
        self.uuid = manager.register(self)
        return self.uuid

    def unregister(self):
        manager =  PythonListener.get_manager()
        manager.unregister(self.uuid)
        self.uuid = None

    class Java:
        implements = ["sparkmonitor.listener.Listener"]