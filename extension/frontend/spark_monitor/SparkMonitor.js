define(['base/js/namespace', 'require', 'base/js/events', 'jquery', './CellMonitor', './currentcell', './vis.min'],
	function (Jupyter, require, events, $, CellMonitor, currentcell, vis) {

		function SparkMonitor() {
			var that = this;
			this.cellmonitors = {};
			this.comm = null;

			//Fixes Reloading the browser
			this.startComm();
			//Fixes Restarting the Kernel
			events.on('kernel_connected.Kernel', $.proxy(this.startComm, this));//Make sure there is a comm always.

			this.data = new vis.DataSet();
			this.appName = "NULL";
			this.appId = "NULL";
			this.app = "NULL";
		}

		SparkMonitor.prototype.getCellMonitor = function (cell) {
			return this.cellmonitors[cell.cell_id];
		}

		SparkMonitor.prototype.startCellMonitor = function (cell) {
			var that = this;
			if (this.cellmonitors[cell.cell_id] != null) {
				this.cellmonitors[cell.cell_id].cleanUp();
			}

			events.one('started.' + cell.cell_id + '.currentcell', function () {
				that.cellExecutedAgain(cell);
			})

			this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell);


			return this.cellmonitors[cell.cell_id];
		}

		SparkMonitor.prototype.cellExecutedAgain = function (cell) {
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
			this.comm = Jupyter.notebook.kernel.comm_manager.new_comm('SparkMonitor',
				{ 'msgtype': 'openfromfrontend' });

			// Register a message handler
			this.comm.on_msg($.proxy(that.on_comm_msg, that));
			this.comm.on_close($.proxy(that.on_comm_close, that));
		}

		SparkMonitor.prototype.send = function (msg) {
			this.comm.send(msg);
		}


		//------------Message Handling Functions that update the data--------------------------------

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
				cellmonitor.createDisplay();
			}
			this.data.update({
				id: 'app' + this.app + 'job' + data.jobId,
				cell_id: cell.cell_id,
			});
			cellmonitor.sparkJobStart(data);
		}

		SparkMonitor.prototype.sparkJobEnd = function (data) {

			var cellid = this.data.get('app' + this.app + 'job' + data.jobId)['cell_id'];
			if (cellid) {
				var cellmonitor = this.cellmonitors[cellid]
				cellmonitor.sparkJobEnd(data);

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
			this.data.update({
				id: 'app' + this.app + 'stage' + data.stageId,
				cell_id: cell.cell_id,
			});
			var cellmonitor = this.getCellMonitor(cell);
			cellmonitor.sparkStageSubmitted(data);
		}

		SparkMonitor.prototype.sparkStageCompleted = function (data) {
			console.log('SparkMonitor:Stage Completed', data);
			var cellid = this.data.get('app' + this.app + 'stage' + data.stageId)['cell_id'];
			if (cellid) {
				var cellmonitor = this.cellmonitors[cellid]
				cellmonitor.sparkStageCompleted(data);
			}
			else console.error('SparkMonitor:ERROR no cellId for completed stage');
		}


		SparkMonitor.prototype.sparkTaskStart = function (data) {
			var cellid = this.data.get('app' + this.app + 'stage' + data.stageId)['cell_id'];
			if (cellid) {
				var cellmonitor = this.cellmonitors[cellid]
				cellmonitor.sparkTaskStart(data);

			}
			else console.error('SparkMonitor:ERROR no cellID for task start');
		}

		SparkMonitor.prototype.sparkTaskEnd = function (data) {
			var cellid = this.data.get('app' + this.app + 'stage' + data.stageId)['cell_id'];
			if (cellid) {
				var cellmonitor = this.cellmonitors[cellid]
				cellmonitor.sparkTaskEnd(data);

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
				}
			}
		}
		return SparkMonitor;
	});