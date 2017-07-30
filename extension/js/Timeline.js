import vis from 'vis/index-timeline-graph2d';
import 'vis/dist/vis-timeline-graph2d.min.css';
import './timeline.css';


function Timeline(cellmonitor) {

    this.cellmonitor = cellmonitor;
    this.timelineGroups1 = new vis.DataSet([
        {
            id: 'jobs',
            content: 'Jobs:',
            className: 'visjobgroup',
        }
    ]);
    this.timelineGroups2 = new vis.DataSet([
        { id: 'stages', content: 'Stages:', },
    ]);
    this.timelineGroups3 = new vis.DataSet([]);
    this.timelineData1 = new vis.DataSet({ queue: true });
    this.timelineData2 = new vis.DataSet({ queue: true });
    this.timelineData3 = new vis.DataSet({ queue: true });

    this.runningItems1 = new vis.DataSet();
    this.runningItems2 = new vis.DataSet();
    this.runningItems3 = new vis.DataSet();

    this.runningItems = {};

    this.timelineOptions1 = {
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
        minHeight: '100px',
        zoomMax: 10800000,
        zoomMin: 2000,
        editable: false,
        tooltip: {
            overflowMethod: 'cap',
        },
        align: 'center',
        orientation: 'top',
        verticalScroll: false,
    };
    this.timelineOptions2 = {
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
        minHeight: '50px',
        showMinorLabels: false,
        showMajorLabels: false,
        zoomMax: 10800000,
        zoomMin: 2000,
        editable: false,
        tooltip: {
            overflowMethod: 'cap',
        },
        align: 'center',
        orientation: 'top',
        verticalScroll: false,
    };
    this.timelineOptions3 = {
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
        minHeight: '100px',
        showMinorLabels: false,
        showMajorLabels: false,
        zoomMax: 10800000,
        zoomMin: 2000,
        editable: false,
        tooltip: {
            overflowMethod: 'cap',
        },
        align: 'center',
        orientation: 'top',
        verticalScroll: false,
    };
    this.timeline1 = null;
    this.timeline2 = null;
    this.timeline3 = null;
}

Timeline.prototype.registerRefresher = function () {
    var that = this;
    that.i = 0;
    this.clearRefresher();
    this.flushInterval = setInterval(function () {
        console.log("SparkMonitor-Timeline: Updating Timeline")
        that.i++;
        if (that.i == 2) {
            that.i = 0;
            var date = new Date();
            that.timelineData1.flush();
            that.timelineData2.flush();
            that.timelineData3.flush();
            that.runningItems1.forEach(function (item) {
                that.timelineData1.update({
                    id: item.id,
                    end: date
                });
            });
            that.runningItems2.forEach(function (item) {
                that.timelineData2.update({
                    id: item.id,
                    end: date
                });
            });
            that.runningItems3.forEach(function (item) {
                that.timelineData3.update({
                    id: item.id,
                    end: date
                });
            });
            that.setRanges(
                that.cellmonitor.cellStartTime,
                (that.cellmonitor.cellEndTime > 0 ? that.cellmonitor.cellEndTime : new Date()),
                false, true);
        }
        that.timelineData1.flush()
        that.timelineData2.flush()
        that.timelineData3.flush()
    }, 1000);
}

Timeline.prototype.clearRefresher = function () {
    if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = null;
    }
}

Timeline.prototype.resizeTimeline = function (start, end) {
    if (this.cellmonitor.view == 'timeline') {
        try {
            if (!start) start = new Date(this.cellmonitor.cellStartTime);
            // start.setTime(start.getTime() - 30000)
            if (!end) {
                if (!this.cellmonitor.cellEndTime) end = new Date(start.getTime() + 120000);
                else end = this.cellmonitor.cellEndTime;
            }
            this.timeline1.setWindow(start, end, { animation: true });
            this.timeline2.setWindow(start, end, { animation: true });
            this.timeline3.setWindow(start, end, { animation: true });
        }
        catch (err) {
            console.log("SparkMonitor-Timeline: Error resizing timeline:", err);
        }
    }
}

Timeline.prototype.addLinetoTimeline = function (time, id, title) {
    // console.log('SparkMonitor-Timeline: adding line');
    if (this.cellmonitor.view == "timeline") {
        this.timeline1.addCustomTime(time, id);
        this.timeline1.setCustomTimeTitle(title, id);
        this.timeline2.addCustomTime(time, id);
        this.timeline2.setCustomTimeTitle(title, id);
        this.timeline3.addCustomTime(time, id);
        this.timeline3.setCustomTimeTitle(title, id);
    }
}

