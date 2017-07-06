FROM cernphsft/systemuser:v2.9

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN sudo pip3 install /extension/

WORKDIR /root

ADD systemuser.sh /srv/singleuser/systemuser.sh
CMD ["sh", "/srv/singleuser/systemuser.sh"]