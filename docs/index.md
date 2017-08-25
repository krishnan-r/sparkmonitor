___
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](#common-use-cases-and-tests)** |
**[Github](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**
___

# Google Summer of Code 2017 Final Report
# Big Data Tools for Physics Analysis
## The SparkMonitor Extension
![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)
## Introduction
This goal of this project was to make a Big Data tool like Apache Spark easier to use with an interactive interface like Jupyter. This project integrates Jupyter with Apache Spark by providing tools for monitoring and visualizing Apache Spark Jobs inside Jupyter Notebook. As a part of that, an extension has been built for Jupyter called 'SparkMonitor'

## Work Done
- The extension 'SparkMonitor' has been built for Jupyter Notebook to monitor Apache Spark running through pySpark.
- The extension integrates with Jupyter seamlessly, providing real time monitoring for jobs running in clusters.
- The extension has been integrated with a beta version of SWAN - a cloud multi user Jupyter notebook deployment based on JupyterHub running on CERN IT infrastructure.
- Various tests have been done with real world use cases.


### Pending Work
- Ability to control and cancel running jobs.
    
### Future Ideas
- Support for Scala Notebooks
- Interface for easier configuration of Spark Applications

### Deployment of Work Done
The 'SparkMonitor' extension is packaged as a python pip package. It is available for download from [Github Releases](https://github.com/krishnan-r/sparkmonitor/releases).

#### Integration with CERN IT Infrastructure
- The extension has been successfully integrated with a beta version of SWAN, a cloud version of JupyterHub that runs at CERN, based on docker containers.
- The integration is made possible through customizations to the docker container image spawned by JupyterHub
- The extension is loaded to Jupyter whenever the user attaches a Spark Cluster to the notebook environment.
- The custom docker spawner image files can be found [here](https://github.com/krishnan-r/sparkmonitorhub)



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
- All the documentation for the code in Python, JavaScript and Scala is available within the [source files](https://github.com/krishnan-r/sparkmonitor) itself.

### Installation 
- The extension is available as a pip python package through [Github Releases](https://github.com/krishnan-r/sparkmonitor/releases).
- To install and configure the extension or to build from source, follow the instructions [here](install.md).

## Gallery
<img src="https://user-images.githubusercontent.com/6822941/29601990-d6256a1e-87fb-11e7-94cb-b4418c61d221.png" width="30%"><img src="https://user-images.githubusercontent.com/6822941/29601769-d8e82a26-87fa-11e7-9b0e-91b1414e7821.png" width="30%"><img src="https://user-images.githubusercontent.com/6822941/29601776-d919dae4-87fa-11e7-8939-a6c0d0072d90.png" width="30%"><img src="https://user-images.githubusercontent.com/6822941/29601770-d8ea4734-87fa-11e7-9102-524d2b5193c3.png" width="30%"><img src="https://user-images.githubusercontent.com/6822941/29601773-d8eda6ea-87fa-11e7-905d-9bebd62250ea.png" width="30%"><img src="https://user-images.githubusercontent.com/6822941/29601997-d6533840-87fb-11e7-90ce-daa0fe73b9e5.png" width="30%">

## Usefull Links
- [SparkMonitor](https://github.com/krishnan-r/sparkmonitor) Github Repository
- [SparkMonitorHub](https://github.com/krishnan-r/sparkmonitorhub) - An integration for SWAN - A multiuser cloud notebook service based on JupyterHub.
- [Initial Project Proposal](https://docs.google.com/document/d/1J2zIRnEAvey8HcDyqrKZ2DeQJXLvhU5HR2WdxZ9o8Yk/edit?usp=sharing)
- [Initial Idea Page of Organization](http://hepsoftwarefoundation.org/gsoc/proposal_ROOTspark.html)
- [Travis Build for SparkMonitor](https://travis-ci.org/krishnan-r/sparkmonitor)
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitor/) for testing locally based on Scientific Linux CERN 6
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitorhub/) for SWAN
- [SparkMonitor Python Package](https://github.com/krishnan-r/sparkmonitor/releases) - Github Release