import Jupyter from 'base/js/namespace';
import events from 'base/js/events';
import $ from 'jquery';
import SparkMonitor from './SparkMonitor'
import currentcell from './currentcell'

//Entrypoint: Called when the extension is loaded
function load_ipython_extension() {
	console.log('SparkMonitor: Loading Spark Monitor Front-End Extension');
	var monitor = new SparkMonitor();
	currentcell.register();
}

export { load_ipython_extension }
