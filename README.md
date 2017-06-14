# Spark Monitor Extension for Jupyter Notebook
## Work in Progress
![Screenshot](screenshot.gif)
## Notes
* This version uses a python based `SparkListener` attached to the `SparkContext`. (Scala listeners coming soon)
* The extension requires the user to call `connectContext(sc)` after the context is created, from the notebook to start working (Requirement will be removed in future)
 * ```python
   from sparkmonitor import sparkmonitor
   sparkmonitor.connectContext(sc) #sc - SparkContext
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

#### Kernel Extension
The ipython kernel extension has to be put in a directory which is importable by python code.
Here we symlink the folder into the ipython extension directory.

```bash
ln -s ./extension/kernelside/sparkmonitor/ ~/.ipython/extensions/sparkmonitor
```

Create the default profile configuration files (Skip if file already exists)
```bash
ipython profile create
```
Configure the kernel to load the extension on startup. This is added to the configuration files in users home directory
```bash
echo "c.InteractiveShellApp.extensions = ['sparkmonitor.sparkmonitor']" >> ~/.ipython/profile_default/ipython_kernel_config.py 
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

- Complete scala based listener
    - Process all data in scala and compute metrics - Python only shall forward JSON strings to frontend
    - Fix cases with inconsistent data - in some cases onStageSubmitted does not have submission time for active non-skipped stages (Why?)

- Fix "currently running cell" detection when multiple cells are queued and there is an error where queue has to emptied.
    - TODO how to detect this?

- Fix race conditions when a task/stage is started/ended from a cell but message arrives late.

- Automatic moving of timeline with an optional toggle button.

- Fix errors when updating timeline while tasks group is collapsed.

- Remove old jobs from past runs, beyond a threshold limit 

- Add Job Table Display - TODO count number of tasks and track skipped and pending stages

- Stopping running jobs in a better way

- Multiple notebooks running, not working because py4j callback server occupies the port