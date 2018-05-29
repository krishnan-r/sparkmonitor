
**[Final Report](index.md)** |
**[Installation](install.md)** |
**[How it Works](how.md)** |
**[Use Cases](usecases.md)** |
**[Code](https://github.com/krishnan-r/sparkmonitor)** |
**[License](https://github.com/krishnan-r/sparkmonitor/blob/master/LICENSE.md)**


# Installation
## Prerequisites
- PySpark on [Apache Spark](https://spark.apache.org/) version 2.1.1 or higher
- [Jupyter Notebook](http://jupyter.org/) version 4.4.0 or higher

## Quick Install 
```bash 
pip install sparkmonitor
jupyter nbextension install sparkmonitor --py --user --symlink 
jupyter nbextension enable sparkmonitor --py --user            
jupyter serverextension enable --py --user sparkmonitor
ipython profile create && echo "c.InteractiveShellApp.extensions.append('sparkmonitor.kernelextension')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```
## Detailed Instructions

1. Install the python package in the latest tagged github release. The python package contains the JavaScript resources and the listener jar file.

```bash
pip install sparkmonitor
```

2. The frontend extension is symlinked (```--symlink```) into the jupyter configuration directory by `jupyter nbextension` command. The second line configures the frontend extension to load on notebook startup.

```bash
jupyter nbextension install --py sparkmonitor --user --symlink
jupyter nbextension enable sparkmonitor --user --py
```
3. Configure the server extension to load when the notebook server starts

```bash
 jupyter serverextension enable --py --user sparkmonitor
```

4. Create the default profile configuration files (Skip if config file already exists)
```bash
ipython profile create
```
5. Configure the kernel to load the extension on startup. This is added to the configuration files in users home directory
```bash
echo "c.InteractiveShellApp.extensions.append('sparkmonitor.kernelextension')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```

## Configuration
By default the Spark Web UI runs on `localhost:4040`. If this is not the case, setting the environment variable `SPARKMONITOR_UI_HOST` and `SPARKMONITOR_UI_PORT` overrides the default Spark UI hostname `localhost` and port 4040 used by the Spark UI proxy.

## Build from Source
Building the extension involves three parts:  
1. Bundle and minify the JavaScript
2. Compile the Scala listener into a JAR file.
3. Package and install the python package.

```bash
git clone https://github.com/krishnan-r/sparkmonitor
cd sparkmonitor/extension
#Build Javascript
yarn install
yarn run webpack
#Build SparkListener Scala jar
cd scalalistener/
sbt package
```
```bash
#Install the python package (in editable format -e for development)
cd sparkmonitor/extension/
pip install -e .
# The sparkmonitor python package is now installed. Configure with jupyter as above.
```
