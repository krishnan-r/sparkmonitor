from .sparkmonitor import *
from .serverextension import *


def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        # the path is relative to the `my_fancy_module` directory
        src="static",
        # directory in the `nbextension/` namespace
        dest="sparkmonitor",
        # _also_ in the `nbextension/` namespace
        require="sparkmonitor/module")]
        


def _jupyter_server_extension_paths():
    return [{
        "module": "sparkmonitor"
    }]
