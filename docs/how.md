
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](usecases.md)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**


# SparkMonitor - How the extension works

![Jupyter Working](https://user-images.githubusercontent.com/6822941/29751909-f040c276-8b71-11e7-951b-ff3cd3af6874.png)  

[Jupyter Notebook](http://jupyter.org/) is a web based application that follows a client-server architecture. It consists of a JavaScript browser client that renders the notebook interface and a web server process on the back end. The computation of the cells are outsourced to a separate kernel process running on the server. To extend the notebook, it is required to implement a separate extension component for each part.

The SparkMonitor extension for Jupyter Notebook has 4 components.

1. Notebook Frontend extension written in JavaScript.
2. [IPython](https://ipython.org/) Kernel extension written in Python.
3. Notebook web server extension written in Python.
4. An implementation of [SparkListener](https://spark.apache.org/docs/latest/api/scala/index.html#org.apache.spark.scheduler.SparkListener) interface written in Scala.

---
## The Frontend Extension
![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)
- Written in JavaScript.
- Receives data from the IPython kernel through Jupyter's comm API mechanism for widgets.
- Jupyter frontend extensions are requirejs modules that are loaded when the browser page loads.
- Contains the logic for displaying the progress bars, graphs and timeline.
- Keeps track of cells running using a queue by tracking execution requests and kernel busy/idle events.
- Creates and renders the display if a job start event is received while a cell is running.

---
## [IPython](https://ipython.org/) Kernel Extension
![Kernel Extension](https://user-images.githubusercontent.com/6822941/29601566-d5e276a2-87f9-11e7-884e-95d66beaecd4.png)
- The kernel extension is an importable Python module called `sparkmonitor.kernelextension`
- It is configured to load when the IPython kernel process starts.
- The extension acts as a bridge between the frontend and the SparkListener callback interface.
- To communicate with the SparkListener the extension opens a socket and waits for connections.
- The port of the socket is exported as an environment variable. When a Spark application starts, the custom SparkListener connects to this port and forwards data.
- To communicate with the frontend the extension uses the IPython Comm API provided by Jupyter. 
- The extension also adds to the users namespace a [SparkConf](http://spark.apache.org/docs/2.1.0/api/python/pyspark.html#pyspark.SparkConf) instance named as `conf`. This object is configured with the Spark properties that makes Spark load the custom SparkListener as well as adds the necessary JAR file paths to the Java class path.


---
## Scala [SparkListener](https://spark.apache.org/docs/latest/api/scala/index.html#org.apache.spark.scheduler.SparkListener)
![SparkListener](https://user-images.githubusercontent.com/6822941/29601567-d5e3cc96-87f9-11e7-9cb5-878411bbd2f5.png)
- Written in Scala.
- The listener receives notifications of [Apache Spark](https://spark.apache.org/) application lifecycle events as callbacks.
- The custom implementation used in this extension connects to a socket opened by the IPython kernel extension.
- All the data is forwarded to the kernel through this socket which forwards it to the frontend JavaScript.

---
## The Notebook Webserver Extension - A Spark Web UI proxy
![The Spark UI](https://user-images.githubusercontent.com/6822941/29601565-d5dfb76e-87f9-11e7-9fd4-87522989d2d5.png)
- Written in Python.
- This module proxies the Spark UI running typically on 127.0.0.1:4040 to the user through Jupyter's web server.
- Jupyter notebook is based on the [Tornado](http://www.tornadoweb.org/en/stable/) web server back end. Tornado is a Python webserver.
- Jupyter webserver extensions are custom request handlers sub-classing the `IPythonHandler` class. They provide custom endpoints with additional content.
- This module provides the Spark UI as an endpoint at `notebook_base_url/sparkmonitor`.
- In the front end extension, the Spark UI can also be accessed as an IFrame dialog through the monitoring display.
- For the Spark UI web application to work as expected, the server extension replaces all relative URLs in the requested page, adding the endpoints base URL to each.
