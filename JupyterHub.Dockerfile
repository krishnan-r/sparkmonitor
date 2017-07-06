FROM cernphsft/systemuser:v2.9

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN pip2 install -e ./extension/ && \
pip3 install -e ./extension/ && \
jupyter nbextension install sparkmonitor --py --user --symlink && \
jupyter nbextension enable sparkmonitor/module --py --user && \
jupyter serverextension enable --py --user sparkmonitor && \
ipython profile create && \
echo "c.InteractiveShellApp.extensions.append('sparkmonitor')" >>  $(ipython profile locate default)/ipython_kernel_config.py


WORKDIR /root
CMD ["sh", "/srv/singleuser/systemuser.sh"]