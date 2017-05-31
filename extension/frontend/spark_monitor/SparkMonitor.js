define(['base/js/namespace', 'require','base/js/events', 'jquery', './CellMonitor', './currentcell'], function (Jupyter, require, events, $, CellMonitor, currentcell) {

	function SparkMonitor() {
		this.cellmonitors = {};
		this.startComm();
	}

	SparkMonitor.prototype.getCellMonitor = function (cell) {
		if (this.cellmonitors[cell.cell_id] == null) {
			this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell)
		}
		return this.cellmonitors[cell.cell_id]
	}

	SparkMonitor.prototype.on_comm_msg = function (msg) {
		console.log('SparkMonitor: Comm Message:', msg, this);
		this.handleMessage(msg)
	}

	SparkMonitor.prototype.on_comm_close = function (msg) {
		console.log('SparkMonitor: Comm Close Message:', msg);
	}

	SparkMonitor.prototype.startComm = function () {
		var that=this;
		Jupyter.notebook.kernel.comm_manager.register_target('SparkMonitor',
			function (comm, msg) {
				// comm is the frontend comm instance
				// msg is the comm_open message, which can carry data
				console.log('SparkMonitor: Comm OPENED Message', msg);
				// Register handlers for later messages:
				comm.on_msg($.proxy(that.on_comm_msg, that));
				comm.on_close($.proxy(that.on_comm_close, that));
				comm.send({ 'foo': 'comm opened' });
			});
	}

	SparkMonitor.send = function (msg) {
		this.comm.send(msg);
	}
	//--------Message Handling Functions-------------

	SparkMonitor.prototype.sparkJobStart = function (msg) {
		console.log('Job Start Message',msg);
		var cell=currentcell.getRunningCell()
		if(cell==null){
			console.error('SparkMonitor: Job started with no running cell.');
			return;
		}
		var cellmonitor=this.getCellMonitor(cell)
		cellmonitor.createDisplay()
	}
	SparkMonitor.prototype.sparkJobEnd = function (msg) {

	}
	SparkMonitor.prototype.sparkStageSubmitted = function (msg) {

	}
	SparkMonitor.prototype.sparkStageCompleted = function (msg) {

	}
	SparkMonitor.prototype.sparkTaskStart = function (msg) {

	}
	SparkMonitor.prototype.sparkTaskEnd = function (msg) {

	}
	SparkMonitor.prototype.sparkApplicationEnd = function (msg) {

	}

	SparkMonitor.prototype.handleMessage = function (msg) {

		if (msg.content.data.msgtype != null) {
			switch (msg.content.data.msgtype) {
				case 'sparkJobStart':
					this.sparkJobStart(msg);
					break;
				case 'sparkJobEnd':
					this.sparkJobEnd(msg);
					break;
				case 'sparkStageSubmitted':
					this.sparkStageSubmitted(msg);
					break;
				case 'sparkStageCompleted':
					this.sparkStageCompleted(msg);
					break;
				case 'sparkTaskStart':
					this.sparkTaskStart(msg);
					break;
				case 'sparkTaskEnd':
					this.sparkTaskEnd(msg);
					break;
				case 'sparkApplicationEnd':
					this.sparkApplicationEnd(msg);
					break;
			}
		}
	}
	return SparkMonitor;

});