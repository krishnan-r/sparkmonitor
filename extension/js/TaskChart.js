/**
 * Definitions for the TaskChart object.
 * This file and its imports are packaged as a separate AMD module, which is loaded asynchronously.
 * @module TaskChart
 */

import Plotly from 'plotly.js/lib/core' // The plotting library

/** 
 * Adds a chart with number of active tasks and executor cores to the monitoring display
 * @constructor
 * @param {CellMonitor} cellmonitor - The parent CellMonitor to render in.
 */
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

/** Creates and renders the Task Chart */
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
        // name: 'Jobs',
        showlegend: false,
        marker: {
            symbol: 23,
            color: "#4CB5AE",
            size: 1
        }
    };
    var data = [executortrace, tasktrace, jobtrace];
    var layout = {
        // title: 'Active Tasks and Executors Cores',
        // showlegend: false,
        margin: {
            t: 30, //top margin
            l: 30, //left margin
            r: 30, //right margin
            b: 60 //bottom margin
        },
        xaxis: {
            type: "date",
            // title: 'Time',
        },
        yaxis: {
            fixedrange: true
        },
        dragmode: 'pan',
        shapes: that.shapes,
        legend: {
            orientation: "h",
            x: 0,
            y: 5,
            // traceorder: 'normal',
            font: {
                family: 'sans-serif',
                size: 12,
                color: '#000'
            },
            // bgcolor: '#E2E2E2',
            // bordercolor: '#FFFFFF',
            // borderwidth: 2
        }
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
    if (!this.cellmonitor.allcompleted) this.registerRefresher();
}

/**
 * Add a data point to the Task Chart
 * @param {Date} time - The x axis value of time
 * @param {number} numTasks - Number of active tasks
 * 
 */
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

/** 
 * Add a data point to the executors trace.
 * @param {Date} time - The x axis value of time
 * @param {number} numCores - Number of executor cores
 */
TaskChart.prototype.addExecutorData = function (time, numCores) {
    this.executorDataX.push((new Date(time)).getTime());
    this.executorDataY.push(numCores);
    this.taskcountchanged = true;
    if (this.cellmonitor.view == "tasks") {
        this.executorDataBufferX.push((new Date(time)).getTime());
        this.executorDataBufferY.push(numCores);
    }
}

/** Hides the TaskChart. */
TaskChart.prototype.hide = function () {
    this.clearRefresher()
    try {
        Plotly.purge(this.taskChart);
    }
    catch (err) {
    }
    this.taskChart = null;
}

/** Registers a refresher to update the TaskChart. */
TaskChart.prototype.registerRefresher = function () {
    var that = this;
    this.clearRefresher();
    this.taskinterval = setInterval(function () { that.refreshTaskChart(); }, 800);
}

/** Refreshed the TaskChart. */
TaskChart.prototype.refreshTaskChart = function () {
    var that = this;
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
}

/** Removes the TaskChart Refresher. */
TaskChart.prototype.clearRefresher = function () {
    if (this.taskinterval) {
        clearInterval(this.taskinterval);
        this.taskinterval = null;
    }
}

/** Called when all cell execution is completed and all jobs have completed. */
TaskChart.prototype.onAllCompleted = function () {
    this.clearRefresher();
}

/**
 * Add a data point to the job trace.
 * @param {string} jobId - The JobId
 * @param {Data} time - The time of event
 * @param {string} event - "started" or "ended"
 */
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

/** Called when a Spark job starts. */
TaskChart.prototype.onSparkJobStart = function (data) {
    this.addJobData(data.jobId, new Date(data.submissionTime), "started");
    this.addExecutorData(data.submissionTime, data.totalCores);
}

/** Called when a Spark job ends. */
TaskChart.prototype.onSparkJobEnd = function (data) {
    this.addJobData(data.jobId, new Date(data.completionTime), "ended");
}

/** Called when a Spark task is started. */
TaskChart.prototype.onSparkTaskStart = function (data) {
    this.addData(data.launchTime, this.numActiveTasks);
    this.numActiveTasks += 1;
    this.addData(data.launchTime, this.numActiveTasks);
}

/** Called when a Spark task is ended. */
TaskChart.prototype.onSparkTaskEnd = function (data) {
    this.addData(data.finishTime, this.numActiveTasks);
    this.numActiveTasks -= 1;
    this.addData(data.finishTime, this.numActiveTasks);
}
export default TaskChart;