FROM cernphsft/systemuser:v2.9



#Possible fix
RUN sudo pip3 install jupyter_nbextensions_configurator 
RUN sudo pip install --upgrade pip
RUN sudo pip3 install --upgrade 'notebook==5.0.0'

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN sudo pip3 install -e /extension/

#RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --user --py
#RUN sudo /usr/local/bin/jupyter serverextension enable sparkmonitor --py
RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --sys-prefix --py

WORKDIR /root
CMD ["sh", "/srv/singleuser/systemuser.sh"]


ADD systemuser.sh /srv/singleuser/systemuser.sh
