var ts;
var cm;//DEBUG
define(['base/js/namespace', './misc', 'require', 'base/js/events', 'jquery', './lib/vis.min', './lib/livestamp', './lib/twix.min', './lib/chart.bundle.min'],
    function (Jupyter, misc, require, events, $, vis, livestamp, twix, chart) {
        require(['./lib/chartjs-plugin-annotation.min'], function (annotation) { console.log(annotation); })
        var widgetHTML;
        //console.log('SparkMonitor: Loading CSS from', require.toUrl('./styles.css'));
        misc.loadCSS(require.toUrl('./lib/vis.min.css'));
        //misc.loadCSS(require.toUrl('./lib/c3.min.css'));
        misc.loadCSS(require.toUrl('./styles.css'));
        //console.log('SparkMonitor: Loading HTML from', require.toUrl('./monitor.html'));
        misc.loadHTML(require.toUrl('./cellmonitor.html'), function (data) {
            widgetHTML = data
            //console.log('SparkMonitor: Finished Loading HTML from', require.toUrl('./monitor.html'), { 'html': data });
        });

        function CellMonitor(monitor, cell) {
            cm = this; //DEBUG
            //cell level data----------------------------------
            var that = this;
            this.monitor = monitor; //Parent SparkMonitor instance
            this.cell = cell        //Jupyter Cell instance
            this.view = "jobs";     //The current display tab
            this.lastview = "jobs";
            this.badgesmodified = false;
            this.displayCreated = false;

            setInterval($.proxy(this.setBadges, this), 1000);

            this.displayElement = null;

            this.cellStartTime = new Date();
            this.cellEndTime = -1;

            this.numActiveJobs = 0;
            this.numCompletedJobs = 0;
            this.numFailedJobs = 0;

            this.numActiveTasks = 0;
            this.maxNumActiveTasks = 0;

            events.off('finished' + cell.cell_id + 'currentcell');
            events.one('finished' + cell.cell_id + 'currentcell', function () {
                that.cellExecutionCompleted();
            })

            //timeline data----------------------------------
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
            this.timelinefirstshow = false;

            //aggregated taskgraph data----------------------------------

            this.taskChart = null;
            this.taskChartData = [];
            this.executorData = [{
                x: new Date(),
                y: 0
            },
            {
                x: new Date(),
                y: 4
            }];
            that.taskChartDataBuffer = [];
            that.executorDataBuffer = [];


            //Job Table Data----------------------------------
            this.jobData = {};
            this.stageData = {};
            this.stageIdtoJobId = {};
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

                element.find('.sparkuitabbutton').click(function () {
                    var iframe = $('\
                    <div style="overflow:hidden">\
                    <iframe src="/sparkmonitor/" frameborder="0" scrolling="yes" class="sparkuiframe">\
                    </iframe>\
                    </div>\
                    ');

                    iframe.find('.sparkuiframe').css('background-image', 'url("' + require.toUrl('./images/spinner.gif') + '")');
                    iframe.find('.sparkuiframe').css('background-repeat', 'no-repeat');
                    iframe.find('.sparkuiframe').css('background-position', "50% 50%");
                    iframe.find('.sparkuiframe').width('100%');
                    iframe.find('.sparkuiframe').height('100%');
                    iframe.dialog({
                        title: "Spark UI 127.0.0.1:4040",
                        width: 1000,
                        height: 500,
                        autoResize: false,
                    });
                });

                element.find('.titlecollapse').click(function () {
                    if (that.view != "hidden") {
                        that.lastview = that.view;
                        that.hideView(that.view);
                        that.view = "hidden";
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
                element.find('.content').slideDown({
                    queue: false, duration: 400,
                    complete: function () { that.cell.element.find('.headericon').removeClass('headericoncollapsed'); }
                });
            }
            switch (view) {
                case "jobs":
                    this.hideView(this.view);
                    this.view = "jobs";
                    element.find('.jobtablecontent').addClass('tabcontentactive');
                    element.find('.jobtabletabbutton').addClass('tabbuttonactive');
                    this.createJobTable();
                    break;
                case "tasks":
                    this.hideView(this.view);
                    this.view = "tasks";
                    element.find('.taskviewcontent').addClass('tabcontentactive');
                    element.find('.taskviewtabbutton').addClass('tabbuttonactive');
                    this.createTaskGraph();
                    break;
                case "timeline":
                    this.hideView(this.view);
                    this.view = "timeline";
                    element.find('.timelinecontent').addClass('tabcontentactive');
                    element.find('.timelinetabbutton').addClass('tabbuttonactive');
                    this.createTimeline();
                    break;
            }
        }

        CellMonitor.prototype.hideView = function (view) {
            switch (view) {
                case "jobs":
                    this.hideJobTable();
                    break;
                case "tasks":
                    this.hideTasksGraph();
                    break;
                case "timeline":
                    this.hideTimeline();
                    break;
            }
        }

        CellMonitor.prototype.setBadges = function (redraw = false) {
            if (this.badgesmodified || redraw) {
                this.badgesmodified = false;
                if (this.numActiveJobs > 0) {
                    this.displayElement.find('.badgerunning').show(500).css('display', 'inline');
                    this.displayElement.find('.badgerunningcount').html(this.numActiveJobs);
                }
                else this.displayElement.find('.badgerunning').hide(500)
                if (this.numCompletedJobs > 0) {
                    this.displayElement.find('.badgecompleted').show(500).css('display', 'inline');
                    this.displayElement.find('.badgecompletedcount').html(this.numCompletedJobs);
                }
                else this.displayElement.find('.badgecompleted').hide(500)
                if (this.numFailedJobs > 0) {
                    this.displayElement.find('.badgefailed').show().css('display', 'inline');
                    this.displayElement.find('.badgefailedcount').html(this.numFailedJobs);
                }
                else this.displayElement.find('.badgefailed').hide(500)
            }
        }

        CellMonitor.prototype.cleanUp = function () {
            //this.clearTimelineRefresher(); 
            this.displayElement.remove();
        }

        //--------Timeline Functions-----------------------
        CellMonitor.prototype.registerTimelineRefresher = function () {

            var that = this;
            that.i = 0;
            this.clearTimelineRefresher();
            this.flushInterval = setInterval(function () {
                that.i++;
                if (that.i == 2) {
                    that.i = 0;
                    var date = new Date();
                    that.timelineData.flush();
                    that.timelineData.forEach(function (item) {
                        if (that.timelineData.get(item.id).mode == "ongoing") {
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
            if (this.flushInterval) {
                clearInterval(this.flushInterval);
                this.flushInterval = null;
            }
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
            // console.log('adding line');
            if (this.view == "timeline") {
                this.timeline.addCustomTime(time, id);
                this.timeline.setCustomTimeTitle(title, id);
            }
        }

        CellMonitor.prototype.createTimeline = function () {
            var that = this;
            if (this.view == 'timeline') {

                var container = this.displayElement.find('.timelinecontainer').empty()[0]
                try {
                    if (this.timeline) this.timeline.destroy()
                }
                catch (err) { console.log(err) }

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

                this.timelinefirstshow = false;
                this.timeline = new vis.Timeline(container, this.timelineData, this.timelineGroups, this.timelineOptions);

                this.timelineData.forEach(function (item) {
                    if (item.id.slice(0, 3) == "job") {
                        that.addLinetoTimeline(item.start, item.id + 'start', "Job Started");
                        if (that.timelineData.get(item.id).mode == "done") that.addLinetoTimeline(item.end, item.id + 'end', "Job Ended");
                    }
                });
                this.registerTimelineRefresher();
                this.timeline.on('select', function (properties) {
                    if (!that.popupdialog) that.popupdialog = $('<div></div>');
                    that.popupdialog.html('<div>Selected Items: ' + properties.items + '<br> TODO: Show Data Here</div><br>').dialog({
                        title: "Details"
                    });
                });
            }
        }

        CellMonitor.prototype.hideTimeline = function () {
            try {
                if (this.timeline) this.timeline.destroy()
            }
            catch (err) { console.log(err) }
            this.clearTimelineRefresher();
        }

        CellMonitor.prototype.timelineCellCompleted = function () {
            if (this.view == "timeline") {
                if (this.timeline) {
                    this.timeline.setOptions({
                        showCurrentTime: false,
                        max: new Date(this.cellEndTime),
                        min: new Date(this.cellStartTime),
                    });
                }
            }
            this.timelineOptions['showCurrentTime'] = false;
            this.timelineOptions['max'] = new Date(this.cellEndTime);
            this.timelineOptions['min'] = new Date(this.cellStartTime);

        }

        //--------Task Graph Functions Functions-----------

        CellMonitor.prototype.createTaskGraph = function () {
            if (this.view != 'tasks') {
                throw "SparkMonitor: Drawing tasks graph when view is not tasks";
            }
            var that = this;
            if (this.taskChart) this.taskChart.destroy();
            var container = this.displayElement.find('.taskcontainer').empty();
            var canvas = $('<canvas></canvas>');
            canvas.width = container.width();
            canvas.height = container.height();
            var toolbar = $('<div><input type="checkbox" class="checklabels" name="showlabels" value="Show Labels">Show Labels</div>');
            container.append(toolbar, canvas);

            var ctx = canvas[0].getContext('2d');
            this.taskChartDataBuffer = [];
            this.executorDataBuffer = [];
            this.taskChart = new Chart(ctx, {
                // The type of chart we want to create
                type: 'line',
                // The data for our dataset

                data: {
                    datasets: [{
                        label: "Active Tasks",
                        backgroundColor: '#00aedb',
                        //borderColor:,
                        pointRadius: 0,
                        data: that.taskChartData.slice(),
                        //fill: false,
                        lineTension: 0,
                    },
                    {
                        label: "Total Executor Cores",
                        backgroundColor: '#F5C936',
                        data: that.executorData.slice(),
                        pointRadius: 0,
                        lineTension: 0,
                    }
                    ]
                },
                // Configuration options go here
                options: {
                    responsive: true,
                    scales: {
                        xAxes: [{
                            type: 'time',
                            scaleLabel: {
                                display: true,
                                labelString: 'Time'
                            }
                        }],
                        yAxes: [{
                            // stacked: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Active Tasks'
                            }
                        }]

                    },
                    // annotation: {
                    //     // Defines when the annotations are drawn.
                    //     // This allows positioning of the annotation relative to the other
                    //     // elements of the graph.
                    //     //
                    //     // Should be one of: afterDraw, afterDatasetsDraw, beforeDatasetsDraw
                    //     // See http://www.chartjs.org/docs/#advanced-usage-creating-plugins
                    //     drawTime: 'afterDatasetsDraw', // (default)

                    //     // Mouse events to enable on each annotation.
                    //     // Should be an array of one or more browser-supported mouse events
                    //     // See https://developer.mozilla.org/en-US/docs/Web/Events
                    //     events: ['click'],

                    //     // Double-click speed in ms used to distinguish single-clicks from 
                    //     // double-clicks whenever you need to capture both. When listening for
                    //     // both click and dblclick, click events will be delayed by this
                    //     // amount.
                    //     dblClickSpeed: 350, // ms (default)

                    //     // Array of annotation configuration objects
                    //     // See below for detailed descriptions of the annotation options
                    //     annotations: [{
                    //         drawTime: 'afterDraw', // overrides annotation.drawTime if set
                    //         id: 'a-line-1', // optional
                    //         type: 'line',
                    //         mode: 'vertical',
                    //         scaleID: 'x-axis-0',
                    //         value: new Date(),
                    //         borderColor: 'red',
                    //         borderWidth: 2,
                    //         label: {
                    //             enabled: true,
                    //             content: 'Test label'
                    //         },

                    //         // Fires when the user clicks this annotation on the chart
                    //         // (be sure to enable the event in the events array below).
                    //         onClick: function (e) {
                    //             // `this` is bound to the annotation element
                    //         }
                    //     }]
                    // }
                }
            });
            this.registerTasksGraphRefresher();
            ts = this.taskChart;

        }

        CellMonitor.prototype.addToTaskDataGraph = function (x, y) {

            this.taskChartData.push({
                x: new Date(x),
                y: y,
            });
            this.executorData.push({
                x: new Date(x),
                y: 4,
            });
            this.taskcountchanged = true;
            if (this.view == "tasks") {
                this.taskChartDataBuffer.push({
                    x: new Date(x),
                    y: y
                })
                this.executorDataBuffer.push({
                    x: new Date(x),
                    y: 4
                })
                //this.taskChart.update();
            }

        }

        CellMonitor.prototype.addExecutorToTaskGraph = function () {


        }

        CellMonitor.prototype.addLinetoTasks = function (time, id, title) {
            // if (this.view == "tasks") {
            //     // this.taskGraph.addCustomTime(time, id);
            //     // this.taskGraph.setCustomTimeTitle(title, id);
            // }
        }

        CellMonitor.prototype.resizeTaskGraph = function (start, end) {
            // if (this.view == 'tasks') {
            //     try {
            //         if (!start) start = new Date(this.cellStartTime);
            //         // start.setTime(start.getTime() - 30000)
            //         if (!end) {
            //             if (!this.cellEndTime > 0) end = new Date();
            //             else end = this.cellEndTime;
            //         }
            //         // this.taskGraph.setWindow(start, end, { animation: true });
            //         this.taskGraph.setOptions({

            //             dataAxis: {
            //                 left: {
            //                     range: {
            //                         min: 0,
            //                         max: this.maxNumActiveTasks + 1,
            //                     },
            //                 },
            //             },

            //         })
            //     }
            //     catch (err) {
            //         console.log("SparkMonitor: Error resizing task graph:", err);
            //     }
            // }
        }

        CellMonitor.prototype.hideTasksGraph = function () {
            this.clearTasksGraphRefresher();
            try {
                if (this.taskChart) this.taskChart.destroy();
            }
            catch (err) { console.log(err) }
        }

        CellMonitor.prototype.registerTasksGraphRefresher = function () {
            var that = this;
            this.clearTasksGraphRefresher();
            this.taskinterval = setInterval(function () {
                if (that.taskcountchanged && that.view == "tasks" && that.taskChart) {
                    that.taskChart.data.datasets[0].data.push.apply(that.taskChart.data.datasets[0].data, that.taskChartDataBuffer);
                    that.taskChart.data.datasets[1].data.push.apply(that.taskChart.data.datasets[1].data, that.executorDataBuffer);
                    that.taskChart.update();
                    that.taskChartDataBuffer = [];
                    that.executorDataBuffer = [];
                    that.taskcountchanged = false;
                }
            }, 1000);
        }

        CellMonitor.prototype.clearTasksGraphRefresher = function () {
            if (this.taskinterval) {
                clearInterval(this.taskinterval);
                this.taskinterval = null;
            }
        }

        //--------Job Table Functions----------------------

        CellMonitor.prototype.createJobTable = function () {
            if (this.view != 'jobs') {
                throw "SparkMonitor: Drawing job table when view is not jobs";
            }
            var that = this;
            var thead = $("<thead><tr>\
                            <th class='thbutton'></th>\
                            <th class='thjobid'>Job ID</th >\
                            <th class='thjobname'>Job Name</th>\
                            <th class='thjobstatus'>Status</th>\
                            <th class='thjobstages'>Stages</th>\
                            <th class='thjobtasks'>Tasks</th>\
                            <th class='thjobstart'>Submission Time</th>\
                            <th class='thjobtime'>Duration</th>\
                        </tr ></thead >");
            var tbody = $('<tbody></tbody>').addClass('jobtablebody');

            for (var jobId in that.jobData) {
                var jobdata = that.jobData[jobId];
                var jobrow = that.createJobItem();
                that.updateJobItem(jobrow, jobdata, true);
                tbody.append(jobrow);
            }
            var table = $("<table/>").addClass('jobtable');
            table.append(thead, tbody);
            this.displayElement.find('.jobtablecontent').empty().append(table);
            this.registerJobTableRefresher();
        }

        CellMonitor.prototype.createStageItem = function () {
            var srow = $('<tr></tr>').addClass('stagerow');
            var tdstageid = $('<td></td>').addClass('tdstageid');;
            var tdstagename = $('<td></td>').text('Unknown').addClass('tdstagename');
            var status = $('<span></span>').addClass("UNKNOWN").text('UNKNOWN');
            var tdstatus = $('<td></td>').addClass("tdstagestatus").html(status);
            var progress = $('\<div class="cssprogress">\
                               <div class="data"></div><span class="val1"></span><span class="val2"></span></div>').addClass('tdstageitemprogress');
            var tdtasks = $('<td></td>').addClass("tdstageprogress").append(progress);
            var tdstarttime = $('<td></td>').text('Unknown').addClass('tdstarttime');
            srow.append(tdstageid, tdstagename, tdstatus, tdtasks, tdstarttime);
            return srow;
        }

        CellMonitor.prototype.updateStageItem = function (element, data, redraw = false) {
            if (data.modified || redraw) {
                data.modified = false;
                var status = $('<span></span>').addClass(data.status).text(data.status);
                element.find('.tdstagestatus').html(status);
                element.find('.tdstageid').text(data.id);
                var val1 = 0, val2 = 0;
                if (data.numTasks > 0) {
                    val1 = (data.numCompletedTasks / data.numTasks) * 100;
                    val2 = (data.numActiveTasks / data.numTasks) * 100;
                    element.find('.tdstageitemprogress .data').text('' + data.numCompletedTasks + ' + ' + data.numActiveTasks + ' / ' + data.numTasks);
                }

                element.find('.tdstagestatus')
                element.find('.tdstageitemprogress .val1').width(val1 + '%');
                element.find('.tdstageitemprogress .val2').width(val2 + '%');
                if (data.name) {
                    element.find('.tdstagename').text(data.name);
                }
                if (data.start) {
                    var start = $('<time></time>').addClass('timeago').attr('data-livestamp', data.start).attr('title', data.start.toString()).text(data.start.toString())
                    element.find('.tdstarttime').empty().html(start);
                }
            }

        }

        CellMonitor.prototype.createJobItem = function () {
            var fakerow = $('<tr><td class="stagetableoffset"></td><td colspan=7 class="stagedata"></td></tr>').addClass('jobstagedatarow').hide();
            var stagetable = $("<table class='stagetable'>\
                    <thead>\
                    <th class='thstageid'>Stage Id</th>\
                    <th class='thstagename'>Stage Name</th>\
                    <th class='thstagestatus'>Status</th>\
                    <th class='thstagetasks'>Tasks</th>\
                    <th class='thstagestart'>Submission Time</th>\
                    </thead>\
                    <tbody></tbody></table>").addClass('stagetable');
            var stagetablebody = stagetable.find('tbody');
            fakerow.find('.stagedata').append(stagetable);
            var tdbutton = $('<td></td>').addClass('tdstagebutton').html('<span class="tdstageicon"> &#9658;</span>');
            var icon = tdbutton.find('.tdstageicon');
            tdbutton.click(function () {
                icon.toggleClass('tdstageiconcollapsed');
                fakerow.slideToggle();
            })

            var tdjobid = $('<td></td>').addClass('tdjobid');
            var tdjobname = $('<td></td>').addClass('tdjobname');
            var status = $('<span></span>').addClass("pending").text("PENDING").addClass('tditemjobstatus');
            var tdjobstatus = $('<td></td>').addClass('tdjobstatus').html(status);
            var tdjobstages = $('<td></td>').addClass('tdjobstages')
            var jobprogress = $('\
                        <div class="cssprogress">\
                        <div class="data"></div><span class="val1"></span><span class="val2"></span></div>').addClass('tdjobitemprogress');
            var tdjobtasks = $('<td></td>').addClass('tdtasks').append(jobprogress);
            var duration = "-", durationtext = "-";
            var tdjobtime = $('<td></td>').addClass('tdjobstarttime')
            var tdjobduration = $('<td></td>').text(durationtext).attr("title", duration).addClass('tdjobduration');
            var row = $('<tr></tr>').addClass('jobrow')
            row.append(tdbutton, tdjobid, tdjobname, tdjobstatus, tdjobstages, tdjobtasks, tdjobtime, tdjobduration);
            return row.add(fakerow);
        }

        CellMonitor.prototype.updateJobItem = function (element, data, redraw = false) {
            if (data.modified || redraw) {
                data.modified = false;
                element.addClass('jobrow' + data.id);
                var that = this;
                data.stageIds.forEach(function (stageId) {
                    var srow = element.find('.stagerow' + stageId);
                    if (!srow.length) {
                        srow = that.createStageItem().addClass("stagerow" + stageId);
                        element.find('.stagetable tbody').append(srow);
                        that.updateStageItem(srow, that.stageData[stageId], true);
                    }
                    else {
                        that.updateStageItem(srow, that.stageData[stageId]);
                    }
                });

                var val1 = 0, val2 = 0;
                if (data.numTasks > 0) {
                    val1 = (data.numCompletedTasks / data.numTasks) * 100;
                    val2 = (data.numActiveTasks / data.numTasks) * 100;
                    element.find('.tdjobitemprogress').find('.data').text('' + data.numCompletedTasks + ' + ' + data.numActiveTasks + ' / ' + data.numTasks);
                    element.find('.tdjobitemprogress .val1').width(val1 + '%');
                    element.find('.tdjobitemprogress .val2').width(val2 + '%');
                }
                element.find('.tdjobid').text(data.id);
                element.find('.tdjobname').text(data.name);

                var status = $('<span></span>').addClass(data.status).text(data.status).addClass('tditemjobstatus');
                element.find('.tdjobstatus').html(status);
                element.find('.tdjobstages').text('' + data.numCompletedStages + '/' + data.numStages)

                var start = $('<time></time>').addClass('timeago').attr('data-livestamp', data.start).attr('title', data.start.toString()).addClass('tdjobstart').livestamp(data.start);
                element.find('.tdjobstarttime').html(start);

                if (data.status != "RUNNING") {
                    var t = moment(data.start.getTime()).twix(data.end.getTime());
                    var duration = t.simpleFormat();
                    var durationtext = t.humanizeLength();
                    element.find('.tdjobduration').text(durationtext).attr("title", duration)
                }
            }
        }

        CellMonitor.prototype.updateJobTable = function () {
            console.log('updating table');
            var that = this;
            if (this.view != 'jobs') {
                throw "SparkMonitor: Updating job table when view is not jobs";
            }
            for (var jobId in that.jobData) {
                var jobdata = that.jobData[jobId];
                var jobrow = this.displayElement.find('.jobtablecontent table tbody .jobrow' + jobId);
                if (!jobrow.length) {
                    jobrow = this.createJobItem();
                    this.displayElement.find('.jobtablebody').append(jobrow);
                    this.updateJobItem(jobrow, jobdata, true);
                }
                else {
                    this.updateJobItem(jobrow, jobdata);
                }
            }
        }

        CellMonitor.prototype.registerJobTableRefresher = function () {
            clearInterval(this.jobtableinterval);
            var that = this;
            this.jobtableinterval = setInterval($.proxy(this.updateJobTable, this), 1000);
        }

        CellMonitor.prototype.clearJobTableRefresher = function () {
            clearInterval(this.jobtableinterval);
        }

        CellMonitor.prototype.hideJobTable = function () {
            this.clearJobTableRefresher();
        }

        //----------Data Handling Functions----------------

        CellMonitor.prototype.sparkJobStart = function (data) {
            var that = this;
            this.numActiveJobs += 1;
            //this.setBadges();
            this.badgesmodified = true;


            var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string

            //--------------
            this.jobData[data.jobId] = {

                id: data.jobId,
                start: new Date(data.submissionTime),
                name: name,
                status: data.status,
                stageIds: data.stageIds,

                numTasks: data.numTasks,
                numActiveTasks: 0,
                numCompletedTasks: 0,
                numFailedTasks: 0,

                numStages: data.stageIds.length,
                numActiveStages: 0,
                numCompletedStages: 0,
                numFailedStages: 0,
                numSkippedStages: 0,
                modified: true,
            };

            data.stageIds.forEach(function (stageid) {
                if (!that.stageIdtoJobId[stageid]) that.stageIdtoJobId[stageid] = [];
                that.stageIdtoJobId[stageid].push(data.jobId);

                that.stageData[stageid] = {
                    id: stageid,
                    status: 'PENDING',
                    job: data.jobId,
                    numTasks: 0,
                    numActiveTasks: 0,
                    numCompletedTasks: 0,
                    numFailedTasks: 0,
                    modified: true,
                };

            });
            //-----------------
            if (!this.displayCreated) {
                this.createDisplay();
                this.displayCreated = true;
            }

            this.timelineData.update({
                id: 'job' + data.jobId,
                start: new Date(data.submissionTime),
                end: new Date(),
                content: '' + name,
                title: data.jobId + ': ' + data.name + ' ',
                group: 'jobs',
                className: 'itemrunning job',
                mode: "ongoing",
            });

            // this.addLinetoTimeline(new Date(data.submissionTime), 'job' + data.jobId + 'start', 'Job ' + data.jobId + 'Started');
            //  this.addLinetoTasks(new Date(data.submissionTime), 'job' + data.jobId + 'start', 'Job ' + data.jobId + 'Started');

        }

        CellMonitor.prototype.sparkJobEnd = function (data) {
            var that = this;
            this.jobData[data.jobId]['status'] = data.status;
            this.jobData[data.jobId]['stageIds'].forEach(function (stageid) {
                if (that.stageData[stageid]['status'] == 'PENDING') {
                    that.stageData[stageid]['status'] = "SKIPPED";
                    that.stageData[stageid]['modified'] = true;
                }
            })
            if (data.status == "SUCCEEDED") {
                this.numActiveJobs -= 1;
                this.numCompletedJobs += 1;
                this.jobData[data.jobId]['status'] = "COMPLETED";
            } else {
                this.numActiveJobs -= 1;
                this.numFailedJobs += 1;
                this.jobData[data.jobId]['status'] = "FAILED"
            }
            //this.setBadges();
            this.badgesmodified = true;


            this.timelineData.update({
                id: 'job' + data.jobId,
                end: new Date(data.completionTime),
                className: 'itemfinished job',
                mode: "done",
            });

            //--------------

            this.jobData[data.jobId]['end'] = new Date(data.completionTime);
            this.jobData[data.jobId]['modified'] = true;
            //-----------------

            this.addLinetoTimeline(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
            this.addLinetoTasks(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
        }

        CellMonitor.prototype.sparkStageSubmitted = function (data) {
            var that = this;
            var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
            var submissionDate;
            if (data.submissionTime == -1) submissionDate = new Date()
            else submissionDate = new Date(data.submissionTime);

            this.timelineData.update({
                id: 'stage' + data.stageId,
                start: submissionDate,
                content: "" + name,
                group: 'stages',
                title: 'Stage: ' + data.stageId + ' ' + name,
                end: new Date(),
                className: 'itemrunning stage',
                mode: "ongoing",
            });

            //--------------
            this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
                that.jobData[jobId]['numActiveStages'] += 1;
                that.jobData[jobId]['modified'] = true;
            });

            this.stageData[data.stageId]['status'] = "RUNNING";
            this.stageData[data.stageId]['name'] = name;
            this.stageData[data.stageId]['start'] = submissionDate;
            this.stageData[data.stageId]['numTasks'] = data.numTasks;
            this.stageData[data.stageId]['modified'] = true;
            //--------------
        }

        CellMonitor.prototype.sparkStageCompleted = function (data) {
            var that = this;
            var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.

            this.timelineData.update({
                id: 'stage' + data.stageId,
                start: new Date(data.submissionTime),
                group: 'stages',
                end: new Date(data.completionTime),
                className: 'itemfinished stage',
                title: 'Stage: ' + data.stageId + ' ' + name,
                //content: '' + name,
                mode: "done",
            });

            //--------------
            this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
                that.jobData[jobId]['numActiveStages'] -= 1;
                that.jobData[jobId]['modified'] = true;
                if (data.status == 'COMPLETED') {
                    that.jobData[jobId]['numCompletedStages'] += 1;
                }
                else {
                    that.jobData[jobId]['numFailedStages'] += 1;
                }

            });

            this.stageData[data.stageId]['status'] = data.status;
            this.stageData[data.stageId]['start'] = new Date(data.submissionTime);
            this.stageData[data.stageId]['end'] = new Date(data.completionTime);
            this.stageData[data.stageId]['modified'] = true;
            //--------------
        }

        CellMonitor.prototype.sparkTaskStart = function (data) {
            var that = this;
            //Create a group for the executor if one does not exist.
            if (!this.timelineGroups.get(data.executorId + '-' + data.host)) {
                this.timelineGroups.update({
                    id: data.executorId + '-' + data.host,
                    content: 'Tasks:<br>' + data.executorId + '<br>' + data.host
                });
            }

            this.timelineData.update({
                id: 'task' + data.taskId,
                start: new Date(data.launchTime),
                end: new Date(),
                content: '' + data.taskId,
                group: data.executorId + '-' + data.host,
                title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
                className: 'itemrunning task',
                mode: "ongoing",
            });

            //---------------
            this.stageData[data.stageId]['numActiveTasks'] += 1;
            this.stageData[data.stageId]['firsttaskstart'] = new Date(data.launchTime);
            this.stageData[data.stageId]['modified'] = true;

            this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
                that.jobData[jobId]['numActiveTasks'] += 1;
                that.jobData[jobId]['modified'] = true;
            })
            //--------------

            this.addToTaskDataGraph(data.launchTime, this.numActiveTasks);
            this.numActiveTasks += 1;
            if (this.maxNumActiveTasks < this.numActiveTasks) this.maxNumActiveTasks = this.numActiveTasks;
            this.addToTaskDataGraph(data.launchTime, this.numActiveTasks);
        }

        CellMonitor.prototype.sparkTaskEnd = function (data) {
            var that = this;
            this.timelineData.update({
                id: 'task' + data.taskId,
                end: new Date(data.finishTime),
                title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
                className: 'itemfinished task',
                mode: "done",
            });


            //---------------
            this.stageData[data.stageId]['numActiveTasks'] -= 1;
            this.stageData[data.stageId]['modified'] = true;

            if (data.status == "SUCCESS") {
                this.stageData[data.stageId]['numCompletedTasks'] += 1;
            }
            else {
                this.stageData[data.stageId]['numFailedTasks'] += 1;
            }

            this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
                that.jobData[jobId]['numActiveTasks'] -= 1;
                that.jobData[jobId]['modified'] = true;
                if (data.status == "SUCCESS") {
                    that.jobData[jobId]['numCompletedTasks'] += 1;
                }
                else {
                    that.jobData[jobId]['numFailedTasks'] += 1;
                }
            });
            //--------------


            this.addToTaskDataGraph(data.finishTime, this.numActiveTasks);
            this.numActiveTasks -= 1;
            this.addToTaskDataGraph(data.finishTime, this.numActiveTasks);
        }


        CellMonitor.prototype.cellExecutionCompleted = function () {
            console.log("SparkMonitor: Cell Execution Completed");
            this.cellEndTime = new Date();
            this.timelineCellCompleted();
            this.displayElement.find('.cancel').hide(500);
        }
        return CellMonitor;
    });