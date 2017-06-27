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
            this.cellStartTime = new Date();
            this.cellEndTime = -1;
            this.numActiveJobs = 0;
            this.numCompletedJobs = 0;
            this.numFailedJobs = 0;

            this.numActiveTasks = 0;
            this.maxNumActiveTasks = 0;

            this.data = new vis.DataSet();

            events.off('finished.' + cell.cell_id + '.currentcell');
            events.one('finished.' + cell.cell_id + '.currentcell', function () {
                that.cellExecutionCompleted();
            })

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
                    parametrization: "centripetal"
                },
                sampling: false,
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
                //element.find('.content').hide()
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
                        that.cell.element.find('.content').slideUp({
                            queue: false, duration: 400,
                            complete: function () {
                                that.cell.element.find('.headericon').addClass('headericoncollapsed');
                                element.find('.tabcontent').removeClass('tabcontentactive');
                                element.find('.tabbutton').removeClass('tabbuttonactive');
                            }
                        });
                    } else {
                        that.showView(that.lastview);
                    }
                });
                element.find('.taskviewtabbutton').click(function () {
                    if (that.view != 'tasks') { that.showView("tasks"); }
                });
                element.find('.timelinetabbutton').click(function () {
                    if (that.view != 'timeline') { that.showView("timeline"); }
                });
                element.find('.jobtabletabbutton').click(function () {
                    if (that.view != 'jobs') { that.showView("jobs"); }
                });

                // $("[dt='tooltiptop']").tooltip({
                //     position: { my: 'center bottom', at: 'center top-10' },
                //     'tooltipClass': "tptop",
                // });
                // $("[dt='tooltipbottom']").tooltip({
                //     position: { my: 'center top', at: 'center bottom+10' },
                //     'tooltipClass': "tpbottom",
                // });
                // $("[dt='tooltipleft']").tooltip({
                //     position: { my: 'right center', at: 'left-10 center' },
                //     'tooltipClass': "tpleft",
                // });
                // $("[dt='tooltipright']").tooltip({
                //     position: { my: 'left center', at: 'right+10 center' },
                //     'tooltipClass': "tpright",
                // });

                this.showView("jobs");

            }
            else console.error("SparkMonitor: Error Display Already Exists");
        }

        CellMonitor.prototype.showView = function (view) {
            var that = this;
            var element = this.displayElement;
            element.find('.tabcontent').removeClass('tabcontentactive')
            element.find('.tabbutton').removeClass('tabbuttonactive')
            if (this.view == "hidden") {
                that.cell.element.find('.content').slideDown({
                    queue: false, duration: 400,
                    complete: function () { that.cell.element.find('.headericon').removeClass('headericoncollapsed'); }
                });
            }
            switch (view) {
                case "jobs":
                    this.view = "jobs";
                    element.find('.jobtablecontent').addClass('tabcontentactive');
                    element.find('.jobtabletabbutton').addClass('tabbuttonactive');
                    this.createJobTable();
                    break;
                case "tasks":
                    this.view = "tasks";
                    element.find('.taskviewcontent').addClass('tabcontentactive');
                    element.find('.taskviewtabbutton').addClass('tabbuttonactive');
                    this.createTaskGraph();
                    break;
                case "timeline":
                    this.view = "timeline";
                    element.find('.timelinecontent').addClass('tabcontentactive');
                    element.find('.timelinetabbutton').addClass('tabbuttonactive');
                    this.createTimeline();
                    break;
            }
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
            //this.clearTimelineRefresher(); 
            this.cell.element.find('.CellMonitor').remove();
        }

        //--------Timeline Functions-----------------------
        CellMonitor.prototype.registerTimelineRefresher = function () {

            var that = this;
            that.i = 0;
            this.flushInterval = setInterval(function () {
                that.i++;
                if (that.i == 2) {
                    that.i = 0;
                    var date = new Date();
                    that.timelineData.forEach(function (item) {
                        if (that.data.get(item.id).mode == "ongoing") {
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
                    if (!start) start = new Date(this.cellStartTime);
                    // start.setTime(start.getTime() - 30000)
                    if (!end) {
                        if (!this.cellEndTime) end = new Date(start.getTime() + 120000);
                        else end = this.cellEndTime;
                    }
                    this.timeline.setWindow(start, end, { animation: true });
                }
                catch (err) {
                    console.log("SparkMonitor: Error resizing timeline:", err);
                }
            }


        }

        CellMonitor.prototype.addLinetoTimeline = function (time, id, title) {
            if (this.view == "timeline") {
                this.timeline.addCustomTime(time, id);
                this.timeline.setCustomTimeTitle(title, id);
            }
        }

        CellMonitor.prototype.createTimeline = function () {
            var that = this;
            if (this.view == 'timeline') {
                var container = this.cell.element.find('.timelinecontainer').empty()[0]
                if (this.timeline) this.timeline.destroy()

                // this.timelineOptions.min = new Date(this.cellStartTime);
                this.timelineOptions.start = new Date(this.cellStartTime);


                if (this.cellEndTime > 0) {
                    this.timelineOptions.end = this.cellEndTime;
                    // this.timelineOptions.max = this.cellEndTime;
                }
                else {
                    var date = new Date();
                    date.setTime(date.getTime() + 30000);
                    this.timelineOptions.end = date;
                }


                this.timeline = new vis.Timeline(container, this.timelineData, this.timelineGroups, this.timelineOptions);

                //  that.addLinetoTimeline(new Date(that.cellStartTime), 'timebarcellstart', "Cell Start");
                this.timelineData.forEach(function (item) {
                    if (item.id.slice(0, 3) == "job") {
                        that.addLinetoTimeline(item.start, item.id + 'start', "Job Started");
                        if (that.data.get(item.id).mode == "done") that.addLinetoTimeline(item.end, item.id + 'end', "Job Ended");
                    }
                });

                this.registerTimelineRefresher();
                this.timeline.on('select', function (properties) {
                    if (!that.popupdialog) that.popupdialog = $('<div></div>');
                    that.popupdialog.html('<div>selected items: ' + properties.items + ' TODO show data here</div>').dialog();
                });
                // this.resizeTimeline(this.timelineOptions.start, this.timelineOptions.end);
            }
        }

        CellMonitor.prototype.hideTimeline = function () {
            if (this.timeline) this.timeline.destroy();
            this.clearTimelineRefresher();
        }

        //--------Task Graph Functions Functions-----------
        CellMonitor.prototype.createTaskGraph = function () {
            var that = this;
            if (this.view == 'tasks') {
                var container = this.cell.element.find('.taskcontainer').empty()[0]
                if (this.taskGraph) this.taskGraph.destroy()
                this.taskGraph = new vis.Graph2d(container, this.taskGraphData, this.taskGraphOptions);
                this.resizeTaskGraph(new Date(this.cellStartTime));

                this.timelineData.forEach(function (item) {
                    if (item.id.slice(0, 3) == "job") {
                        that.addLinetoTasks(item.start, item.id + 'start', "Job Started");
                        if (that.data.get(item.id).mode == "done") that.addLinetoTasks(item.end, item.id + 'end', "Job Ended");
                    }
                });

            }

        }

        CellMonitor.prototype.addLinetoTasks = function (time, id, title) {
            if (this.view == "tasks") {
                this.taskGraph.addCustomTime(time, id);
                this.taskGraph.setCustomTimeTitle(title, id);
            }
        }

        CellMonitor.prototype.resizeTaskGraph = function (start, end) {
            if (this.view == 'tasks') {
                try {
                    if (!start) start = new Date(this.cellStartTime);
                    // start.setTime(start.getTime() - 30000)
                    if (!end) {
                        if (!this.cellEndTime > 0) end = new Date();
                        else end = this.cellEndTime;
                    }
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

        CellMonitor.prototype.hideTasks = function () {

        }


        //--------Job Table Functions----------------------

        CellMonitor.prototype.createJobTable = function () {
            if (this.view == 'jobs') {
                this.cell.element.find('.jobtable > thead');
                var table = $("<table/>").addClass('jobtable');
                var head = $("\
            <thead>\
            <tr>\
                <th></th>\
                    <th> Job ID</th >\
                    <th>Job Name</th>\
                    <th>Status</th>\
                    <th>Stages:Active/Completed</th>\
                    <th>Tasks</th>\
                    <th>Submission Time</th>\
                    <th>Duration</th>\
            </tr >\
            </thead >\
                ");
                table.append(head);
                var body = $('<tbody></tbody>')
                this.jobData.forEach(function (item) {

                    var fakerow = $('<tr><td class="stagetableoffset"></td><td colspan=7 class="stagedata"></td></tr>');
                    fakerow.hide();
                    var stagetable = $("<table class='stagetable'>\
                    <thead>\
                    <th>Stage Id</th>\
                    <th>Stage Name</th>\
                    <th>Status</th>\
                    <th>Tasks</th>\
                    <th>Submission Time</th>\
                    </thead>\
                    <tbody>\
                    </tbody>\
                    </table>");
                    fakerow.find('.stagedata').append(stagetable);
                    row = $('<tr></tr>').addClass('row' + item.jobId);
                    var button = $('<td></td>').addClass('tdstagebutton').html('<span class="tdstageicon"> &#9658;</span>');
                    var icon = button.find('.tdstageicon');
                    button.click(function () {
                        console.log('clicked');
                        icon.toggleClass('tdstageiconcollapsed');
                        fakerow.slideToggle();
                    })
                    row.append(button);
                    row.append($('<td></td>').addClass('tdjobId').text(item.jobId));
                    row.append($('<td></td>').addClass('tdname').text(item.name));
                    var status = $('<span></span>').addClass(item.status).text(item.status);
                    row.append($('<td></td>').addClass('tdstatus').html(status));
                    row.append($('<td></td>').addClass('tdstages').text('-'));
                    row.append($('<td></td>').addClass('tdtasks').text('-'));
                    var start = $('<time></time>').addClass('timeago').attr('data-livestamp', item.start).attr('title', item.start.toString()).text(item.start.toString())
                    row.append($('<td></td>').addClass('tdstarttime').append(start));
                    var duration = "-";
                    var durationtext = "-";
                    if (item.status != "RUNNING") {
                        var t = moment(item.start.getTime()).twix(item.end.getTime());
                        duration = t.simpleFormat();
                        durationtext = t.humanizeLength();
                    }
                    row.append($('<td></td>').text(durationtext).attr("title", duration));
                    body.append(row);
                    body.append(fakerow);
                })
                table.append(body);
                this.cell.element.find('.jobtablecontent').empty().append(table);
                this.bindJobData();
            }
        }

        CellMonitor.prototype.bindJobData = function () {
            var that = this;
            if (this.jobDataSetCallback)
                this.jobData.off('*', this.jobDataSetCallback);
            this.jobDataSetCallback =
                function (event, properties, senderId) {
                    console.log("SparkMonitor: JOBDATASETCHANGED");
                    if (that.view == 'jobs') {
                        { that.createJobTable(); }
                    };

                }
            this.jobData.on('*', this.jobDataSetCallback);
        }

        CellMonitor.prototype.unbindJobData = function () {
            this.jobData.off('*', this.jobDataSetCallback);
        }

        CellMonitor.prototype.hideJobTable = function () {

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

            this.addLinetoTimeline(new Date(data.submissionTime), 'job' + data.jobId + 'start', 'Job ' + data.jobId + 'Started');
            this.addLinetoTasks(new Date(data.submissionTime), 'job' + data.jobId + 'start', 'Job ' + data.jobId + 'Started');

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
            this.addLinetoTimeline(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
            this.addLinetoTasks(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
        }

        CellMonitor.prototype.sparkStageSubmitted = function (data) {
            var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
            var submissionDate;
            if (data.submissionTime == -1) submissionDate = new Date()
            else submissionDate = new Date(data.submissionTime);

            this.data.update({
                id: 'stage' + data.stageId,
                jobIds: data.jobIds,
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
            this.resizeTaskGraph();
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


            // this.taskGraphData.add({
            //     x: new Date(data.launchTime),
            //     y: this.numActiveTasks
            // })

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

            // this.taskGraphData.add({
            //     x: new Date(data.finishTime),
            //     y: this.numActiveTasks
            // })

            this.numActiveTasks -= 1;

            this.taskGraphData.add({
                x: new Date(data.finishTime),
                y: this.numActiveTasks
            })
        }

        CellMonitor.prototype.cellExecutionCompleted = function () {
            console.log("SparkMonitor: Cell Execution Completed");
            this.cellEndTime = new Date();
        }



        return CellMonitor;
    });