Timeline.prototype.setRanges = function (start, end, set = false, moveWindow) {
    var b = end.getTime();
    var a = start.getTime();
    var min = new Date(a - ((b - a) / 15));
    var max = new Date(b + ((b - a) / 15));

    this.timelineOptions1.start = new Date(min);
    this.timelineOptions2.start = new Date(min);
    this.timelineOptions3.start = new Date(min);

    this.timelineOptions1.end = new Date(max);
    this.timelineOptions2.end = new Date(max);
    this.timelineOptions3.end = new Date(max);



    if (set) {
        this.timelineOptions1['showCurrentTime'] = false;
        this.timelineOptions2['showCurrentTime'] = false;
        this.timelineOptions3['showCurrentTime'] = false;
        this.timelineOptions1.min = new Date(min);
        this.timelineOptions2.min = new Date(min);
        this.timelineOptions3.min = new Date(min);

        this.timelineOptions1.max = new Date(max);
        this.timelineOptions2.max = new Date(max);
        this.timelineOptions3.max = new Date(max);
    }
    if (moveWindow && this.cellmonitor.view == "timeline") {
        if (this.timeline1) this.timeline1.setWindow(min, max);
        if (this.timeline2) this.timeline2.setWindow(min, max);
        if (this.timeline3) this.timeline3.setWindow(min, max);
    }


    if (this.cellmonitor.view == "timeline" && set) {

        if (this.timeline1) this.timeline1.setOptions(this.timelineOptions1);
        if (this.timeline2) this.timeline2.setOptions(this.timelineOptions2);
        if (this.timeline3) this.timeline3.setOptions(this.timelineOptions3);
    }
}

Timeline.prototype.create = function () {
    var that = this;
    if (this.cellmonitor.view == 'timeline') {

        var container1 = this.cellmonitor.displayElement.find('.timelinecontainer1').empty()[0]
        var container2 = this.cellmonitor.displayElement.find('.timelinecontainer2').empty()[0]
        var container3 = this.cellmonitor.displayElement.find('.timelinecontainer3').empty()[0]

        this.setRanges(
            this.cellmonitor.cellStartTime,
            (this.cellmonitor.cellEndTime > 0 ? this.cellmonitor.cellEndTime : new Date()),
            false);

        this.timeline1 = new vis.Timeline(container1, this.timelineData1, this.timelineGroups1, this.timelineOptions1);
        this.timeline2 = new vis.Timeline(container2, this.timelineData2, this.timelineGroups2, this.timelineOptions2);
        this.timeline3 = new vis.Timeline(container3, this.timelineData3, this.timelineGroups3, this.timelineOptions3);

        //Make dragging one timeline drag all timelines
        this.timeline1.on('rangechange', function (properties) {
            if (properties.byUser) that.timeline2.setWindow(properties.start, properties.end, { animation: false });
            if (properties.byUser) that.timeline3.setWindow(properties.start, properties.end, { animation: false });
        });
        this.timeline2.on('rangechange', function (properties) {
            if (properties.byUser) that.timeline1.setWindow(properties.start, properties.end, { animation: false });
            if (properties.byUser) that.timeline3.setWindow(properties.start, properties.end, { animation: false });
        });
        this.timeline3.on('rangechange', function (properties) {
            if (properties.byUser) that.timeline1.setWindow(properties.start, properties.end, { animation: false });
            if (properties.byUser) that.timeline2.setWindow(properties.start, properties.end, { animation: false });
        });

        this.timeline1.redraw();
        this.timeline2.redraw();
        this.timeline3.redraw();



        this.registerRefresher();
        // this.timeline.on('select', function (properties) {
        //     console.log(properties)
        //     if (properties.items.length) {
        //         if (properties.items[0].substr(0, 3) == "job") {
        //             var name = properties.items[0].substring(3)
        //             that.cellmonitor.openSparkUI('jobs/job/?id=' + name);
        //         }
        //         if (properties.items[0].substr(0, 5) == "stage") {
        //             var name = properties.items[0].substring(5)
        //             that.cellmonitor.openSparkUI('stages/stage/?id=' + name + '&attempt=0');
        //         }
        //         if (properties.items[0].substr(0, 4) == "task") {
        //             that.cellmonitor.openSparkUI('stages/stage/?id=' + that.timelineData.get(properties.items[0]).stage + '&attempt=0');
        //         }
        //     }
        // });
        setTimeout(function () {
            that.timelineData1.forEach(function (item) {
                that.addLinetoTimeline(item.start, '' + that.cellmonitor.appId + item.id + 'start', "Job Started");
                if (that.timelineData1.get(item.id).mode == "done") that.addLinetoTimeline(item.end, '' + that.cellmonitor.appId + item.id + 'end', "Job Ended");
            });
        }, 0);
    }
}

