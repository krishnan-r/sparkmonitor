[![Build Status](https://travis-ci.org/krishnan-r/sparkmonitor.svg?branch=master)](https://travis-ci.org/krishnan-r/sparkmonitor)
# Spark Monitor - An extension for Jupyter Notebook

[Google Summer of Code - Final Report](https://krishnan-r.github.io/sparkmonitor/) 
- For the google summer of code final report of this project [click here](https://krishnan-r.github.io/sparkmonitor/)  

## About
SparkMonitor is an extension for Jupyter Notebook that integrates the monitoring of Apache Spark Jobs run from the notebook interface. The extension provides various features to monitor and debug jobs run from a cell.

![jobdisplay](https://user-images.githubusercontent.com/6822941/28491063-1242eb42-6f07-11e7-8a57-abb96819ab0e.gif)

## Features
* Automatically displays progressbars below cells that run spark jobs
* A table of jobs and stages with progressbars
* A timeline which shows jobs, stages, and tasks
* A graph showing number of active tasks & executor cores vs time
* A notebook server extension that proxies the Spark UI and displays it in an iframe popup for more details
* For a detailed list of features see the use case [notebooks]()
* [How it Works]()

### Quick Installation 
```bash 
pip install https://github.com/krishnan-r/sparkmonitor/releases/download/v0.0.1/sparkmonitor.tar.gz #Use latest version as in github releases

jupyter nbextension install sparkmonitor --py --user --symlink 
jupyter nbextension enable sparkmonitor --py --user            
jupyter serverextension enable --py --user sparkmonitor
ipython profile create && echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```
#### For more detailed instructions [click here]()
#### To do a quick test of the extension
```bash
docker run -it -p 80:8888 krishnanr/sparkmonitor
```