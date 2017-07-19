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

RUN pip install -e /extension/ && \
jupyter nbextension install sparkmonitor --py --user --symlink && \
jupyter nbextension enable sparkmonitor --py --user && \
jupyter serverextension enable --py --user sparkmonitor && \
ipython profile create && \
echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py

WORKDIR /notebooks/
RUN git clone https://github.com/prasanthkothuri/sparkTraining

EXPOSE 8888

CMD jupyter notebook --port=8888 --ip=0.0.0.0 --no-browser --allow-root --NotebookApp.token=''
