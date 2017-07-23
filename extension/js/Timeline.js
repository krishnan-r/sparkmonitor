import vis from 'vis/index-timeline-graph2d';
import 'vis/dist/vis-timeline-graph2d.min.css';
import './timeline.css';


function Timeline(cellmonitor) {

    this.cellmonitor = cellmonitor;

    this.timelineData = new vis.DataSet({ queue: true });

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
            this.timeline.setWindow(start, end, { animation: true });
        }
        catch (err) {
            console.log("SparkMonitor-Timeline: Error resizing timeline:", err);
        }
    }
}

Timeline.prototype.addLinetoTimeline = function (time, id, title) {
    // console.log('SparkMonitor-Timeline: adding line');
    if (this.cellmonitor.view == "timeline") {
        this.timeline.addCustomTime(time, id);
        this.timeline.setCustomTimeTitle(title, id);
    }
}

Timeline.prototype.create = function () {
    var that = this;
    if (this.cellmonitor.view == 'timeline') {

        var container = this.cellmonitor.displayElement.find('.timelinecontainer').empty()[0]
        try {
            if (this.timeline) this.timeline.destroy()
        }
        catch (err) { console.log("SparkMonitor-Timeline: Error destroying timeline, ", err) }

        // this.timelineOptions.min = new Date(this.cellStartTime);
        this.timelineOptions.start = new Date(this.cellmonitor.cellStartTime);

        if (this.cellmonitor.cellEndTime > 0) {
            this.timelineOptions.end = this.cellmonitor.cellEndTime;
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
        this.registerRefresher();
        this.timeline.on('select', function (properties) {
            if (!that.popupdialog) that.popupdialog = $('<div></div>');
            that.popupdialog.html('<div>Selected Items: ' + properties.items + '<br> TODO: Show Data Here</div><br>').dialog({
                title: "Details"
            });
        });
    }
}

Timeline.prototype.hide = function () {
    try {
        if (this.timeline) this.timeline.destroy()
        this.timeline = null;
    }
    catch (err) { "SparkMonitor-Timeline: Error destroying timeline2, ", console.log(err) }
    this.clearRefresher();
}

Timeline.prototype.cellCompleted = function () {
    var b = this.cellmonitor.cellEndTime.getTime();
    var a = this.cellmonitor.cellStartTime.getTime();
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
    this.timelineOptions['end'] = max;
    this.timelineOptions['start'] = min;

}

//----------Data Handling Functions----------------

Timeline.prototype.sparkJobStart = function (data) {
    var that = this;
    var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string
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
}

Timeline.prototype.sparkJobEnd = function (data) {
    this.timelineData.update({
        id: 'job' + data.jobId,
        end: new Date(data.completionTime),
        className: (data.status == "SUCCEEDED" ? 'itemfinished job' : 'itemfailed job'),
        mode: "done",
    });
    this.addLinetoTimeline(new Date(data.completionTime), 'job' + data.jobId + 'end', 'Job ' + data.jobId + 'Ended');
}

Timeline.prototype.sparkStageSubmitted = function (data) {
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
}

Timeline.prototype.sparkStageCompleted = function (data) {
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
}

Timeline.prototype.sparkTaskStart = function (data) {
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
}

Timeline.prototype.sparkTaskEnd = function (data) {
    this.timelineData.update({
        id: 'task' + data.taskId,
        end: new Date(data.finishTime),
        // title: 'Task:' + data.taskId + ' from stage ' + data.stageId + 'Launched' + Date(data.launchTime) + 'Completed: ' + Date(data.finishTime),
        className: (data.status == "SUCCESS" ? 'itemfinished task' : 'itemfailed task'),
        mode: "done",
    });
}



export default Timeline;