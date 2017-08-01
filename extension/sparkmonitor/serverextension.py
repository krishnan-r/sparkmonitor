# SparkMonitor Jupyter Serverextension
# This module adds a request handler to jupyter webserver. It proxies the spark UI assumed to be running at 127.0.0.1:4040 
# to the endpoint [notebook rooturl]/sparkmonitor
# TODO Create unique endpoints for different kernels or spark applications.

from notebook.base.handlers import IPythonHandler

import tornado.web
from tornado import httpclient
import json

import re
import os

from traitlets.config import LoggingConfigurable
from traitlets.traitlets import Unicode

from bs4 import BeautifulSoup

proxy_root = "/sparkmonitor"


class SparkMonitorHandler(IPythonHandler):

    @tornado.web.asynchronous
    def get(self):
        print("SPARKSERVER: Handler GET")
        http = httpclient.AsyncHTTPClient()
        baseurl="http://127.0.0.1"
        port="4040"
        #port=os.environ.get('',"4040")
        #TODO get port from frontend first.
        url=baseurl+":"+port

        print("SPARKSERVER: Request URI" + self.request.uri)
        # TODO add baseURL
        request_path = self.request.uri[len(proxy_root):]
        backendurl = url_path_join(url, request_path)
        http.fetch(backendurl, self.handle_response)

    def handle_response(self, response):
        if response.error:
            content_type = 'application/json'
            content = json.dumps({'error': 'SPARK_UI_NOT_RUNNING'})
            print('SPARKSERVER: Spark UI not running')
        else:
            content_type = response.headers['Content-Type']
            #print('SPARKSERVER: CONTENT TYPE: '+ content_type + '\n')
            if 'text/html' in content_type:
                content = replace(response.body)
            elif 'javascript' in content_type:
                content = response.body.replace(
                    "location.origin", "location.origin +'" + proxy_root + "' ")
            else:
                # Probably binary response, send it directly.
                content = response.body
        self.set_header('Content-Type', content_type)
        self.write(content)
        self.finish()

# Called when the serverextension is loaded
def load_jupyter_server_extension(nb_server_app):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    print("SPARKSERVER: Loading Server Extension")
    web_app = nb_server_app.web_app
    host_pattern = '.*$'
    route_pattern = url_path_join(
        web_app.settings['base_url'], proxy_root + '.*')
    web_app.add_handlers(host_pattern, [(route_pattern, SparkMonitorHandler)])


try:
    import lxml
except ImportError:
    BEAUTIFULSOUP_BUILDER = 'html.parser'
else:
    BEAUTIFULSOUP_BUILDER = 'lxml'

# a regular expression to match paths against the Spark on EMR proxy paths
PROXY_PATH_RE = re.compile(r'\/proxy\/application_\d+_\d+\/(.*)')

# a tuple of tuples with tag names and their attribute to automatically fix
PROXY_ATTRIBUTES = (
    (('a', 'link'), 'href'),
    (('img', 'script'), 'src'),
)


def replace(content):
    """
    Replace all the links with our prefixed handler links, e.g.:
    /proxy/application_1467283586194_0015/static/styles.css' or
    /static/styles.css
    with
    /spark/static/styles.css
    """
    soup = BeautifulSoup(content, BEAUTIFULSOUP_BUILDER)
    for tags, attribute in PROXY_ATTRIBUTES:
        for tag in soup.find_all(tags, **{attribute: True}):
            value = tag[attribute]
            match = PROXY_PATH_RE.match(value)
            if match is not None:
                value = match.groups()[0]
            tag[attribute] = url_path_join(proxy_root, value)
    return str(soup)


def url_path_join(*pieces):
    """Join components of url into a relative url

    Use to prevent double slash when joining subpath. This will leave the
    initial and final / in place
    """
    initial = pieces[0].startswith('/')
    final = pieces[-1].endswith('/')
    stripped = [s.strip('/') for s in pieces]
    result = '/'.join(s for s in stripped if s)
    if initial:
        result = '/' + result
    if final:
        result = result + '/'
    if result == '//':
        result = '/'
    return result