Timeline.prototype.hide = function () {
    try {
        if (this.timeline1) this.timeline1.destroy()
        if (this.timeline2) this.timeline2.destroy()
        if (this.timeline3) this.timeline3.destroy()
        this.timeline1 = null;
        this.timeline2 = null;
        this.timeline3 = null;
    }
    catch (err) { "SparkMonitor-Timeline: Error destroying timeline, ", console.log(err) }
    this.clearRefresher();
}

Timeline.prototype.cellCompleted = function () {
    this.setRanges(this.cellmonitor.cellStartTime, this.cellmonitor.cellEndTime, true);
}

//----------Data Handling Functions----------------

Timeline.prototype.sparkJobStart = function (data) {
    var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string
    this.timelineData1.update({
        id: data.jobId,
        start: new Date(data.submissionTime),
        end: new Date(),
        content: '' + name,
        // title: data.jobId + ': ' + data.name + ' ',
        group: 'jobs',
        className: 'itemrunning job',
        mode: "ongoing",
    });
    this.runningItems1.add({ id: data.jobId });
}

Timeline.prototype.sparkJobEnd = function (data) {
    this.timelineData1.update({
        id: data.jobId,
        end: new Date(data.completionTime),
        className: (data.status == "SUCCEEDED" ? 'itemfinished job' : 'itemfailed job'),
        mode: "done",
    });
    this.runningItems1.remove({ id: data.jobId });
    this.addLinetoTimeline(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
}

Timeline.prototype.sparkStageSubmitted = function (data) {
    var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
    var submissionDate;
    if (data.submissionTime == -1) submissionDate = new Date()
    else submissionDate = new Date(data.submissionTime);

    this.timelineData2.update({
        id: data.stageId,
        start: submissionDate,
        content: "" + name,
        group: 'stages',
        // title: 'Stage: ' + data.stageId + ' ' + name,
        end: new Date(),
        className: 'itemrunning stage',
        mode: "ongoing",
    });
    this.runningItems2.add({ id: data.stageId });
}

Timeline.prototype.sparkStageCompleted = function (data) {
    var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
    this.timelineData2.update({
        id: data.stageId,
        start: new Date(data.submissionTime),
        group: 'stages',
        end: new Date(data.completionTime),
        className: (data.status == "COMPLETED" ? 'itemfinished stage' : 'itemfailed stage'),
        // title: 'Stage: ' + data.stageId + ' ' + name,
        //content: '' + name,
        mode: "done",
    });
    this.runningItems2.remove({ id: data.stageId });
}

Timeline.prototype.sparkTaskStart = function (data) {
    if (!this.timelineGroups3.get(data.executorId + '-' + data.host)) {
        this.timelineGroups3.update({
            id: data.executorId + '-' + data.host,
            content: 'Tasks:<br>' + data.executorId + '<br>' + data.host
        });
    }

    this.timelineData3.update({
        id: data.taskId,
        stage: data.stageId,
        start: new Date(data.launchTime),
        end: new Date(),
        content: '' + data.taskId,
        group: data.executorId + '-' + data.host,
        // title: 'Task: ' + data.taskId + ' from stage ' + data.stageId + ' Launched: ' + Date(data.launchTime),
        className: 'itemrunning task',
        mode: "ongoing",
    });
    this.runningItems3.add({ id: data.taskId });
}

Timeline.prototype.sparkTaskEnd = function (data) {
    this.timelineData3.update({
        id: data.taskId,
        end: new Date(data.finishTime),
        // title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
        className: (data.status == "SUCCESS" ? 'itemfinished task' : 'itemfailed task'),
        mode: "done",
    });
    this.runningItems3.remove({ id: data.taskId });
}

export default Timeline;