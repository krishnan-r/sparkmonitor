# Google Summer of Code 2017 Final Report
# Big Data Tools for Physics Analysis
## The SparkMonitor Extension
![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)
## Introduction
This goal of this project was to make a Big Data tool like Apache Spark easier to use with an interactive interface like Jupyter. This project integrates Jupyter with Apache Spark by providing tools for monitoring and visualizing Apache Spark Jobs inside Jupyter Notebook. As a part of that, an extension has been built for Jupyter called 'SparkMonitor'

## Work Done
- The extension 'SparkMonitor' has been built for Jupyter Notebook to monitor Apache Spark running through pySpark.
- The extension integrates with Jupyter seamlessly, providing realtime monitoring for jobs running in clusters.
- The extension has been integrated with a beta version of SWAN - a cloud multi user jupyter notebook deployment based on JupyterHub running on CERN IT infrastructure.
- Various tests have been done with real world use cases.


### Pending Work
- Ability to control and cancel running jobs.
    
### Future Ideas
- Support for Scala Notebooks
- Interface for easier configuration of Spark Applications

### Deployment of Work Done
The 'SparkMonitor' extension is packaged as a python pip package. It is availbale for download from [Github Releases](https://github.com/krishnan-r/sparkmonitor/releases).

#### Integration with CERN IT Infrastructure
- The extension has been successfully integrated with a beta version of SWAN, a cloud version of JupyterHub that runs at CERN, based on docker containers.
- The integration is made possible through customizations to the docker container image spawned by jupyterhub
- The extension is loaded to Jupyter whenever the user attaches a Spark Cluster to the notebook environment.
- The custom docker spawner image can be found [here](https://hub.docker.com/r/krishnanr/sparkmonitorhub/)



## Common Use Cases and Tests

The extension has been tested with a range of applications by running spark standalone locally as well as using Spark Clusters at CERN.
Here is a list of test cases that have been run.
- [A simple random example](usecase_testing.md)
- [Spark Training Notebooks used at CERN](usecase_sparktraining.md)
- [A DistROOT example](usecase_distroot.md)

## Documentation

### How it Works
- A detailed explanation of how different components in the extension work together can be found [here](how.md)

### Code Documentation
- All the documentation for the code in Python, Javascript and Scala is available within the [source files](https://github.com/krishnan-r/sparkmonitor) itself.


### Installation 
- The extension is available as a pip python package through [Github Releases](https://github.com/krishnan-r/sparkmonitor/releases).
- To install and configure the extension or to build from source, follow the instructions [here](install.md).


## Usefull Links
- [SparkMonitor](https://github.com/krishnan-r/sparkmonitor) Github Repository
- [SparkMonitorHub](https://github.com/krishnan-r/sparkmonitorhub) - An integration for SWAN - A multiuser cloud notebook service based on JupyterHub.
- [Initial Project Proposal](https://docs.google.com/document/d/1J2zIRnEAvey8HcDyqrKZ2DeQJXLvhU5HR2WdxZ9o8Yk/edit?usp=sharing)
- [Initial Idea Page of Organisation](http://hepsoftwarefoundation.org/gsoc/proposal_ROOTspark.html)
- [Travis Build for SparkMonitor](https://travis-ci.org/krishnan-r/sparkmonitor)
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitor/) for testing locally based on Scientific Linux CERN 6
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitorhub/) for SWAN
- [SparkMonitor Python Package](https://github.com/krishnan-r/sparkmonitor/releases) - Github Release



