## Installation
### Quick Install 
```bash 
pip install https://github.com/krishnan-r/sparkmonitor/releases/download/v0.0.1/sparkmonitor.tar.gz #Use latest version as in github releases

jupyter nbextension install sparkmonitor --py --user --symlink 
jupyter nbextension enable sparkmonitor --py --user            
jupyter serverextension enable --py --user sparkmonitor
ipython profile create && echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py
```
### Details

1. Install the python package in the latest tagged github release. The python package contains the JavaScript resources and the listener jar file.

```bash
pip install https://github.com/krishnan-r/sparkmonitor/releases/download/v0.0.5/sparkmonitor.tar.gz #Use latest version as in github releases
```

2. The frontend extension is symlinked (```--symlink```) into the jupyter configuration directory by `jupyter nbextension` command. The second line configures the frontend extension to load on notebook startup.

```bash
jupyter nbextension install --py sparkmonitor --user --symlink
jupyter nbextension enable sparkmonitor --user --py
```
3. Configure the serverextension to load when the notebook server starts

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
- Setting the environment variable `SPARKMONITOR_UI_HOST` and `SPARKMONITOR_UI_PORT` overrides the default Spark UI hostname 127.0.0.1 and port 4040 used by the Spark UI proxy 

## Build from Source
```bash
git clone https://github.com/krishnan-r/sparkmonitor
cd sparkmonitor/extension
#Build Javascript
yarn install
yarn run webpack
#Build SparkListener Scala jar
cd scalalistener/jupyterspark/
sbt package
```
```bash
#Install the python package (in editable format -e for development)
cd sparkmonitor/extension/
pip install -e .
# The sparkmonitor python package is now installed. Configure with jupyter as above.
```