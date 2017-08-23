# Testing with multiple executors
When working with spark, sometimes it is necessary to simulate jobs running on a cluster in a single machine. This can be achieved through the following instructions.

#### To start spark with multiple executors in a single machne:

```bash
$SPARK_HOME/sbin/start-master.sh
```
```bash
SPARK_WORKER_INSTANCES=2 $SPARK_HOME/sbin/start-slave.sh -c 1 -m 512M spark://hostname:7077
```
Replace `hostname` with your hostname `-c` with number of cores and `-m` with memory per instance


To use this cluster in a notebook add: 
```python
conf=SparkConf()
conf.setMaster('spark://hostname:7077')
```
where `hostname` is the machine where spark is started (localhost doesnt seem to work)

The Master's UI is accessible at `hostname:8080` application UI at `hostname:4040`

#### To stop the spark cluster
```bash
$SPARK_HOME/sbin/stop-master.sh
$SPARK_HOME/sbin/stop-slave.sh 
```
