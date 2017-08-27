/**
 * Entrypoint module for the SparkMonitor frontend extension.
 *
 * @module module
 */

import SparkMonitor from './SparkMonitor'
import currentcell from './currentcell'

/** Entrypoint: Called when the extension is loaded by jupyter. */
function load_ipython_extension() {
	console.log('SparkMonitor: Loading SparkMonitor Front-End Extension');
	var monitor = new SparkMonitor();
	window.sm = monitor;
	currentcell.register();
}

export { load_ipython_extension }
