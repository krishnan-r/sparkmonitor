var sm; //debugging
define([
	'base/js/namespace',
	'require',
	'base/js/events',
	'jquery',
	'./CellMonitor',
	'./SparkMonitor',
	'./currentcell'],
	function (Jupyter, require, events, $, CellMonitor, SparkMonitor, currentcell) {



		//Called when the extension is loaded
		function load_ipython_extension() {

			console.log('SparkMonitor: Loading Spark Monitor Front-End Extension');

			var monitor = new SparkMonitor();
			sm=monitor
			//For debugging.
			console.log(Jupyter);

			//require(['nbextensions/spark_monitor/logevents'],function(){}); //debug events

			currentcell.register();
		}


		return {
			load_ipython_extension: load_ipython_extension
		};

	});





