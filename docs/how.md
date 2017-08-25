___
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](#common-use-cases-and-tests)** |
**[Github](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**
___

# SparkMonitor - How the extension works

The SparkMonitor extension for Jupyter Notebook has 4 components.

1. Notebook Frontend extension written in JavaScript.
2. IPython Kernel extension written in Python.
3. Notebook web server extension written in Python.
4. An implementation of SparkListener interface written in Scala.

---
## The Frontend Extension
![The Monitoring Display](https://user-images.githubusercontent.com/6822941/29601568-d5e42934-87f9-11e7-9780-3cd3a0d8d86b.png)
- Written in JavaScript
- Recieves data from the IPython kernel through Jupyter's comm API mechanism for widgets
- Jupyter frontend extensions are requirejs modules that are loaded when the browser page loads
- Contains the logic for displaying the progress bars, graphs and timeline.
- Keeps track of cells running using a queue by tracking execution requests and kernel busy/idle events.
- Creates and renders the display if a job start event is received while a cell is running.

---
## IPython Kernel Extension
![Kernel Extension](https://user-images.githubusercontent.com/6822941/29601566-d5e276a2-87f9-11e7-884e-95d66beaecd4.png)
- The kernel extension is an importable python module called `sparkmonitor`
- It is configured to load when the IPython kernel process starts.
- The extension acts as a bridge between the frontend and the SparkListener callback interface
- To communicate with the SparkListener the extension opens a socket and waits for connections
- The port of the socket is exported as an environment variable. When a spark application starts, the custom SparkListener connects to this port and forwards data.
- To communicate with the frontend the extension uses the ipython comm api provided by jupyter. 
- The extension also adds to the users namespace a SparkConf instance named as `conf`. This object is configured with the spark properties that makes spark load the custom SparkListener as well as adds the necessary JAR file paths to the Java Classpath


---
## Scala SparkListener
![SparkListener](https://user-images.githubusercontent.com/6822941/29601567-d5e3cc96-87f9-11e7-9cb5-878411bbd2f5.png)
- Written in Scala
- The listener receives notification of spark application lifecycle events as callbacks.
- The custom implementation used in this extension connects to a socket opened by the IPython kernel extension.
- All the data is forwarded to the kernel through this socket which forwards it to the frontend JavaScript.

---
## The Notebook Webserver Extension - A Spark Web UI proxy
![The Spark UI](https://user-images.githubusercontent.com/6822941/29601565-d5dfb76e-87f9-11e7-9fd4-87522989d2d5.png)
- Written in Python
- This module proxies the spark UI running typically on 127.0.0.1:4040 to the user through jupyter's web server.
- Jupyter notebook is based on the tornado web server backend. Tornado is a python webserver.
- Jupyter webserver extensions are custom request handlers subclassing the `IpythonHandler` class. They provide custom endpoints with additional content.
- This module provides the spark UI as an endpoint at `notebook_base_url/sparkmonitor`.
- In the front end extension, the Spark UI can also be accessed as an IFrame dialog through the monitoring display.
- For the Spark Web UI web application to work as expected, the server extension replaces all relative URLs in the requested page, adding the endpoints base URL to each.
