FROM cernphsft/notebook:v2.2

RUN pip2 install --upgrade pip
RUN pip2 install --upgrade jupyter

#Installing Spark and Java
RUN rpm --rebuilddb && yum install -y java-1.8.0-openjdk

WORKDIR /
RUN wget https://d3kbcqa49mib13.cloudfront.net/spark-2.1.1-bin-hadoop2.7.tgz && \
tar -xvf spark-2.1.1-bin-hadoop2.7.tgz && \
rm spark-2.1.1-bin-hadoop2.7.tgz && \
mv spark-2.1.1-bin-hadoop2.7 spark 

ENV SPARK_HOME /spark
ENV PATH $SPARK_HOME/bin:$PATH
ENV PYTHONPATH $SPARK_HOME/python/:$PYTHONPATH
ENV PYTHONPATH $SPARK_HOME/python/lib/py4j-0.10.4-src.zip:$PYTHONPATH


ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

WORKDIR /extension/

RUN jupyter nbextension install ./frontend/spark_monitor --sys-prefix --symlink
RUN jupyter nbextension enable spark_monitor/module --sys-prefix

RUN pip install -e ./kernelside/
RUN ipython profile create
RUN echo "c.InteractiveShellApp.extensions = ['sparkmonitor']" >> ~/.ipython/profile_default/ipython_kernel_config.py

WORKDIR /notebooks/

EXPOSE 8888

CMD jupyter notebook --port=8888 --ip=0.0.0.0 --no-browser --allow-root --NotebookApp.token='' --NotebookApp.nbserver_extensions="{'sparkmonitorserver.extension':True}""
