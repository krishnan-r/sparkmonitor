#symlinking extensions to appropriate directory - for debugging only

#Front End Extension
jupyter nbextension install frontend/spark_monitor/ --sys-prefix --symlink
jupyter nbextension enable spark_monitor/module --sys-prefix

#Kernel Extension
ln -s ./extension/kernelside/sparkmonitor/ ~/.ipython/extensions/sparkmonitor

#Create the default profile 
ipython profile create

#Configure the kernel to load the extension on startup
echo "c.InteractiveShellApp.extensions = ['sparkmonitor.sparkmonitor']" >> ~/.ipython/profile_default/ipython_kernel_config.py 

