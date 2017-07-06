FROM cernphsft/systemuser:v2.9

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

#Possible fix
RUN sudo pip3 install jupyter_nbextensions_configurator 

RUN sudo pip3 install /extension/


WORKDIR /root

ADD systemuser.sh /srv/singleuser/systemuser.sh
CMD ["sh", "/srv/singleuser/systemuser.sh"]