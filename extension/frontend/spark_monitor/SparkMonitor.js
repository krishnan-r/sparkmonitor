define(['base/js/namespace', 'require', 'base/js/events', 'jquery', './CellMonitor', './currentcell', './vis.min'],
	function (Jupyter, require, events, $, CellMonitor, currentcell, vis) {
		function SparkMonitor() {
			var that = this;
			this.cellmonitors = {};
			this.comm = null;
			this.startComm();
			events.on('kernel_connected.Kernel', $.proxy(this.startComm, this));//Make sure there is a comm always.
			this.data = new vis.DataSet(options = {
				queue: true
			});
			this.groups = new vis.DataSet([
				{
					id: 'jobs',
					content: 'Job',
					className: 'visjobgroup',
				},
				{ id: 'stages', content: 'Stage', nestedGroups: [], showNested: false, },
			]);
			this.flushInterval = setInterval(function () { that.data.flush() }, 200);
		}
		SparkMonitor.prototype.getCellMonitor = function (cell) {
			if (this.cellmonitors[cell.cell_id] == null) {

				this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell, this.data, this.groups)
			}
			return this.cellmonitors[cell.cell_id]
		}

		SparkMonitor.prototype.on_comm_msg = function (msg) {
			//	console.log('SparkMonitor: Comm Message:', msg.content.data);
			this.handleMessage(msg)
		}

		SparkMonitor.prototype.on_comm_close = function (msg) {
			console.log('SparkMonitor: Comm CLOSE Message:', msg);
		}

		SparkMonitor.prototype.startComm = function () {
			if (this.comm) {
				this.comm.close()
			}
			console.log('Starting COMM NOW')
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


		//--------Message Handling Functions that update the data-------------

		SparkMonitor.prototype.sparkJobStart = function (msg) {
			console.log('Job Start Message', msg);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Job started with no running cell.');
				return;
			}
			var cellmonitor = this.getCellMonitor(cell)
			var data = msg.content.data;
			var name = $('<div>').text(data.name).html();//Escaping HTML <, > from string
			this.data.update(
				{
					id: 'job' + data.jobId,
					jobId: data.jobId,
					start: new Date(data.submissionTime),
					name: data.name,
					content: '' + name,
					title: data.jobId + ': ' + data.name + ' ',
					cell_id: cell.cell_id,
					group: 'jobs',
					mode: 'ongoing',
				}
			);
			cellmonitor.createDisplay();
			cellmonitor.timeline.addCustomTime(new Date(data.submissionTime), 'jobstart' + data.jobId);
			cellmonitor.resizeTimeline();
		}

		SparkMonitor.prototype.sparkJobEnd = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'job' + data.jobId,
					end: new Date(data.completionTime),
					mode: 'done',
				}
			);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Job ENDED with no running cell.');
				return;
			}
			var cellmonitor = this.getCellMonitor(cell)
			cellmonitor.timeline.addCustomTime(new Date(data.completionTime), 'jobend' + data.jobId);
		}

		SparkMonitor.prototype.sparkStageSubmitted = function (msg) {
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Task started with no running cell.');
				return;
			}
			var data = msg.content.data;
			var name = $('<div>').text(data.name).html();//Escaping HTML <, > from string
			this.data.update(
				{
					id: 'stage' + data.stageId,
					stageId: data.stageId,
					name: data.name,
					start: new Date(data.submissionTime),
					content: "" + name,
					cell_id: cell.cell_id,
					group: 'stages',
					title: 'Stage: ' + data.stageId + ' ' + name,
					mode: 'ongoing',
				}
			);
		}

		SparkMonitor.prototype.sparkStageCompleted = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'stage' + data.stageId,
					end: new Date(data.completionTime),
					mode: 'done',
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
			this.groups.update({ id: 'stages', nestedGroups: this.groups.get('stages').nestedGroups.concat([data.executorId + '-' + data.host]) });
			this.groups.update({
				id: data.executorId + '-' + data.host,
				content: 'Tasks:<br>' + data.executorId + '<br>' + data.host
			});

			this.data.update(
				{
					id: 'task' + data.taskId,
					taskId: data.taskId,
					start: new Date(data.launchTime),
					content: '' + data.taskId,
					cell_id: cell.cell_id,
					group: data.executorId + '-' + data.host,
					stageId: data.stageId,
					stageAttemptId: data.stageAttemptId,
					title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
					mode: 'ongoing',
				}
			);
		}

		SparkMonitor.prototype.sparkTaskEnd = function (msg) {
			var data = msg.content.data;
			this.data.update(
				{
					id: 'task' + data.taskId,
					end: new Date(data.finishTime),
					title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
					mode: 'done',
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