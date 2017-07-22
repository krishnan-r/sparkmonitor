[![Build Status](https://travis-ci.org/krishnan-r/sparkmonitor.svg?branch=master)](https://travis-ci.org/krishnan-r/sparkmonitor)
# Spark Monitor - An extension for Jupyter Notebook

## Work in Progress
![jobdisplay](https://user-images.githubusercontent.com/6822941/28491063-1242eb42-6f07-11e7-8a57-abb96819ab0e.gif)

## Notes
* This version uses a scala `SparkListener` that forwards data to the kernel using sockets. The SparkConf is configured to start the listener which is bundled and included as a jar in the python package.
* The ipython extension automatically adds a SparkConf to the users namespace.

## Installation
### Quick Install 
```bash 
pip install https://github.com/krishnan-r/sparkmonitor/releases/download/v0.0.1/sparkmonitor.tar.gz #Use latest version as in github releases
#Frontend
jupyter nbextension install sparkmonitor --py --user --symlink
jupyter nbextension enable sparkmonitor --py --user
#NotebookServer
jupyter serverextension enable --py --user sparkmonitor
#Kernel
ipython profile create
echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```
### Details

1. Install the python package in the latest tagged github release. The python package contains the javascript resources and the listener jar file.

```bash
pip install https://github.com/krishnan-r/sparkmonitor/releases/sparkmonitor.tar.gz  # sparkmonitor.zip for Windows
```

2. The frontend extension is symlinked (```--symlink```) into the jupyter configuration directory by `jupyter nbextension` command. The second line configures the frontend extension to load on notebook startup.

```bash
jupyter nbextension install --py sparkmonitor --user --symlink
jupyter nbextension enable sparkmonitor --user --py
```
3. Configure the serverextension to load when the notebook server starts

```bash
 jupyter serverextension enable --py --user sparkmonitor
```

4. Create the default profile configuration files (Skip if config file already exists)
```bash
ipython profile create
```
5. Configure the kernel to load the extension on startup. This is added to the configuration files in users home directory
```bash
echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```
## Build from Source
```bash
git clone https://github.com/krishnan-r/sparkmonitor
cd sparkmonitor/extension
#Build Javascript
yarn install
npm webpack -p
#Build Scala jar
cd scalalistener/jupyterspark/
sbt package
#Install as python package in editable format
pip install -e .
# sparkmonitor package is not installed. Configure with jupyter as above.
```

# Testing with Docker
To do a quick test of the extension run the following docker container and connect to port 80 of localhost.
```bash
docker pull krishnanr/sparkmonitor
docker run -it -p 80:8888 krishnanr/sparkmonitor
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
