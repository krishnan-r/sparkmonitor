FROM cernphsft/systemuser:v2.9

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

WORKDIR /root
ADD systemuser.sh /srv/singleuser/systemuser.sh
CMD ["sh", "/srv/singleuser/systemuser.sh"]