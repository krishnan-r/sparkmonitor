var sm; //debugging
define([
	'base/js/namespace',
	'require',
	'base/js/events',
	'jquery',
	'./SparkMonitor',
	'./currentcell'],
	function (Jupyter, require, events, $, SparkMonitor, currentcell) {

		//Entrypoint: Called when the extension is loaded
		function load_ipython_extension() {

			console.log('SparkMonitor: Loading Spark Monitor Front-End Extension');

			var monitor = new SparkMonitor();
			sm = monitor
			//For debugging.
			//console.log(Jupyter);
			//require(['nbextensions/sparkmonitor/logevents'],function(){}); //debug eventss
			currentcell.register();
		}

		return {
			load_ipython_extension: load_ipython_extension
		};

	});





