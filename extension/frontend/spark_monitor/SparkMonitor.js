define(['base/js/namespace', 'require', 'base/js/events', 'jquery', './CellMonitor', './currentcell', './vis.min'],
	function (Jupyter, require, events, $, CellMonitor, currentcell, vis) {
		function SparkMonitor() {
			this.cellmonitors = {};
			this.startComm();
			this.data = new vis.DataSet();

		}

		SparkMonitor.prototype.getCellMonitor = function (cell) {
			if (this.cellmonitors[cell.cell_id] == null) {

				var options = {
					rollingMode: {
						follow: true,
						offset: 0.75
					},
					stack: true,
					showTooltips: true,
					maxHeight: '400px',
					timeAxis: { scale: 'second', step: 20 },
				};
				this.groups = new vis.DataSet([
					{ id: 'jobs', content: 'Job' },
					{ id: 'stages', content: 'Stage' }
				]);

				this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell, this.data, options, this.groups)
			}
			return this.cellmonitors[cell.cell_id]
		}

		SparkMonitor.prototype.on_comm_msg = function (msg) {
			//console.log('SparkMonitor: Comm Message:', msg.content.data);
			this.handleMessage(msg)
		}

		SparkMonitor.prototype.on_comm_close = function (msg) {
			console.log('SparkMonitor: Comm Close Message:', msg);
		}

		SparkMonitor.prototype.startComm = function () {
			var that = this;
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
			console.log('Job Start Message', msg);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Job started with no running cell.');
				return;
			}
			var cellmonitor = this.getCellMonitor(cell)
			cellmonitor.resizeTimeline();
			var data = msg.content.data;
			this.data.update(
				{
					id: 'job' + data.jobId,
					jobId: data.jobId,
					submissionTime: data.submissionTime,
					start: Date(data.submissionTime),
					name: data.name,
					content: 'job' + data.jobId,
					title: data.name,
					cell_id: cell.cell_id,
					group: 'jobs'
				}
			);
			cellmonitor.createDisplay()
		}

		SparkMonitor.prototype.sparkJobEnd = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'job' + data.jobId,
					completionTime: data.completionTime,
					end: Date(data.completionTime),
				}
			);
		}

		SparkMonitor.prototype.sparkStageSubmitted = function (msg) {
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Task started with no running cell.');
				return;
			}
			var data = msg.content.data;
			console.log('stage submitted', data);
			this.data.update(
				{
					id: 'stage' + data.stageId,
					stageId: data.stageId,
					submissionTime: data.submissionTime,
					start: Date(data.submissionTime),
					content: 's-' + data.stageId,
					cell_id: cell.cell_id,
					group: 'stages',
					title: 'Stage: ' + data.stageId
				}
			);
		}
		SparkMonitor.prototype.sparkStageCompleted = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'stage' + data.stageId,
					completionTime: data.completionTime,
					end: Date(data.completionTime),
				}
			);
		}
		SparkMonitor.prototype.sparkTaskStart = function (msg) {
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Task started with no running cell.');
				return;
			}
			var cellmonitor = this.getCellMonitor(cell)
			var data = msg.content.data;
			this.groups.update({ id: data.executorId + '-' + data.host, content: 'Tasks:' + data.executorId + '-' + data.host });
			this.data.update(
				{
					id: 'task' + data.taskId,
					taskId: data.taskId,
					launchTime: data.launchTime,
					start: Date(data.launchTime),
					content: 't-' + data.taskId,
					cell_id: cell.cell_id,
					group: data.executorId + '-' + data.host,
					stageId: data.stageId,
					stageAttemptId: data.stageAttemptId,
					title: 'Task: ' + data.taskId + ' from stage ' + data.stageId
				}
			);
			cellmonitor.resizeTimeline();
		}
		SparkMonitor.prototype.sparkTaskEnd = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'task' + data.taskId,
					finishTime: Date(data.finishTime),
					end: Date(data.finishTime),
				}
			);
		}
		SparkMonitor.prototype.sparkApplicationEnd = function (msg) {
			//
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