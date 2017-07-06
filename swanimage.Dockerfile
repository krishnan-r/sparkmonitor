FROM cernphsft/systemuser:v2.9

ADD ./extension/ /extension/
ADD ./notebooks/ /notebooks/

RUN pip3 install -e /extension/ && \
jupyter nbextension install sparkmonitor --py --symlink && \
jupyter nbextension enable sparkmonitor --py && \
jupyter serverextension enable --py sparkmonitor

WORKDIR /root
ADD systemuser.sh /srv/singleuser/systemuser.sh
CMD ["sh", "/srv/singleuser/systemuser.sh"]