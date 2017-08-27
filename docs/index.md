___
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](#common-use-cases-and-tests)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**
___

# Google Summer of Code 2017 Final Report
# Big Data Tools for Physics Analysis
## The SparkMonitor Extension
![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)
## Introduction
This goal of this project was to make a Big Data tool like Apache Spark easier to use with an interactive interface like Jupyter. This project integrates Jupyter with Apache Spark by providing tools for monitoring and visualizing Apache Spark Jobs inside Jupyter Notebook. As a part of that, an extension has been built for Jupyter called 'SparkMonitor'

## Features
- The extension 'SparkMonitor' has been built for Jupyter Notebook to monitor Apache Spark running through pySpark.
- The extension integrates with Jupyter seamlessly, providing real time monitoring for jobs running in clusters.
- The extension has been integrated with a beta version of SWAN - a cloud multi user Jupyter notebook deployment based on JupyterHub running on CERN IT infrastructure.
- Various tests have been done with real world use cases.

## Example Use Cases
The extension has been tested with a range of applications by running spark standalone locally as well as using Spark Clusters at CERN.
Here is a list of test cases that have been run.
- [A Simple Example](usecase_testing.md)
- [Spark Training Notebooks used at CERN](usecase_sparktraining.md)
- [A DistROOT Example](usecase_distroot.md)

## Integration in SWAN and the CERN IT Infrastructure
- The extension has been successfully integrated with a test instance of [SWAN](http://swan.web.cern.ch/), a Service for Web based ANalysis at [CERN](https://home.cern/)
- The integration is made possible through customizations to the docker container image spawned by JupyterHub
- The extension is loaded to Jupyter whenever the user attaches a Spark Cluster to the notebook environment.
- The custom docker spawner image files can be found [here](https://github.com/krishnan-r/sparkmonitorhub).

## Documentation
### How it Works
- A detailed explanation of how different components in the extension work together can be found [here](how.md).

### Code Documentation
- Documentation for the JavaScript code is available [here](jsdoc).
- All the documentation for the code in Python and Scala is available within the [source files](https://github.com/krishnan-r/sparkmonitor) itself.

### Installation 
- The extension is available as a pip python package through [Github Releases](https://github.com/krishnan-r/sparkmonitor/releases).
- To install and configure the extension or to build from source, follow the instructions [here](install.md).

## Gallery
<table>
<tr>
<td><a href="https://user-images.githubusercontent.com/6822941/29601990-d6256a1e-87fb-11e7-94cb-b4418c61d221.png" title="Jobs and stages started from a cell."><img src="https://user-images.githubusercontent.com/6822941/29601990-d6256a1e-87fb-11e7-94cb-b4418c61d221.png"></a></td>
<td><a href="https://user-images.githubusercontent.com/6822941/29601769-d8e82a26-87fa-11e7-9b0e-91b1414e7821.png" title="A graph of the number of active tasks and available executor cores."><img src="https://user-images.githubusercontent.com/6822941/29601769-d8e82a26-87fa-11e7-9b0e-91b1414e7821.png" ></a></td>
<td><a href="https://user-images.githubusercontent.com/6822941/29601776-d919dae4-87fa-11e7-8939-a6c0d0072d90.png" title="An event timeline with jobs, stages and tasks across various executors. The tasks are split into various coloured phases, providing insight into the nature of computation."><img src="https://user-images.githubusercontent.com/6822941/29601776-d919dae4-87fa-11e7-8939-a6c0d0072d90.png"></a></td>
</tr>
<tr>
<td><a href="https://user-images.githubusercontent.com/6822941/29750236-be1f6b0c-8b59-11e7-9a36-92e04e3bf05b.png" title="The Spark web UI as a popup within the notebook interface."><img src="https://user-images.githubusercontent.com/6822941/29750236-be1f6b0c-8b59-11e7-9a36-92e04e3bf05b.png" ></a></td>
<td><a href="https://user-images.githubusercontent.com/6822941/29750177-ea2c18b8-8b58-11e7-955e-69ecf33a6284.png" title="Details of a task."><img src="https://user-images.githubusercontent.com/6822941/29750177-ea2c18b8-8b58-11e7-955e-69ecf33a6284.png" ></a></td>
<td><a href="https://user-images.githubusercontent.com/6822941/29601997-d6533840-87fb-11e7-90ce-daa0fe73b9e5.png" title="An event timeline."><img src="https://user-images.githubusercontent.com/6822941/29601997-d6533840-87fb-11e7-90ce-daa0fe73b9e5.png"></a></td>
</tr>
</table>

## Future Work
### Pending Work
- Ability to control and cancel running jobs.
    
### Future Ideas
- Support for Scala Notebooks
- Interface for easier configuration of Spark Applications

## Useful Links
- [SparkMonitor](https://github.com/krishnan-r/sparkmonitor) Github Repository
- [SparkMonitorHub](https://github.com/krishnan-r/sparkmonitorhub) - An integration for SWAN - A multiuser cloud notebook service based on JupyterHub.
- [Initial Project Proposal](https://docs.google.com/document/d/1J2zIRnEAvey8HcDyqrKZ2DeQJXLvhU5HR2WdxZ9o8Yk/edit?usp=sharing)
- [Initial Idea Page of Organization](http://hepsoftwarefoundation.org/gsoc/proposal_ROOTspark.html)
- [Travis Build for SparkMonitor](https://travis-ci.org/krishnan-r/sparkmonitor)
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitor/) for testing locally based on Scientific Linux CERN 6
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitorhub/) for SWAN
- [SparkMonitor Python Package](https://github.com/krishnan-r/sparkmonitor/releases) - Github Release