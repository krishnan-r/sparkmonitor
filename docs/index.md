
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](usecases.md)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**


# Google Summer of Code 2017 Final Report
# Big Data Tools for Physics Analysis

## Introduction
Jupyter Notebook is an interactive computing environment that is used to create notebooks which contain code, output, plots, widgets and theory. Jupyter notebook offers a convenient platform for interactive data analysis, scientific computing and rapid prototyping of code. A powerful tool used to perform complex computation intensive tasks is Apache Spark. Spark is a framework for large scale cluster computing in Big Data contexts. This project leverages these existing big data tools for use in an interactive scientific analysis environment. Spark jobs can be called from an IPython kernel in Jupyter Notebook using the pySpark module. The results of the computation can be visualized and plotted within the notebook interface. However to know what is happening to a running job, it is required to connect separately to the Spark web UI server. This project implements an extension called SparkMonitor to Jupyter Notebook that enables the monitoring of jobs sent from a notebook application, from within the notebook itself. The extension seamlessly integrates with the cell structure of the notebook and provides real time monitoring capabilities.

## Features
- The extension integrates with the cell structure of the notebook and automatically detects jobs submitted from a notebook cell.

![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)

- It displays the jobs and stages spawned from a cell, with real time progress bars, status and resource utilization.

![Jobs](https://user-images.githubusercontent.com/6822941/29753710-ff8849b6-8b94-11e7-8f9c-bdc59bf72143.gif)

- The extension provides an aggregated view of the number of active tasks and available executor cores in the cluster.

![Tasks](https://user-images.githubusercontent.com/6822941/29752704-d9ef8b2e-8b80-11e7-8050-c82adc2c761f.png)

- An event timeline displays the overall workload split into jobs, stages and tasks across executors in the cluster.

![Timeline](https://user-images.githubusercontent.com/6822941/29753711-ff88c67a-8b94-11e7-87a4-5c9f746d1b5e.gif)

- The extension also integrates the Spark Web UI within the notebook page by displaying it in an IFrame pop-up. 

![Spark UI](https://user-images.githubusercontent.com/6822941/29601565-d5dfb76e-87f9-11e7-9fd4-87522989d2d5.png)

## Example Use Cases
The extension has been tested with a range of Spark applications. [Here](usecases.md) is a list of use cases the extension has been run with.


## Integration in SWAN and CERN IT Infrastructure
- The extension has been successfully integrated with a test instance of [SWAN](http://swan.web.cern.ch/), a Service for Web based ANalysis at [CERN](https://home.cern/)
- SWAN allows the submission of Spark Jobs from a notebook interface to Spark clusters deployed at CERN.
- SWAN encapsulates user sessions in Docker containers. The extension is installed by modifying the docker container image.
- The extension is loaded to Jupyter whenever the user attaches a Spark Cluster to the notebook environment.
- The custom docker spawner image files can be found [here](https://github.com/krishnan-r/sparkmonitorhub).
- Using this integration, it is now possible to monitor and debug Spark Jobs running on CERN Clusters using the notebook interface.

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
- [SparkMonitorHub](https://github.com/krishnan-r/sparkmonitorhub) - An integration for [SWAN](https://swan.web.cern.ch/) - A service for web-based analysis at CERN
- [Initial Project Proposal](https://docs.google.com/document/d/1J2zIRnEAvey8HcDyqrKZ2DeQJXLvhU5HR2WdxZ9o8Yk/edit?usp=sharing)
- [Initial Idea Page of Organization](http://hepsoftwarefoundation.org/gsoc/proposal_ROOTspark.html)
- [Travis Build for SparkMonitor](https://travis-ci.org/krishnan-r/sparkmonitor)
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitor/) for testing locally based on Scientific Linux CERN 6
- [Docker image](https://hub.docker.com/r/krishnanr/sparkmonitorhub/) for SWAN
- [SparkMonitor Python Package](https://github.com/krishnan-r/sparkmonitor/releases) - Github Release