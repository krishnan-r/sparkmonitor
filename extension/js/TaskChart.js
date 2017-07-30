import Plotly from 'plotly.js/lib/core'

function TaskChart(cellmonitor) {
    var that = this;
    this.cellmonitor = cellmonitor;

    this.taskChart = null;
    this.taskChartDataX = [];
    this.taskChartDataY = [];
    this.executorDataX = [];
    this.executorDataY = [];


    this.executorDataBufferX = [];
    this.executorDataBufferY = [];

    this.jobDataX = [];
    this.jobDataY = [];
    this.jobDataText = [];
    this.jobDataBufferX = [];
    this.jobDataBufferY = [];
    this.jobDataBufferText = [];


    this.shapes = [];

    this.numActiveTasks = 0;
}

TaskChart.prototype.create = function () {
    if (this.cellmonitor.view != 'tasks') {
        throw "SparkMonitor: Drawing tasks graph when view is not tasks";
    }
    var that = this;
    this.clearRefresher();
    var container = this.cellmonitor.displayElement.find('.taskcontainer').empty()[0];
    var tasktrace = {
        x: that.taskChartDataX,
        y: that.taskChartDataY,
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#00aedb',
        name: 'Active Tasks'
    };

    var executortrace = {
        x: that.executorDataX,
        y: that.executorDataY,
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#F5C936',
        name: 'Executor Cores'
    };
    var jobtrace = {
        x: that.jobDataX,
        y: that.jobDataY,
        text: that.jobDataText,
        type: 'scatter',
        mode: 'markers',
        fillcolor: '#F5C936',
        name: 'Jobs',
        marker: {
            symbol: 23,
            color: "#4CB5AE",
            size: 1
        }
    };



    var data = [executortrace, tasktrace, jobtrace];
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
            fixedrange: true
        },
        legend: {
            orientation: "h"
        },
        dragmode: 'pan',
        shapes: that.shapes,
    };
    that.taskChartDataBufferX = [];
    that.taskChartDataBufferY = [];
    that.executorDataBufferX = [];
    that.executorDataBufferY = [];
    that.jobDataBufferX = [];
    that.jobDataBufferY = [];
    that.jobDataBufferText = [];

    var options = { displaylogo: false, scrollZoom: true }

    Plotly.newPlot(container, data, layout, options);
    this.taskChart = container;
    this.registerRefresher();
}

TaskChart.prototype.addData = function (time, numTasks) {
    this.taskChartDataX.push((new Date(time)).getTime());
    this.taskChartDataY.push(numTasks);
    // this.taskcountchanged = true;
    if (this.cellmonitor.view == "tasks") {
        this.taskChartDataBufferX.push((new Date(time)).getTime());
        this.taskChartDataBufferY.push(numTasks);
    }
    this.addExecutorData(time, this.cellmonitor.monitor.totalCores);
}

TaskChart.prototype.addExecutorData = function (time, numCores) {
    this.executorDataX.push((new Date(time)).getTime());
    this.executorDataY.push(numCores);
    this.taskcountchanged = true;
    if (this.cellmonitor.view == "tasks") {
        this.executorDataBufferX.push((new Date(time)).getTime());
        this.executorDataBufferY.push(numCores);
    }
}

TaskChart.prototype.addLinetoTasks = function (time, id, title) {

}

TaskChart.prototype.hide = function () {
    this.clearRefresher()
    Plotly.purge(this.taskChart);
    this.taskChart = null;
}

TaskChart.prototype.registerRefresher = function () {
    var that = this;
    this.clearRefresher();
    this.taskinterval = setInterval(function () {
        console.log('Updating Chart');
        if (that.taskcountchanged && that.cellmonitor.view == "tasks") {
            try {
                Plotly.extendTraces(
                    that.taskChart,
                    {
                        x: [that.executorDataBufferX.slice(), that.taskChartDataBufferX.slice()],
                        y: [that.executorDataBufferY.slice(), that.taskChartDataBufferY.slice()],
                    },
                    [0, 1]);
                Plotly.extendTraces(
                    that.taskChart,
                    {
                        x: [that.jobDataBufferX.slice()],
                        //  y: [that.jobDataBufferY.slice()],
                        text: [that.jobDataBufferText]
                    },
                    [2]);

                var update = {
                    shapes: that.shapes
                };
                Plotly.relayout(that.taskChart, update)
            }
            catch (err) {
                console.log("SparkMonitor: Exception in updating task graph ", err);
            }
            that.taskChartDataBufferX = [];
            that.taskChartDataBufferY = [];
            that.executorDataBufferX = [];
            that.executorDataBufferY = [];
            that.jobDataBufferX = [];
            that.jobDataBufferY = [];
            that.jobDataBufferText = [];
            that.taskcountchanged = false;
        }
    }, 500);
}

TaskChart.prototype.clearRefresher = function () {
    if (this.taskinterval) {
        clearInterval(this.taskinterval);
        this.taskinterval = null;
    }
}

TaskChart.prototype.cellCompleted = function () {
}

TaskChart.prototype.addJobData = function (jobId, time, event) {
    this.jobDataX.push((new Date(time)).getTime());
    this.jobDataY.push(0);
    this.jobDataText.push("Job " + jobId + " " + event);
    this.shapes.push({
        type: 'line',
        yref: 'paper',
        x0: time.getTime(),
        y0: 0,
        x1: time.getTime(),
        y1: 1,
        line: {
            color: '#4CB5AE',
            width: 1.5,
        }
    });
    if (this.cellmonitor.view == "tasks") {
        this.jobDataBufferX.push((new Date(time)).getTime());
        this.jobDataBufferY.push(0);
        this.jobDataBufferText.push("Job " + jobId + " " + event);
    }
}


//----------Data Handling Functions----------------

TaskChart.prototype.sparkJobStart = function (data) {
    this.addJobData(data.jobId, new Date(data.submissionTime), "started");
}

TaskChart.prototype.sparkJobEnd = function (data) {
    this.addJobData(data.jobId, new Date(data.completionTime), "ended");
}

TaskChart.prototype.sparkStageSubmitted = function (data) {
}

TaskChart.prototype.sparkStageCompleted = function (data) {

}

TaskChart.prototype.sparkTaskStart = function (data) {
    this.addData(data.launchTime, this.numActiveTasks);
    this.numActiveTasks += 1;
    this.addData(data.launchTime, this.numActiveTasks);
}

TaskChart.prototype.sparkTaskEnd = function (data) {
    this.addData(data.finishTime, this.numActiveTasks);
    this.numActiveTasks -= 1;
    this.addData(data.finishTime, this.numActiveTasks);
}

export default TaskChart;