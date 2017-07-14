FROM cernphsft/systemuser:test

#Possible fix for serverextension not loading??
RUN sudo pip3 install jupyter_nbextensions_configurator 

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN sudo python3 -m pip install /extension/
RUN sudo pip2 install /extension/

#RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --user --py
#RUN sudo /usr/local/bin/jupyter serverextension enable sparkmonitor --py
RUN /usr/local/bin/jupyter serverextension enable sparkmonitor --sys-prefix --py

ADD systemuser.sh /srv/singleuser/systemuser.sh