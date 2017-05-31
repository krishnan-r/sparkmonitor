define(['base/js/namespace', 'require', 'base/js/events', 'jquery'],
    function (Jupyter, require, events, $) {

        function loadCSS(url) {
            var link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = url;
            document.getElementsByTagName("head")[0].appendChild(link);
        }

        function loadHTML(url, callback) {
            $.get(url, callback);
        }

        String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
            function () {
                "use strict";
                var str = this.toString();
                if (arguments.length) {
                    var t = typeof arguments[0];
                    var key;
                    var args = ("string" === t || "number" === t) ?
                        Array.prototype.slice.call(arguments) :
                        arguments[0];

                    for (key in args) {
                        str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
                    }
                }
                return str;
            };


        return {
            'loadCSS': loadCSS,
            'loadHTML': loadHTML
        }
    });
