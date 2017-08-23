// SparkMonitor is the main singleton class that is responsible for managing CellMonitor instances for cells that run spark jobs
// It also delegates spark lifecycle events from the backend to corresponding CellMonitors

import Jupyter from 'base/js/namespace';  // The main Jupyter object for all frontend APIs of the notebook
import events from 'base/js/events';	  // Jupyter events module to listen for notebook page events
import $ from 'jquery';					  // Used for certain utility function in this module
import CellMonitor from './CellMonitor'   // CellMonitor object constructor
import currentcell from './currentcell'   // Module to detect currently running cell


function SparkMonitor() {
	var that = this;
	this.cellmonitors = {}; //dictionary of cellmonitors with keys as cell_id
	this.comm = null; //Communication object with the kernel

	//Fixes Reloading the browser
	this.startComm();
	//Fixes Restarting the Kernel
	events.on('kernel_connected.Kernel', $.proxy(this.startComm, this));//Make sure there is a comm always.

	this.data = {}; //data mapping jobs to cells and stages to jobs for delegating further lifecycle events of a job.
	this.appName = "NULL";
	this.appId = "NULL";
	this.app = "NULL";
	this.totalCores = 0;
	this.numExecutors = 0;

	this.display_mode = "shown"; // "shown" || "hidden"

	events.on('clear_output.CodeCell', function (event, data) { //Removing display when output area is cleared
		var cellmonitor = that.getCellMonitor(data.cell.cell_id)
		if (cellmonitor) {
			cellmonitor.removeDisplay();
			that.stopCellMonitor(data.cell.cell_id);
		}
	});

	this.createButtons();
}


SparkMonitor.prototype.getCellMonitor = function (cell_id) {
	return this.cellmonitors[cell_id];
}

SparkMonitor.prototype.startCellMonitor = function (cell) {
	var that = this;
	if (this.cellmonitors[cell.cell_id] != null) {
		this.cellmonitors[cell.cell_id].removeDisplay();
	}

	events.one('started' + cell.cell_id + 'currentcell', function () {
		console.log('started' + cell.cell_id + 'currentcell');
		var c = cell;
		that.cellExecutedAgain(c);
	})

	this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell);

	this.display_mode = "shown";
	return this.cellmonitors[cell.cell_id];
}

SparkMonitor.prototype.cellExecutedAgain = function (cell) {
	console.log('stopping cell' + cell.cell_id);
	this.stopCellMonitor(cell.cell_id);
}

SparkMonitor.prototype.stopCellMonitor = function (cell_id) {

	if (this.cellmonitors[cell_id] != null) {
		this.cellmonitors[cell_id].removeDisplay();
		this.cellmonitors[cell_id] = null;
		delete this.cellmonitors[cell_id];
	}
}

SparkMonitor.prototype.createButtons = function () {
	var that = this;
	var handler = function () {
		console.log("SparkMonitor: Toggling displays");
		that.toggleAll();
	};

	var action = {
		icon: 'fa-tasks', // a font-awesome class used on buttons, etc
		help: 'Toggle Spark Monitoring Displays',
		help_index: 'zz', // Sorting Order in keyboard shortcut dialog
		handler: handler
	};
	var prefix = 'SparkMonitor';
	var action_name = 'toggle-spark-monitoring';

	var full_action_name = Jupyter.actions.register(action, action_name, prefix); // returns 'my_extension:show-alert'
	Jupyter.toolbar.add_buttons_group([full_action_name]);
}

//-----Functions to show/hide all displays

SparkMonitor.prototype.toggleAll = function () {
	if (this.display_mode == "hidden") this.showAll();
	else if (this.display_mode == "shown") this.hideAll();
}

SparkMonitor.prototype.showAll = function () {
	for (var cell_id in this.cellmonitors) {
		if (this.cellmonitors.hasOwnProperty(cell_id) && this.cellmonitors[cell_id].displayVisible == false) {
			this.cellmonitors[cell_id].createDisplay();
		}
	}
	this.display_mode = "shown";
}

SparkMonitor.prototype.hideAll = function () {
	for (var cell_id in this.cellmonitors) {
		if (this.cellmonitors.hasOwnProperty(cell_id) && this.cellmonitors[cell_id].displayVisible == true) {
			this.cellmonitors[cell_id].removeDisplay();
		}
	}
	this.display_mode = "hidden";
}

//------Functions to communicate with kernel

SparkMonitor.prototype.on_comm_msg = function (msg) {
	//console.log('SparkMonitor: Comm Message:', msg.content.data);
	this.handleMessage(msg)
}

SparkMonitor.prototype.on_comm_close = function (msg) {
	console.log('SparkMonitor: Comm CLOSE Message:', msg);
}

SparkMonitor.prototype.startComm = function () {
	if (this.comm) {
		this.comm.close()
	}
	console.log('SparkMonitor: Starting COMM NOW')
	var that = this;
	if (Jupyter.notebook.kernel) {
		this.comm = Jupyter.notebook.kernel.comm_manager.new_comm('SparkMonitor',
			{ 'msgtype': 'openfromfrontend' });
		// Register a message handler
		this.comm.on_msg($.proxy(that.on_comm_msg, that));
		this.comm.on_close($.proxy(that.on_comm_close, that));
	}
	else {
		console.log("SparkMonitor: No communication established, kernel null");
	}
}

