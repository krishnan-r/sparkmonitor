
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](usecases.md)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**


# A DistROOT Example

## Introduction
One of the main goals of this project was to make it easier for the scientific community in leveraging the power of distributed computing for scientific analysis. In particular by combining Apache Spark and Jupyter Notebooks. [ROOT](https://root.cern.ch/) is a popular library based on C++ used for various scientific analysis tasks.
This example for the SparkMonitor extension, uses the [DistROOT](https://github.com/etejedor/root-spark) module to process ROOT TTree objects in a distributed cluster using Apache Spark. The Spark job is divided into a map phase, that extracts data from the TTree and uses it to fill histograms, and a reduce phase, that merges all the histograms into a final list.

## Environment
- This use case was tested on a 4 node spark cluster running on the CERN IT Infrastructure.
- A test instance of [SWAN](http://swan.web.cern.ch/) - a Service for Web based ANalysis based on the Jupyter interface was used with the extension installed.
- The data was uploaded to a central storage service and accessed from the cluster.

## Notebook
- The DistROOT example notebook can be found [here](https://github.com/krishnan-r/sparkmonitor/blob/master/notebooks/DistROOT.ipynb)

## Monitoring

- The main job in this notebook ran for 6 minutes and 6 seconds.

![4](https://user-images.githubusercontent.com/6822941/29752706-d9f26cae-8b80-11e7-82be-33382b13e798.png)

- On looking at the graph between tasks and executors, It is visible that, towards the end there is an under utilization of resources. The yellow on the graph shows that two executor cores were idle for around two minutes of the total six minutes the job took. This means that the workload was not efficiently balanced to make the most of the resources available. Now for an enterprise level cluster, running routine jobs, the monitoring indicates that there is potential scope for optimization of the workload.

![1](https://user-images.githubusercontent.com/6822941/29752704-d9ef8b2e-8b80-11e7-8050-c82adc2c761f.png)

- The event timeline provides a complementary picture that completes the story about the running workload. Here it is observed that task 9 and 11 take up more time than the others. This keeps the job waiting and the next stage, no: 2 is started only after they finish. It is possible that the tasks were waiting for a shuffle read of data between the nodes as input, which required the output of task 9 and 11. Some tasks in the mapper phase are taking longer time and the reduce phase is kept waiting, leaving some resources underutilized.

![2](https://user-images.githubusercontent.com/6822941/29752708-d9f4e8c6-8b80-11e7-9385-55f388716d0f.png)

- The monitoring also provides details of a particular task when clicking on the timeline. It also shows the time spent by the task in different phases. Task 12 in this case took 5 seconds to send the computed result back to the driver, which is something dependent on the result size and network latency. 

![3](https://user-images.githubusercontent.com/6822941/29752705-d9f1ba52-8b80-11e7-931a-e43552372222.png)



- The output of the computation, a histogram generated through the distributed Spark Job, bringing together two different paradigms of interactive analysis and distributed computing.

![5](https://user-images.githubusercontent.com/6822941/29752707-d9f35312-8b80-11e7-95b8-91d8eab6f505.png)


