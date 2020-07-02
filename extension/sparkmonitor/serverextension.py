"""SparkMonitor Jupyter Web Server Extension

This module adds a custom request handler to Jupyter web server.
It proxies the Spark Web UI by default running at 127.0.0.1:4040
to the endpoint notebook_base_url/sparkmonitor

TODO Create unique endpoints for different kernels or spark applications.
"""

from notebook.base.handlers import IPythonHandler
import tornado.web
from tornado import httpclient
import json
import re
import os
from bs4 import BeautifulSoup
import asyncio

proxy_root_base = "/sparkmonitor/"
proxy_root = "/sparkmonitor/"

PORT_PARSE = re.compile(r'[0-9]{4}')

class SparkMonitorHandler(IPythonHandler):
    """A custom tornado request handler to proxy Spark Web UI requests."""
 

    async def get(self):
        """Handles get requests to the Spark UI

        Fetches the Spark Web UI from the configured ports
        """
        # print("SPARKMONITOR_SERVER: Handler GET")
        baseurl = os.environ.get("SPARKMONITOR_UI_HOST", "127.0.0.1")

        # Get the URL and grab the port
        port_match = PORT_PARSE.findall(self.request.uri)
        port = '4040' if not port_match else port_match[0]

        proxy_root_path = proxy_root_base[:-1]
        
        url = "http://" + baseurl + ":" + port
        # print("SPARKMONITOR_SERVER: Request URI: " + self.request.uri)
        # print("SPARKMONITOR_SERVER: Getting from " + url)
        

        request_path = self.request.uri[(
            self.request.uri.index(proxy_root_path) + len(proxy_root_path)):]

        # Remove the /port (ie /4040, /4041 etc) from the request path because this is the path to the static js
        request_path = request_path.replace(f'/{port}', '')
        
        self.replace_path = self.request.uri[:self.request.uri.index(
            proxy_root_path) + len(proxy_root_path)] + '/' + port
        
        print("SPARKMONITOR_SERVER: Request_path " + request_path + " \n Replace_path:" + self.replace_path)
        backendurl = url_path_join(url, request_path)
        self.debug_url = url
        self.backendurl = backendurl

        print('SPARKMONITOR_SERVER: backend_url: ' + self.backendurl)
        print('SPARKMONITOR_SERVER: debug_url: ' + self.debug_url)

        http = httpclient.AsyncHTTPClient()
        try:
            response = await http.fetch(backendurl)
        except Exception as e:
            print("SPARKMONITOR_SERVER: Spark UI Error ",e)
        else:
            self.handle_response(response)

    def handle_response(self, response):
        """Sends the fetched page as response to the GET request"""
        if response.error:
            content_type = "application/json"
            content = json.dumps({"error": "SPARK_UI_NOT_RUNNING",
                                  "url": self.debug_url, "backendurl": self.backendurl, "replace_path": self.replace_path})
            print("SPARKMONITOR_SERVER: Spark UI not running")
        else:
            content_type = response.headers["Content-Type"]
            # print("SPARKSERVER: CONTENT TYPE: "+ content_type + "\n")
            if "text/html" in content_type:
                content = replace(response.body, self.replace_path)
            elif "javascript" in content_type:
                body="location.origin +'" + self.replace_path + "' "
                content = response.body.replace(b"location.origin",body.encode())
            else:
                # Probably binary response, send it directly.
                content = response.body
        self.set_header("Content-Type", content_type)
        self.write(content)
        self.finish()


def load_jupyter_server_extension(nb_server_app):
    """
    Called when the Jupyter server extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    print("SPARKMONITOR_SERVER: Loading Server Extension")
    web_app = nb_server_app.web_app
    host_pattern = ".*$"
    route_pattern = url_path_join(web_app.settings["base_url"], proxy_root + ".*")
    web_app.add_handlers(host_pattern, [(route_pattern, SparkMonitorHandler)])


try:
    import lxml
except ImportError:
    BEAUTIFULSOUP_BUILDER = "html.parser"
else:
    BEAUTIFULSOUP_BUILDER = "lxml"
# a regular expression to match paths against the Spark on EMR proxy paths
PROXY_PATH_RE = re.compile(r"\/proxy\/application_\d+_\d+\/(.*)")
# a tuple of tuples with tag names and their attribute to automatically fix
PROXY_ATTRIBUTES = (
    (("a", "link"), "href"),
    (("img", "script"), "src"),
)


def replace(content, root_url):
    """Replace all the links with our prefixed handler links,

     e.g.:
    /proxy/application_1467283586194_0015/static/styles.css" or
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
            tag[attribute] = url_path_join(root_url, value)
    return str(soup)


def url_path_join(*pieces):
    """Join components of url into a relative url

    Use to prevent double slash when joining subpath. This will leave the
    initial and final / in place
    """
    initial = pieces[0].startswith("/")
    final = pieces[-1].endswith("/")
    stripped = [s.strip("/") for s in pieces]
    result = "/".join(s for s in stripped if s)
    if initial:
        result = "/" + result
    if final:
        result = result + "/"
    if result == "//":
        result = "/"
    return result
