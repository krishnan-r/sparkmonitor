[![Build Status](https://travis-ci.org/krishnan-r/sparkmonitor.svg?branch=master)](https://travis-ci.org/krishnan-r/sparkmonitor)
# Spark Monitor - An extension for Jupyter Notebook

[Google Summer of Code - Final Report](https://krishnan-r.github.io/sparkmonitor/) 
- For the google summer of code final report of this project [click here](https://krishnan-r.github.io/sparkmonitor/)  

## About
SparkMonitor is an extension for Jupyter Notebook that integrates the monitoring of Apache Spark Jobs run from the notebook interface. The extension provides various features to monitor and debug jobs run from a cell.

![jobdisplay](https://user-images.githubusercontent.com/6822941/28491063-1242eb42-6f07-11e7-8a57-abb96819ab0e.gif)
<img src="https://user-images.githubusercontent.com/6822941/29601990-d6256a1e-87fb-11e7-94cb-b4418c61d221.png" width="30%"></img> <img src="https://user-images.githubusercontent.com/6822941/29601769-d8e82a26-87fa-11e7-9b0e-91b1414e7821.png" width="30%"></img> <img src="https://user-images.githubusercontent.com/6822941/29601776-d919dae4-87fa-11e7-8939-a6c0d0072d90.png" width="30%"></img> <img src="https://user-images.githubusercontent.com/6822941/29601770-d8ea4734-87fa-11e7-9102-524d2b5193c3.png" width="30%"></img> <img src="https://user-images.githubusercontent.com/6822941/29601773-d8eda6ea-87fa-11e7-905d-9bebd62250ea.png" width="30%"></img> <img src="https://user-images.githubusercontent.com/6822941/29601997-d6533840-87fb-11e7-90ce-daa0fe73b9e5.png" width="30%"></img> 

## Features
* Automatically displays progressbars below cells that run spark jobs
* A table of jobs and stages with progressbars
* A timeline which shows jobs, stages, and tasks
* A graph showing number of active tasks & executor cores vs time
* A notebook server extension that proxies the Spark UI and displays it in an iframe popup for more details
* For a detailed list of features see the use case [notebooks](https://krishnan-r.github.io/sparkmonitor/#common-use-cases-and-tests)
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