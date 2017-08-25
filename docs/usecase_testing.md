___
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](#common-use-cases-and-tests)** |
**[Github](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**
___

# A simple example notebook

## Introduction
This notebook tests a majority of Sparks API through pySpark.
It mainly covers most RDD APIs and runs a random job.
It also simulates some errors in Spark Jobs to test the extension

## Environment
- This notebook was run with Apache Spark in the local machine.
- It uses python collections to generate some random data.
- The latest version of Jupyter included in the Anaconda package was used



# Monitoring

## Automatic Configuration
- The extension automatically provides a SparkConf object to enable monitoring. This object shall be used by the user with additional configuration to start the Spark Application
![2](https://user-images.githubusercontent.com/6822941/29601989-d5fe5474-87fb-11e7-8589-3a46e8d369e3.png)
## Features
- A table of jobs and collapsible stages shows the jobs started by the current cell.
![5](https://user-images.githubusercontent.com/6822941/29601990-d6256a1e-87fb-11e7-94cb-b4418c61d221.png)
- An aggregated view of resource allocation - a graph between number of active tasks and executor cores. The green vertical lines show jobs start and end points.
![12](https://user-images.githubusercontent.com/6822941/29601998-d657bbae-87fb-11e7-9354-d8b5c659e8df.png)
- An event timeline
![13](https://user-images.githubusercontent.com/6822941/29601997-d6533840-87fb-11e7-90ce-daa0fe73b9e5.png)
## Detecting Failures
- Failed jobs show up with a red status on the title 
![7](https://user-images.githubusercontent.com/6822941/29601995-d632b66a-87fb-11e7-957c-0ddc5dea40f3.png)
- In the timeline failed jobs are highlighted in red 
![8](https://user-images.githubusercontent.com/6822941/29601992-d629a30e-87fb-11e7-819b-3526ae1fdab4.png)
- Clicking on a failed task shows the failure reason with the stack trace 
![9](https://user-images.githubusercontent.com/6822941/29601994-d62f76bc-87fb-11e7-9b73-dbcb29f29717.png)

## Too many cells with Spark
- In some cases there are too many cells with trivial Spark Jobs, in these cases monitoring is not really necessary. So the extension provides features to collapse/hide the display
![3](https://user-images.githubusercontent.com/6822941/29601991-d62868c2-87fb-11e7-819c-20f9eb0663e0.png)
- All monitoring displays can be easily be hidden and shown using the button on the toolbar
![1](https://user-images.githubusercontent.com/6822941/29601987-d5d4c500-87fb-11e7-92ca-05a634da5189.png)
![11](https://user-images.githubusercontent.com/6822941/29601996-d652db0c-87fb-11e7-983e-f9fa40325696.png)
- An individual display can be collapsed by clicking on the arrow on the top left corner.
![6](https://user-images.githubusercontent.com/6822941/29601993-d62db44e-87fb-11e7-8737-d6d36f838ef6.png)
- Clicking on the close button hides the display all together.


## References
- [Testing Extension Notebook](https://github.com/krishnan-r/sparkmonitor/blob/master/notebooks/Testing%20Extension.ipynb)