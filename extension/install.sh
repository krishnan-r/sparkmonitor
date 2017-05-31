#symlinking extensions to appropriate directory - for debugging only

#Front End Extension
jupyter nbextension install frontend/spark_monitor/ --sys-prefix --symlink
jupyter nbextension enable spark_monitor/module --sys-prefix

#Kernel Extension
ln -s ./extension/kernelside/sparkmonitor/ ~/.ipython/extensions/sparkmonitor
