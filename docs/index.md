[![Build Status](https://travis-ci.org/krishnan-r/sparkmonitor.svg?branch=master)](https://travis-ci.org/krishnan-r/sparkmonitor)
# Spark Monitor 
##  An extension for Jupyter Notebook

![jobdisplay](https://user-images.githubusercontent.com/6822941/28491063-1242eb42-6f07-11e7-8a57-abb96819ab0e.gif)

## Features
* Automatically displays progressbars below cells that run spark jobs
* A timeline which shows jobs, stages, and tasks
* A graph showing number of active tasks & executor cores vs time
* A notebook server extension that proxies the Spark UI and displays it in an iframe popup for more details

## How it Works
* The extension uses a scala `SparkListener` that forwards data to the kernel using sockets. The SparkConf is configured to start the listener which is bundled and included as a jar in the python package along with the javascript assets.
* The extension automatically adds a SparkConf to the namespace as ```conf```. Use this to create the SparkContext