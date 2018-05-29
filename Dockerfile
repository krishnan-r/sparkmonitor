FROM krishnanr/docker-jupyter-spark

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN pip install -e /extension/ && \
jupyter nbextension install sparkmonitor --py --user --symlink && \
jupyter nbextension enable sparkmonitor --py --user && \
jupyter serverextension enable --py --user sparkmonitor && \
ipython profile create && \
echo "c.InteractiveShellApp.extensions.append('sparkmonitor.kernelextension')" >>  $(ipython profile locate default)/ipython_kernel_config.py

WORKDIR /notebooks/

EXPOSE 8888

CMD jupyter notebook --port=8888 --ip=0.0.0.0 --no-browser --allow-root --NotebookApp.token=''
