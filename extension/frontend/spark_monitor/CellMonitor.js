define(['base/js/namespace', './misc', 'require', 'base/js/events', 'jquery', './vis.min', './livestamp', './twix.min'],
    function (Jupyter, misc, require, events, $, vis, livestamp, twix) {
        var widgetHTML;
        //console.log('SparkMonitor: Loading CSS from', require.toUrl('./styles.css'));
        misc.loadCSS(require.toUrl('./vis.min.css'));
        misc.loadCSS(require.toUrl('./styles.css'));
        //console.log('SparkMonitor: Loading HTML from', require.toUrl('./monitor.html'));
        misc.loadHTML(require.toUrl('./cellmonitor.html'), function (data) {
            widgetHTML = data
            //console.log('SparkMonitor: Finished Loading HTML from', require.toUrl('./monitor.html'), { 'html': data });
        });

        function CellMonitor(monitor, cell) {

            //cell level data
            var that = this;
            this.monitor = monitor;
            this.cell = cell
            this.view = "jobs";
            this.lastview = "jobs";
            this.cellStartTime = -1;
            this.cellEndTime = -1;
            this.numActiveJobs = 0;
            this.numCompletedJobs = 0;
            this.numFailedJobs = 0;

            this.numActiveTasks = 0;
            this.maxNumActiveTasks = 0;

            this.data = new vis.DataSet();


            //timeline data
            this.timelineData = new vis.DataSet(options = {
                queue: true
            });
            this.timelineGroups = new vis.DataSet([
                {
                    id: 'jobs',
                    content: 'Jobs:',
                    className: 'visjobgroup',
                },
                { id: 'stages', content: 'Stages:', },
            ]);

            this.timelineOptions = {
                rollingMode: {
                    follow: false,
                    offset: 0.75
                },
                margin: {
                    item: 2,
                    axis: 2,

                },
                stack: true,
                showTooltips: true,
                maxHeight: '400px',
                minHeight: '250px',
                zoomMax: 10800000,
                zoomMin: 2000,
                editable: false,
                tooltip: {
                    overflowMethod: 'cap',
                },
                align: 'center',
                orientation: 'top',
                verticalScroll: true,
            };
            this.timeline = null;

            //aggregated taskgraph data
            this.taskGraphData = new vis.DataSet();
            this.taskGraphOptions = {
                start: new Date(),
                maxHeight: '400px',
                minHeight: '70px',
                drawPoints: false,
                interpolation: {
                    enabled: false,
                    parametrization: "uniform"
                },
                shaded: true,
                dataAxis: {
                    left: {
                        range: {
                            min: 0,
                            max: 20,
                        },
                        title: {
                            text: "Active Tasks"
                        }
                    },
                },
                legend: true,
                defaultGroup: "Active Tasks"

            };
            this.taskGraph = null;

            //table data
            this.jobData = new vis.DataSet();
            this.jobDataSetCallback = null;
        }


        CellMonitor.prototype.createDisplay = function () {
            this.html = widgetHTML
            var that = this;

            if (!this.cell.element.find('.CellMonitor').length) {
                var element = $(this.html).hide();
                this.displayElement = element;
                this.cell.element.find('.inner_cell').append(element);

                element.slideToggle();



                element.find('.cancel').click(function () {
                    console.log('Stopping Jobs');
                    Jupyter.notebook.kernel.interrupt();
                    that.monitor.send({
                        msgtype: 'sparkStopJobs',
                    });
                });

                element.find('.sparkuibutton').click(function () {
                    //var spinner = $(' <div> <img class="iframeload" src="' + require.toUrl('./spinner.gif') + '"></div>')
                    var iframe = $('\
                    <div style="overflow:hidden">\
                    <iframe src="/sparkmonitor/" frameborder="0" scrolling="yes" class="sparkuiframe">\
                    </iframe>\
                    </div>\
                    ');
                    // iframe.find('.sparkuiframe').before(spinner);
                    iframe.find('.sparkuiframe').css('background-image', 'url("' + require.toUrl('./spinner.gif') + '")');
                    iframe.find('.sparkuiframe').css('background-repeat', 'no-repeat');
                    iframe.find('.sparkuiframe').css('background-position', "50% 50%");
                    iframe.find('.sparkuiframe').width('100%');
                    iframe.find('.sparkuiframe').height('100%');
                    iframe.dialog({
                        title: "Spark UI 127.0.0.1:4040",
                        width: 1000,
                        height: 500,
                    });
                });

                element.find('.titlecollapse').click(function () {
                    if (that.view != "hidden") {
                        that.lastview = that.view;
                        that.view = "hidden";
                        //TODO cleanup handlers
                    }
                    that.cell.element.find('.content').slideToggle({
                        queue: false,
                        duration: 400,
                        complete: function () {
                            that.cell.element.find('.headericon').toggleClass('headericoncollapsed');
                        }
                    });

                });

                element.find('.taskviewtabbutton').click(function () {
                    console.log('clicked3');
                    if (that.view != 'tasks') {
                        that.view = 'tasks';
                        element.find('.tabcontent').removeClass('tabcontentactive')
                        element.find('.tabbutton').removeClass('tabbuttonactive')

                        element.find('.taskviewcontent').addClass('tabcontentactive')
                        $(this).addClass('tabbuttonactive');
                        that.createTaskGraph();
                    }
                });
                element.find('.timelinetabbutton').click(function () {
                    console.log('clicked');
                    if (that.view != 'timeline') {
                        that.view = 'timeline';
                        element.find('.tabcontent').removeClass('tabcontentactive')
                        element.find('.tabbutton').removeClass('tabbuttonactive')

                        element.find('.timelinecontent').addClass('tabcontentactive')
                        $(this).addClass('tabbuttonactive');
                        that.createTimeline();
                    }
                });
                element.find('.jobtabletabbutton').click(function () {
                    console.log('clicked2');
                    if (that.view != 'jobs') {
                        that.view = 'jobs';
                        element.find('.tabcontent').removeClass('tabcontentactive')
                        element.find('.tabbutton').removeClass('tabbuttonactive')

                        element.find('.jobtablecontent').addClass('tabcontentactive')
                        $(this).addClass('tabbuttonactive');
                        that.createJobTable();
                    }

                });
                this.createJobTable();
            }
            else console.error("SparkMonitor: Error Display Already Exists");

        }

        CellMonitor.prototype.setBadges = function () {
            if (this.numActiveJobs > 0) {
                this.cell.element.find('.badgerunning').show();
                this.cell.element.find('.badgerunningcount').html(this.numActiveJobs);
            }
            else this.cell.element.find('.badgerunning').hide()
            if (this.numCompletedJobs > 0) {
                this.cell.element.find('.badgecompleted').show();
                this.cell.element.find('.badgecompletedcount').html(this.numCompletedJobs);
            }
            else this.cell.element.find('.badgecompleted').hide()
            if (this.numFailedJobs > 0) {
                this.cell.element.find('.badgefailed').show();
                this.cell.element.find('.badgefailedcount').html(this.numFailedJobs);
            }
            else this.cell.element.find('.badgefailed').hide()
        }

        CellMonitor.prototype.cleanUp = function () {
            this.clearTimelineRefresher();
            this.timeline.destroy();
            this.taskGraph.destroy();
            this.cell.element.find('.CellMonitor').remove();
        }

        //--------Timeline Functions-----------------------
        CellMonitor.prototype.registerTimelineRefresher = function () {
            var i = 0;
            var that = this;
            this.flushInterval = setInterval(function () {
                i++;
                if (i == 2) {
                    i = 0;
                    that.timelineData.forEach(function (item) {
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

        CellMonitor.prototype.clearTimelineRefresher = function () {
            clearInterval(this.flushInterval);
        }

        CellMonitor.prototype.resizeTimeline = function (start, end) {
            if (this.view == 'timeline') {
                try {
                    if (!start) start = new Date();
                    start.setTime(start.getTime() - 30000)
                    if (!end) end = new Date(start.getTime() + 120000);
                    this.timeline.setWindow(start, end, { animation: true });
                }
                catch (err) {
                    console.log("SparkMonitor: Error resizing timeline:", err);
                }
            }


        }

        CellMonitor.prototype.addLinetoTimeline = function () {

        }

        CellMonitor.prototype.createTimeline = function () {
            if (this.view == 'timeline') {
                var container = this.cell.element.find('.timelinecontainer')[0]
                if (this.timeline) this.timeline.destroy()
                this.timeline = new vis.Timeline(container, this.timelineData, this.timelineGroups, this.timelineOptions);
                this.registerTimelineRefresher();
                this.resizeTimeline();
            }
        }

        //--------Task Graph Functions Functions-----------
        CellMonitor.prototype.createTaskGraph = function () {
            if (this.view == 'tasks') {
                var container = this.cell.element.find('.taskcontainer')[0]
                if (this.taskGraph) this.taskGraph.destroy()
                this.taskGraph = new vis.Graph2d(container, this.taskGraphData, this.taskGraphOptions);
            }
        }


        CellMonitor.prototype.resizeTaskGraph = function (start, end) {
            if (this.view == 'tasks') {
                try {
                    if (!start) start = new Date();
                    start.setTime(start.getTime() - 30000)
                    if (!end) end = new Date(start.getTime() + 120000);
                    this.taskGraph.setWindow(start, end, { animation: true });
                    this.taskGraph.setOptions({

                        dataAxis: {
                            left: {
                                range: {
                                    min: 0,
                                    max: this.maxNumActiveTasks + 1,
                                },
                            },
                        },

                    })
                }
                catch (err) {
                    console.log("SparkMonitor: Error resizing task graph:", err);
                }
            }


        }


        //--------Job Table Functions----------------------

        CellMonitor.prototype.createJobTable = function () {
            if (this.view == 'jobs') {
                this.cell.element.find('.jobtable thead')
                var table = $("<table/>").addClass('jobtable');
                var head = $("\
            <thead>\
            <tr>\
                <th>Job ID</th>\
                <th>Job Name</th>\
                <th>Status</th>\
                <th>Stages:Active/Completed</th>\
                <th>Tasks</th>\
                <th>Submission Time</th>\
                <th>Duration</th>\
            </tr>\
            </thead>\
                ");
                table.append(head);
                var body = $('<tbody></tbody>')
                this.jobData.forEach(function (item) {
                    row = $('<tr></tr>').addClass('row' + item.jobId);
                    row.append($('<td></td>').addClass('tdjobId').text(item.jobId));
                    row.append($('<td></td>').addClass('tdname').text(item.name));
                    var status = $('<span></span>').addClass(item.status).text(item.status);
                    row.append($('<td></td>').addClass('tdstatus').html(status));
                    row.append($('<td></td>').addClass('tdstages').text(item.jobId));
                    row.append($('<td></td>').addClass('tdtasks').text(item.jobId));
                    var start = $('<time></time>').addClass('timeago').attr('data-livestamp', item.start).attr('title', item.start.toString()).text(item.start.toString())
                    row.append($('<td></td>').addClass('tdstarttime').append(start));
                    var duration = "-";
                    if (item.status != "RUNNING") duration = moment.twix(item.start.getTime(), item.end.getTime()).humanizeLength()
                    row.append($('<td></td>').text(duration))
                    body.append(row);
                })
                table.append(body);
                this.cell.element.find('.jobtablecontent').empty().append(table);
                this.bindJobData();
            }
        }

        CellMonitor.prototype.bindJobData = function () {
            var that = this;
            this.jobDataSetCallback =
                function (event, properties, senderId) {
                    console.log("JOBDATASETCHANGED");
                    if (that.view == 'jobs') {
                        { that.createJobTable(); }
                    };

                }
            this.jobData.on('*', this.jobDataSetCallback);
        }

        CellMonitor.prototype.unbindJobData = function () {
            //TODO optimise and make changes
            this.jobData.off('*', this.jobDataSetCallback);
        }


        //----------Data Handling Functions----------------

        CellMonitor.prototype.sparkJobStart = function (data) {

            this.numActiveJobs += 1;
            this.setBadges();

            var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string

            this.data.update({
                id: 'job' + data.jobId,
                jobId: data.jobId,
                start: new Date(data.submissionTime),
                name: name,
                mode: 'ongoing',
            });

            this.jobData.update({
                id: 'job' + data.jobId,
                jobId: data.jobId,
                start: new Date(data.submissionTime),
                name: name,
                status: data.status,
            });


            this.timelineData.update({
                id: 'job' + data.jobId,
                start: new Date(data.submissionTime),
                end: new Date(),
                content: '' + name,
                title: data.jobId + ': ' + data.name + ' ',
                group: 'jobs',
                className: 'itemrunning job',
            });

        }

        CellMonitor.prototype.sparkJobEnd = function (data) {

            if (data.status == "SUCCEEDED") {
                this.numActiveJobs -= 1;
                this.numCompletedJobs += 1;

            } else {
                this.numActiveJobs -= 1;
                this.numFailedJobs += 1;
            }
            this.setBadges()
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

            this.jobData.update({
                id: 'job' + data.jobId,
                end: new Date(data.completionTime),
                status: data.status,
            });
        }

        CellMonitor.prototype.sparkStageSubmitted = function (data) {
            var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
            var submissionDate;
            if (data.submissionTime == -1) submissionDate = new Date()
            else submissionDate = new Date(data.submissionTime);

            this.data.update({
                id: 'stage' + data.stageId,
                stageId: data.stageId,
                name: name,
                start: submissionDate,
                mode: 'ongoing',
            });

            this.timelineData.update({
                id: 'stage' + data.stageId,
                start: submissionDate,
                content: "" + name,
                group: 'stages',
                title: 'Stage: ' + data.stageId + ' ' + name,
                end: new Date(),
                className: 'itemrunning stage',
            });
        }

        CellMonitor.prototype.sparkStageCompleted = function (data) {

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
            });
        }

        CellMonitor.prototype.sparkTaskStart = function (data) {
            //Create a group for the executor if one does not exist.
            if (!this.timelineGroups.get(data.executorId + '-' + data.host)) {
                this.timelineGroups.update({
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
                title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
                className: 'itemrunning task',
            });

            this.numActiveTasks += 1;
            if (this.maxNumActiveTasks < this.numActiveTasks) this.maxNumActiveTasks = this.numActiveTasks;
            this.taskGraphData.add({
                x: new Date(data.launchTime),
                y: this.numActiveTasks
            })
        }

        CellMonitor.prototype.sparkTaskEnd = function (data) {
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
            this.numActiveTasks -= 1;
            this.taskGraphData.add({
                x: new Date(data.finishTime),
                y: this.numActiveTasks
            })
            this.resizeTaskGraph();
        }



        return CellMonitor;
    });