import Jupyter from 'base/js/namespace';
import events from 'base/js/events';
import $ from 'jquery';

import vis from 'vis/index-timeline-graph2d';
import 'vis/dist/vis-timeline-graph2d.min.css'

import livestamp from 'kuende-livestamp';
import twix from 'twix'

import widgetHTML from './cellmonitor.html'
import './styles.css'
import spinner from './images/spinner.gif'

import moment from 'moment'
import requirejs from 'require'

import Plotly from 'plotly.js/lib/core'



function CellMonitor(monitor, cell) {
    //cm = this; //DEBUG
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
    this.timelineData = new vis.DataSet({
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
        y: 0
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
                    <iframe src="'+ Jupyter.notebook.base_url + 'sparkmonitor/" frameborder="0" scrolling="yes" class="sparkuiframe">\
                    </iframe>\
                    </div>\
                    ');

            iframe.find('.sparkuiframe').css('background-image', 'url("' + requirejs.toUrl('./' + spinner) + '")');
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
    var b = this.cellEndTime.getTime();
    var a = this.cellStartTime.getTime();
    var min = new Date(a - ((b - a) / 10));
    var max = new Date(b + ((b - a) / 10));
    if (this.view == "timeline") {
        if (this.timeline) {
            this.timeline.setOptions({
                max: max,
                min: min,
            });
        }
    }
    this.timelineOptions['showCurrentTime'] = false;
    this.timelineOptions['max'] = max;
    this.timelineOptions['min'] = min;

}

//--------Task Graph Functions Functions-----------

CellMonitor.prototype.createTaskGraph = function () {
    if (this.view != 'tasks') {
        throw "SparkMonitor: Drawing tasks graph when view is not tasks";
    }
    var that = this;
    var container = this.displayElement.find('.taskcontainer').empty()[0];
    var trace1 = {
        x: [new Date(1000), new Date(4000), new Date(11000), new Date(41000)],
        y: [10, 15, 13, 17],
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#0091ea',
        name: 'Active Tasks'
    };

    var trace2 = {
        x: [new Date(7000), new Date(19000), new Date(3000), new Date(21000)],
        y: [16, 5, 11, 9],
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#ffee58',
        name: 'Executor Cores'
    };

    var data = [trace1, trace2];
    var layout = {
        title: 'Active Tasks and Executors Cores',
        // showlegend: false,
        margin: {
            t: 30, //top margin
            l: 30, //left margin
            r: 30, //right margin
            b: 30 //bottom margin
        },
        xaxis: {
            type: "date",
            title: 'Time',
        },
        yaxis: {

        },
        legend: {
            orientation: "h"
        }
    };
    var options = { displaylogo: false }

    Plotly.newPlot(container, data, layout, options);
    this.taskChart = container;
}

CellMonitor.prototype.addToTaskDataGraph = function (time, numTasks) {
    this.taskChartData.push({
        x: new Date(time),
        y: numTasks,
    });
    this.taskcountchanged = true;
    if (this.view == "tasks") {
        this.taskChartDataBuffer.push({
            x: new Date(time),
            y: numTasks
        });
    }
    this.addExecutorToTaskGraph(time, this.monitor.totalCores);

}

CellMonitor.prototype.addExecutorToTaskGraph = function (time, numCores) {
    this.executorData.push({
        x: new Date(time),
        y: numCores,
    });
    this.taskcountchanged = true;
    if (this.view == "tasks") {
        this.executorDataBuffer.push({
            x: new Date(time),
            y: numCores
        });
    }
}

CellMonitor.prototype.addLinetoTasks = function (time, id, title) {
    // if (this.view == "tasks") {
    //     // this.taskGraph.addCustomTime(time, id);
    //     // this.taskGraph.setCustomTimeTitle(title, id);
    // }
}

CellMonitor.prototype.hideTasksGraph = function () {
    Plotly.purge(this.taskChart);
    this.taskChart = null;
}

CellMonitor.prototype.registerTasksGraphRefresher = function () {
    var that = this;
    this.clearTasksGraphRefresher();
    this.taskinterval = setInterval(function () {
        if (that.taskcountchanged && that.view == "tasks" && that.taskChart) {
            var update = {
                x: [[time], [time]],
                y: [[rand()], [rand()]]
            }
            Plotly.extendTraces(that.taskChart, { y: [[rand()], [rand()]] }, [0, 1])

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
        var text = '' + data.numCompletedTasks + '' + (data.numActiveTasks > 0 ? ' + ' + data.numActiveTasks + ' ' : '') + ' / ' + data.numTasks;

        if (data.numTasks > 0) {
            val1 = (data.numCompletedTasks / data.numTasks) * 100;
            val2 = (data.numActiveTasks / data.numTasks) * 100;
            element.find('.tdstageitemprogress .data').text(text);
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
    //var stagetablebody = stagetable.find('tbody');
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
            var text = '' + data.numCompletedTasks + '' + (data.numActiveTasks > 0 ? ' + ' + data.numActiveTasks + ' ' : '') + ' / ' + data.numTasks;
            element.find('.tdjobitemprogress').find('.data').text(text);
            element.find('.tdjobitemprogress .val1').width(val1 + '%');
            element.find('.tdjobitemprogress .val2').width(val2 + '%');
        }
        element.find('.tdjobid').text(data.id);
        element.find('.tdjobname').text(data.name);

        var status = $('<span></span>').addClass(data.status).text(data.status).addClass('tditemjobstatus');
        element.find('.tdjobstatus').html(status);

        element.find('.tdjobstages').text('' + data.numCompletedStages + '/' + data.numStages + '' + (data.numSkippedStages > 0 ? ' (' + data.numSkippedStages + ' skipped)' : '        ') + (data.numActiveStages > 0 ? '(' + data.numActiveStages + ' active) ' : ''))

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
        var name = $('<div>').text(data['stageInfos'][stageid]['name']).html().split(' ')[0];//Hack for escaping HTML <, > from string.
        that.stageData[stageid] = {
            id: stageid,
            status: 'PENDING',
            job: data.jobId,
            name: name,
            numTasks: data['stageInfos'][stageid]['numTasks'],
            numActiveTasks: 0,
            numCompletedTasks: 0,
            numFailedTasks: 0,
            modified: true,
        };

    });
    if (name == "null") {
        var laststageid = Math.max.apply(null, data.stageIds);
        that.jobData[data.jobId]['name'] = that.stageData[laststageid]['name'];
    }
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
        // title: data.jobId + ': ' + data.name + ' ',
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
            that.jobData[data.jobId]['numSkippedStages'] += 1;
            that.jobData[data.jobId]['numStages'] -= 1;
            that.stageData[stageid]['modified'] = true;
            that.jobData[data.jobId]['numTasks'] -= that.stageData[stageid]['numTasks'];
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

    this.badgesmodified = true;


    this.timelineData.update({
        id: 'job' + data.jobId,
        end: new Date(data.completionTime),
        className: (data.status == "SUCCEEDED" ? 'itemfinished job' : 'itemfailed job'),
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
        // title: 'Stage: ' + data.stageId + ' ' + name,
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
        className: (data.status == "COMPLETED" ? 'itemfinished stage' : 'itemfailed stage'),
        // title: 'Stage: ' + data.stageId + ' ' + name,
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
        // title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
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
        // title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
        className: (data.status == "SUCCESS" ? 'itemfinished task' : 'itemfailed task'),
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
            console.error("Task Failed");
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


export default CellMonitor;