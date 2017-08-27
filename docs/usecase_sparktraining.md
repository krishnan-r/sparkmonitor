
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](usecases.md)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**


# Example Use Case - Spark Tutorial Notebooks

## Introduction
This use case runs a few notebooks used at CERN for training in Apache Spark.
They test a wide range of Spark APIs including reading data from files.

## Notebooks 
- [Spark Training Notebooks](https://github.com/prasanthkothuri/sparkTraining)

## Environment
- These notebook were run with a local Apache Spark installation, using 1 executor and 4 cores, running inside a [Docker container](https://hub.docker.com/r/krishnanr/sparkmonitor/) based on Scientific Linux CERN 6.

## Monitoring the Notebook

- The extension shows all the jobs that have been run from a cell
- The stages for each job are shown in an expanded view which can be individually collapsed.

![6](https://user-images.githubusercontent.com/6822941/29601771-d8ecd29c-87fa-11e7-987e-470f2a7ee30b.png)

- An aggregated view of resource usage is provided through a graph between number of active tasks and available executor cores. This gives insight into whether the job is blocking on some I/O or waiting for other results. This view gives a picture of the level of parallelization of the tasks between cores across a cluster.

![3](https://user-images.githubusercontent.com/6822941/29601769-d8e82a26-87fa-11e7-9b0e-91b1414e7821.png)

![7](https://user-images.githubusercontent.com/6822941/29601775-d8f1ade4-87fa-11e7-85e8-ea2c3b687d69.png)

- An event timeline shows the overall picture of what is happening in the cluster, split into jobs stages and tasks.

 ![2](https://user-images.githubusercontent.com/6822941/29601772-d8ed2814-87fa-11e7-87c2-e88ff5e80285.png)

 ![8](https://user-images.githubusercontent.com/6822941/29601776-d919dae4-87fa-11e7-8939-a6c0d0072d90.png)

- The timeline shows various tasks running on each executor as a group
- It shows the time spent by the task in various phases. An overall view of this gives insight into the nature of the workload - I/O bound or CPU bound. This feature can be toggled using a checkbox.
- On clicking on an item on the timeline, the corresponding details of the item are shown as a pop-up. For jobs and stages, this shows the Spark Web UI page. For tasks a custom pop-up is shown with various details.

![5](https://user-images.githubusercontent.com/6822941/29750177-ea2c18b8-8b58-11e7-955e-69ecf33a6284.png)
- For more advanced details, the extension provides access to the Spark Web UI through a server proxy. This can used by advanced users for an in-depth analysis.

![1](https://user-images.githubusercontent.com/6822941/29750236-be1f6b0c-8b59-11e7-9a36-92e04e3bf05b.png)