SparkMonitor.prototype.send = function (msg) {
	this.comm.send(msg);
}


//------------Message Handling Functions that update the data and delegate to corresponding cell monitors--------------------------------

SparkMonitor.prototype.onSparkJobStart = function (data) {

	var cell = currentcell.getRunningCell()
	if (cell == null) {
		console.error('SparkMonitor: Job started with no running cell.');
		return;
	}
	console.log('SparkMonitor: Job Start at cell: ', cell.cell_id, data);
	var cellmonitor = this.getCellMonitor(cell.cell_id)
	if (!cellmonitor) {
		cellmonitor = this.startCellMonitor(cell);
	}
	this.data['app' + this.app + 'job' + data.jobId] = {
		cell_id: cell.cell_id,
	}
	//These values are set here as previous messages may be missed if reconnecting from a browser reload.
	this.totalCores = data.totalCores;
	this.numExecutors = data.numExecutors;

	if (cellmonitor) cellmonitor.onSparkJobStart(data);
}

SparkMonitor.prototype.onSparkJobEnd = function (data) {

	var cell_id = this.data['app' + this.app + 'job' + data.jobId]['cell_id'];
	if (cell_id) {
		console.log('SparkMonitor: Job End at cell: ', cell_id, data);
		var cellmonitor = this.getCellMonitor(cell_id);
		if (cellmonitor) cellmonitor.onSparkJobEnd(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for job');

}

SparkMonitor.prototype.onSparkStageSubmitted = function (data) {
	console.log('SparkMonitor:Stage Submitted', data);
	//TODO Get cell from JobId instead of running cell??
	var cell = currentcell.getRunningCell()
	if (cell == null) {
		console.error('SparkMonitor: Stage started with no running cell.');
		return;
	}
	this.data['app' + this.app + 'stage' + data.stageId] = {
		cell_id: cell.cell_id,
	};
	var cellmonitor = this.getCellMonitor(cell.cell_id);
	if (cellmonitor) cellmonitor.onSparkStageSubmitted(data);
}

SparkMonitor.prototype.onSparkStageCompleted = function (data) {
	console.log('SparkMonitor:Stage Completed', data);
	var cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cell_id) {
		var cellmonitor = this.cellmonitors[cell_id]
		if (cellmonitor) cellmonitor.onSparkStageCompleted(data);
	}
	else console.error('SparkMonitor:ERROR no cellId for completed stage');
}


SparkMonitor.prototype.onSparkTaskStart = function (data) {
	var cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cell_id) {
		var cellmonitor = this.getCellMonitor(cell_id);
		if (cellmonitor) cellmonitor.onSparkTaskStart(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for task start');
}

SparkMonitor.prototype.onSparkTaskEnd = function (data) {
	var cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cell_id) {
		var cellmonitor = this.getCellMonitor(cell_id)
		if (cellmonitor) cellmonitor.onSparkTaskEnd(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for task end');
}

SparkMonitor.prototype.onSparkApplicationEnd = function (data) {
	//TODO What to do?

}

SparkMonitor.prototype.onSparkApplicationStart = function (data) {
	this.appId = data.appId;
	this.appName = data.appName;
	this.appAttemptId = data.appAttemptId;
	this.app = this.appId + '_' + this.appAttemptId;
}

SparkMonitor.prototype.onSparkExecutorAdded = function (data) {
	this.totalCores = data.totalCores;
	this.numExecutors += 1;

	var cell = currentcell.getRunningCell()
	if (cell != null) {
		var cellmonitor = this.getCellMonitor(cell.cell_id);
		if (cellmonitor) cellmonitor.onSparkExecutorAdded(data);
	}
}

SparkMonitor.prototype.onSparkExecutorRemoved = function (data) {
	this.totalCores = data.totalCores;
	this.numExecutors -= 1;

	var cell = currentcell.getRunningCell()
	if (cell != null) {
		var cellmonitor = this.getCellMonitor(cell.cell_id);
		if (cellmonitor) cellmonitor.onSparkExecutorRemoved(data);
	}
}

SparkMonitor.prototype.handleMessage = function (msg) {
	if (!msg.content.data.msgtype) {
		console.warn("SparkMonitor: Unknown message");
	}

	if (msg.content.data.msgtype == "fromscala") {

		var data = JSON.parse(msg.content.data.msg);

		switch (data.msgtype) {
			case 'sparkJobStart':
				this.onSparkJobStart(data);
				break;
			case 'sparkJobEnd':
				this.onSparkJobEnd(data);
				break;
			case 'sparkStageSubmitted':
				this.onSparkStageSubmitted(data);
				break;
			case 'sparkStageCompleted':
				this.onSparkStageCompleted(data);
				break;
			case 'sparkTaskStart':
				this.onSparkTaskStart(data);
				break;
			case 'sparkTaskEnd':
				this.onSparkTaskEnd(data);
				break;
			case 'sparkApplicationStart':
				this.onSparkApplicationStart(data);
				break;
			case 'sparkApplicationEnd':
				this.onSparkApplicationEnd(data);
				break;
			case 'sparkExecutorAdded':
				this.onSparkExecutorAdded(data);
				break;
			case 'sparkExecutorRemoved':
				this.onSparkExecutorRemoved(data);
				break;
		}
	}
}

export default SparkMonitor;