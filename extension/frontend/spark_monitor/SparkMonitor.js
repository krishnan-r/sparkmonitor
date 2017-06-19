define(['base/js/namespace', 'require', 'base/js/events', 'jquery', './CellMonitor', './currentcell', './vis.min'],
	function (Jupyter, require, events, $, CellMonitor, currentcell, vis) {

		function SparkMonitor() {
			var that = this;
			this.cellmonitors = {};
			this.comm = null;
			this.startComm();
			events.on('kernel_connected.Kernel', $.proxy(this.startComm, this));//Make sure there is a comm always.
			this.timelineData = new vis.DataSet(options = {
				queue: true
			});
			this.data = new vis.DataSet();
			this.groups = new vis.DataSet([
				{
					id: 'jobs',
					content: 'Jobs:',
					className: 'visjobgroup',
				},
				{ id: 'stages', content: 'Stages:', },
			]);
			var i = 0;
			//Changes to the dataset are queued and flushed.
			this.flushInterval = setInterval(function () {
				i++;
				if (i == 2) {
					i = 0;
					that.data.forEach(function (item) {
						var date = new Date()
						if (item.mode == "ongoing") {
							that.timelineData.update({
								id: item.id,
								end: date
							});
						}
					});
				}
				that.timelineData.flush()
			}, 1000);
		}

		SparkMonitor.prototype.getCellMonitor = function (cell) {
			if (this.cellmonitors[cell.cell_id] == null) {

				this.cellmonitors[cell.cell_id] = new CellMonitor(this, cell, this.timelineData, this.groups)
			}
			return this.cellmonitors[cell.cell_id]
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
			console.log('SparkMonitor: Job Start Message', data);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Job started with no running cell.');
				return;
			}
			var cellmonitor = this.getCellMonitor(cell)
			var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string

			this.data.update({
				id: 'job' + data.jobId,
				jobId: data.jobId,
				start: new Date(data.submissionTime),
				name: name,
				cell_id: cell.cell_id,
				mode: 'ongoing',
			});

			this.timelineData.update({
				id: 'job' + data.jobId,
				start: new Date(data.submissionTime),
				end: new Date(),
				content: '' + name,
				title: data.jobId + ': ' + data.name + ' ',
				group: 'jobs',
				cell_id: cell.cell_id,
				className: 'itemrunning job',
			});

			cellmonitor.createDisplay();
			cellmonitor.timeline.addCustomTime(new Date(data.submissionTime), 'jobstart' + data.jobId);
			cellmonitor.resizeTimeline();
		}

		SparkMonitor.prototype.sparkJobEnd = function (data) {

			this.data.update(
				{
					id: 'job' + data.jobId,
					end: new Date(data.completionTime),
					mode: 'done',
				}
			);

			this.timelineData.update(
				{
					id: 'job' + data.jobId,
					end: new Date(data.completionTime),
					className: 'itemfinished job',
				}
			);

			//Add the vertical line indicating job end
			var cellid = this.data.get('job' + data.jobId)['cell_id'];
			if (cellid) {
				var cellmonitor = this.cellmonitors[cellid]
				cellmonitor.timeline.addCustomTime(new Date(data.completionTime), 'jobend' + data.jobId);
			}
			else console.log('SparkMonitor:ERROR no cellID for job');

		}

		SparkMonitor.prototype.sparkStageSubmitted = function (data) {
			console.log('SparkMonitor:Stage Submitted', data);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Stage started with no running cell.');
				return;
			}

			var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
			var submissionDate
			if (data.submissionTime == -1) submissionDate = new Date()
			else submissionDate = new Date(data.submissionTime)

			this.data.update({
				id: 'stage' + data.stageId,
				stageId: data.stageId,
				name: name,
				start: submissionDate,
				cell_id: cell.cell_id,
				mode: 'ongoing',
			});

			this.timelineData.update({
				id: 'stage' + data.stageId,
				start: submissionDate,
				content: "" + name,
				group: 'stages',
				title: 'Stage: ' + data.stageId + ' ' + name,
				cell_id: cell.cell_id,
				end: new Date(),
				className: 'itemrunning stage',
			});
		}

		SparkMonitor.prototype.sparkStageCompleted = function (data) {
			console.log('SparkMonitor:Stage Completed', data);
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Stage Completed with no running cell.');
			}
			var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.


				this.data.update({
					id: 'stage' + data.stageId,
					end: new Date(data.completionTime),
					start: new Date(data.submissionTime),
					mode: 'done',
				});

				this.timelineData.update({
					id: 'stage' + data.stageId,
					start: new Date(data.submissionTime),
					group: 'stages',
					end: new Date(data.completionTime),
					className: 'itemfinished stage',
					title: 'Stage: ' + data.stageId + ' ' + name,
					//content: '' + name,
					cell_id: cell.cell_id
				});
			}

		SparkMonitor.prototype.sparkTaskStart = function (data) {
			var cell = currentcell.getRunningCell()
			if (cell == null) {
				console.error('SparkMonitor: Task started with no running cell.');
				return;
			}


			//Create a group for the executor if one does not exist.
			if (!this.groups.get(data.executorId + '-' + data.host)) {
				this.groups.update({
					id: data.executorId + '-' + data.host,
					content: 'Tasks:<br>' + data.executorId + '<br>' + data.host
				});
			}

			this.data.update({
				id: 'task' + data.taskId,
				taskId: data.taskId,
				start: new Date(data.launchTime),
				content: '' + data.taskId,
				group: data.executorId + '-' + data.host,
				stageId: data.stageId,
				cell_id: cell.cell_id,
				stageAttemptId: data.stageAttemptId,
				title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
				mode: 'ongoing',
			});

			this.timelineData.update({
				id: 'task' + data.taskId,
				start: new Date(data.launchTime),
				end: new Date(),
				content: '' + data.taskId,
				group: data.executorId + '-' + data.host,
				cell_id: cell.cell_id,
				title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
				className: 'itemrunning task',
			});
		}

		SparkMonitor.prototype.sparkTaskEnd = function (data) {
			this.data.update({
				id: 'task' + data.taskId,
				end: new Date(data.finishTime),
				title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
				mode: 'done',
			});

			this.timelineData.update({
				id: 'task' + data.taskId,
				end: new Date(data.finishTime),
				title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
				className: 'itemfinished task',
			});
		}

		SparkMonitor.prototype.sparkApplicationEnd = function (data) {
			//TODO What to do?
		}
		SparkMonitor.prototype.sparkApplicationStart = function (data) {
			//TODO What to do?
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