FROM cernphsft/systemuser:v2.9



#Possible fix
RUN sudo pip3 install jupyter_nbextensions_configurator 
RUN curl -O https://bootstrap.pypa.io/get-pip.py && \
    python3 get-pip.py && \
    rm get-pip.py &&\
    pip3 uninstall -y notebook &&\
    sudo pip3 install -I 'notebook==5.0.0'
RUN pip3 install --upgrade jupyterhub    
RUN pip2 install --upgrade ipython==5.4.1
RUN wget -q https://raw.githubusercontent.com/jupyterhub/jupyterhub/master/scripts/jupyterhub-singleuser -O /usr/local/bin/jupyterhub-singleuser
RUN chmod 755 /usr/local/bin/jupyterhub-singleuser


ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN sudo pip3 install -e /extension/

#RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --user --py
#RUN sudo /usr/local/bin/jupyter serverextension enable sparkmonitor --py
RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --sys-prefix --py

WORKDIR /root
CMD ["sh", "/srv/singleuser/systemuser.sh"]
ADD systemuser.sh /srv/singleuser/systemuser.sh