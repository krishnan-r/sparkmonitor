import Plotly from 'plotly.js/lib/core'

function TaskChart(cellmonitor) {

    this.cellmonitor = cellmonitor;

    this.taskChart = null;
    this.taskChartDataX = [];
    this.taskChartDataY = [];
    this.executorDataX = [new Date()];
    this.executorDataY = [0];

    this.taskChartDataBufferX = [];
    this.taskChartDataBufferY = [];
    this.executorDataBufferX = [];
    this.executorDataBufferY = [];

    this.numActiveTasks = 0;
    this.maxNumActiveTasks = 0;
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

    var data = [executortrace, tasktrace];
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
        },
        dragmode: 'pan',
        // shapes: [
        //     {
        //         type: 'line',
        //         x0: new Date(),
        //         y0: 0,
        //         x1: new Date(),
        //         y1: 1,
        //         yref: "paper",
        //         line: {
        //             color: 'rgb(55, 128, 191)',
        //             width: 5
        //         }
        //     },
        // ]

    };
    that.taskChartDataBufferX = [];
    that.taskChartDataBufferY = [];
    that.executorDataBufferX = [];
    that.executorDataBufferY = [];

    var options = { displaylogo: false }

    Plotly.newPlot(container, data, layout, options);
    this.taskChart = container;
    this.registerRefresher();
}

TaskChart.prototype.addData = function (time, numTasks) {
    this.taskChartDataX.push(new Date(time));
    this.taskChartDataY.push(numTasks);
    this.taskcountchanged = true;
    if (this.view == "tasks") {
        this.taskChartDataBufferX.push(new Date(time));
        this.taskChartDataBufferY.push(numTasks);
    }
    this.addExecutorData(time, this.cellmonitor.monitor.totalCores);
}

TaskChart.prototype.addExecutorData = function (time, numCores) {
    this.executorDataX.push(new Date(time));
    this.executorDataY.push(numCores);
    this.taskcountchanged = true;
    if (this.view == "tasks") {
        this.executorDataBufferX.push(new Date(time));
        this.executorDataBufferY.push(numCores);
    }
}

TaskChart.prototype.addLinetoTasks = function (time, id, title) {
    // if (this.view == "tasks") {
    //     // this.taskGraph.addCustomTime(time, id);
    //     // this.taskGraph.setCustomTimeTitle(title, id);
    // }
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
            console.log('Updating Chart2');
            Plotly.extendTraces(
                that.taskChart,
                {
                    x: [that.executorDataBufferX.slice(),that.taskChartDataBufferX.slice()],
                    y: [that.executorDataBufferY.slice(), that.taskChartDataBufferY.slice()]
                },
                [0, 1]);
            that.taskChartDataBufferX = [];
            that.taskChartDataBufferY = [];
            that.executorDataBufferX = [];
            that.executorDataBufferY = [];
            that.taskcountchanged = false;
        }
    }, 1000);
}

TaskChart.prototype.clearRefresher = function () {
    if (this.taskinterval) {
        clearInterval(this.taskinterval);
        this.taskinterval = null;
    }
}

TaskChart.prototype.cellCompleted = function () {
}


//----------Data Handling Functions----------------

TaskChart.prototype.sparkJobStart = function (data) {

}

TaskChart.prototype.sparkJobEnd = function (data) {
}

TaskChart.prototype.sparkStageSubmitted = function (data) {
    ;
}

TaskChart.prototype.sparkStageCompleted = function (data) {

}

TaskChart.prototype.sparkTaskStart = function (data) {
    this.addData(data.launchTime, this.numActiveTasks);
    this.numActiveTasks += 1;
    if (this.maxNumActiveTasks < this.numActiveTasks) this.maxNumActiveTasks = this.numActiveTasks;
    this.addData(data.launchTime, this.numActiveTasks);
}

TaskChart.prototype.sparkTaskEnd = function (data) {
    this.addData(data.finishTime, this.numActiveTasks);
    this.numActiveTasks -= 1;
    this.addData(data.finishTime, this.numActiveTasks);
}

export default TaskChart;