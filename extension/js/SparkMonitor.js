import Jupyter from 'base/js/namespace';
import events from 'base/js/events';
import $ from 'jquery';
import CellMonitor from './CellMonitor'
import currentcell from './currentcell'


function SparkMonitor() {
	var that = this;
	this.cellmonitors = {};
	this.comm = null;

	//Fixes Reloading the browser
	this.startComm();
	//Fixes Restarting the Kernel
	events.on('kernel_connected.Kernel', $.proxy(this.startComm, this));//Make sure there is a comm always.

	this.data = {};
	this.appName = "NULL";
	this.appId = "NULL";
	this.app = "NULL";
	this.totalCores = 0;
	this.numExecutors = 0;
}

SparkMonitor.prototype.getCellMonitor = function (cell) {
	return this.cellmonitors[cell.cell_id];
}

SparkMonitor.prototype.startCellMonitor = function (cell) {
	var that = this;
	if (this.cellmonitors[cell.cell_id] != null) {
		this.cellmonitors[cell.cell_id].cleanUp();
	}

	events.one('started' + cell.cell_id + 'currentcell', function () {
		console.log('started' + cell.cell_id + 'currentcell');
		var c = cell;
		that.cellExecutedAgain(c);
	})

	this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell);


	return this.cellmonitors[cell.cell_id];
}

SparkMonitor.prototype.cellExecutedAgain = function (cell) {
	console.log('stopping cell' + cell.cell_id);
	this.stopCellMonitor(cell);
}

SparkMonitor.prototype.stopCellMonitor = function (cell) {
	if (this.cellmonitors[cell.cell_id] != null) {
		this.cellmonitors[cell.cell_id].cleanUp();
		this.cellmonitors[cell.cell_id] = null;
		delete this.cellmonitors[cell.cell_id];
	}
}


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

SparkMonitor.prototype.sparkJobStart = function (data) {

	var cell = currentcell.getRunningCell()
	if (cell == null) {
		console.error('SparkMonitor: Job started with no running cell.');
		return;
		//TODO
	}
	console.log('SparkMonitor: Job Start at cell: ', cell.cell_id, data);
	var cellmonitor = this.getCellMonitor(cell)
	if (!cellmonitor) {
		cellmonitor = this.startCellMonitor(cell);
	}
	this.data['app' + this.app + 'job' + data.jobId] = {
		cell_id: cell.cell_id,
	}
	this.totalCores = data.totalCores;
	this.numExecutors=data.numExecutors;
	if (cellmonitor && !cellmonitor.displayClosed)
		cellmonitor.sparkJobStart(data);
}

SparkMonitor.prototype.sparkJobEnd = function (data) {

	var cellid = this.data['app' + this.app + 'job' + data.jobId]['cell_id'];
	if (cellid) {
		var cellmonitor = this.cellmonitors[cellid]
		if (cellmonitor && !cellmonitor.displayClosed) cellmonitor.sparkJobEnd(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for job');

}

SparkMonitor.prototype.sparkStageSubmitted = function (data) {
	console.log('SparkMonitor:Stage Submitted', data);
	//TODO Get cell from JobId instead of running cell
	var cell = currentcell.getRunningCell()
	if (cell == null) {
		console.error('SparkMonitor: Stage started with no running cell.');
		return;
	}
	this.data['app' + this.app + 'stage' + data.stageId] = {
		cell_id: cell.cell_id,
	};
	var cellmonitor = this.getCellMonitor(cell);
	if (cellmonitor && !cellmonitor.displayClosed) cellmonitor.sparkStageSubmitted(data);
}

SparkMonitor.prototype.sparkStageCompleted = function (data) {
	console.log('SparkMonitor:Stage Completed', data);
	var cellid = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cellid) {
		var cellmonitor = this.cellmonitors[cellid]
		if (cellmonitor && !cellmonitor.displayClosed) cellmonitor.sparkStageCompleted(data);
	}
	else console.error('SparkMonitor:ERROR no cellId for completed stage');
}


SparkMonitor.prototype.sparkTaskStart = function (data) {
	var cellid = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cellid) {
		var cellmonitor = this.cellmonitors[cellid]
		if (cellmonitor && !cellmonitor.displayClosed) cellmonitor.sparkTaskStart(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for task start');
}

SparkMonitor.prototype.sparkTaskEnd = function (data) {
	var cellid = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
	if (cellid) {
		var cellmonitor = this.cellmonitors[cellid]
		if (cellmonitor && !cellmonitor.displayClosed) cellmonitor.sparkTaskEnd(data);

	}
	else console.error('SparkMonitor:ERROR no cellID for task end');
}

SparkMonitor.prototype.sparkApplicationEnd = function (data) {
	//TODO What to do?

}
SparkMonitor.prototype.sparkApplicationStart = function (data) {
	this.appId = data.appId;
	this.appName = data.appName;
	this.appAttemptId = data.appAttemptId;
	this.app = this.appId + '_' + this.appAttemptId;
}

SparkMonitor.prototype.sparkExecutorAdded = function (data) {
	this.totalCores += data.totalCores;
	this.numExecutors += 1;

	var cell = currentcell.getRunningCell()
	if (cell != null) {
	var cellmonitor = this.getCellMonitor(cell);
	if(cellmonitor) if(!cellmonitor.displayClosed) cellmonitor.sparkExecutorAdded(data);
	}
	

}

SparkMonitor.prototype.sparkExecutorRemoved = function (data) {
	this.totalCores += data.totalCores;
	this.numExecutors -= 1;

	var cell = currentcell.getRunningCell()
	if (cell != null) {
	var cellmonitor = this.getCellMonitor(cell);
	if(cellmonitor) if(!cellmonitor.displayClosed) cellmonitor.sparkExecutorRemoved(data);
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
				this.sparkJobStart(data);
				break;
			case 'sparkJobEnd':
				this.sparkJobEnd(data);
				break;
			case 'sparkStageSubmitted':
				this.sparkStageSubmitted(data);
				break;
			case 'sparkStageCompleted':
				this.sparkStageCompleted(data);
				break;
			case 'sparkTaskStart':
				this.sparkTaskStart(data);
				break;
			case 'sparkTaskEnd':
				this.sparkTaskEnd(data);
				break;
			case 'sparkApplicationStart':
				this.sparkApplicationStart(data);
				break;
			case 'sparkApplicationEnd':
				this.sparkApplicationEnd(data);
				break;
			case 'sparkExecutorAdded':
				this.sparkExecutorAdded(data);
				break;
			case 'sparkExecutorRemoved':
				this.sparkExecutorRemoved(data);
				break;
		}
	}
}

export default SparkMonitor;