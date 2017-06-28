# Spark Monitor Extension for Jupyter Notebook
## Work in Progress
(older screenshot)
![Screenshot](screenshot.gif)
## Notes
* This version uses a scala `SparkListener` that forwards data to the kernel using sockets. The SparkConf is configured with the ports for the Listener to reach the kernel.
* The user has to configure the SparkConf object with the extension before starting spark. This sets the listener JAR path and the ports for communication
   ```python
    import sparkmonitor
    sparkmonitor.configure(conf) #conf is the instance of SparkConf
   ```

## Installation

For development purposes the extension folders are symlinked to the appropriate directories. This way making changes is easier.

First clone the repository and switch to it.

```bash
git clone https://github.com/krishnan-r/sparkmonitor/
cd sparkmonitor/extension
```

#### Front End Extension
The frontend extension is symlinked (```--symlink```) into the jupyter configuration directory in the python prefix path using (```--sysprefix```) by `jupyter nbextension` command. The second line configures the frontend extension to load on notebook startup.

```bash
jupyter nbextension install ./frontend/spark_monitor --sys-prefix --symlink
jupyter nbextension enable spark_monitor/module --sys-prefix
```

#### Kernel & Server Extension
Install the python package in editable format from the repo

```bash
pip install -e ./kernelside/
```

Create the default profile configuration files (Skip if file already exists)
```bash
ipython profile create
```
Configure the kernel to load the extension on startup. This is added to the configuration files in users home directory
```bash
echo "c.InteractiveShellApp.extensions = ['sparkmonitor']" >> ~/.ipython/profile_default/ipython_kernel_config.py 
```

To start the notebook server extension start jupyter with the following command 
```bash
jupyter notebook --NotebookApp.token='' --NotebookApp.nbserver_extensions="'sparkmonitorserver.extension':True}"
```


# Testing with multiple executors

#### To start spark with multiple executors in a single machne:

```bash
$SPARK_HOME/sbin/start-master.sh
```
```bash
SPARK_WORKER_INSTANCES=2 $SPARK_HOME/sbin/start-slave.sh -c 1 -m 512M spark://hostname:7077
```
Replace `hostname` with your hostname `-c` with number of cores and `-m` with memory per instance


To use this cluster in a notebook add: 
```python
conf=SparkConf()
conf.setMaster('spark://hostname:7077')
```
where `hostname` is the machine where spark is started (localhost doesnt seem to work)

The Master's UI is accessible at `hostname:8080` application UI at `hostname:4040`

#### To stop the spark cluster
```bash
$SPARK_HOME/sbin/stop-master.sh
$SPARK_HOME/sbin/stop-slave.sh 
```

# TODO

- Fix "currently running cell" detection when multiple cells are queued and there is an error where queue has to emptied.
    - TODO how to detect this?

- User running cell before extension has loaded in the frontend does not show display

- Automatic moving of timeline with an optional toggle button.

- Ability to Collapse Tasks in timeline

- Make display scalable

- Complete Job Table Display - TODO count number of tasks and track skipped and pending stages

- Stopping running jobs