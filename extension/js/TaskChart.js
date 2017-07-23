import Plotly from 'plotly.js/lib/core'

function TaskChart(cellmonitor) {

    this.cellmonitor = cellmonitor;

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
    this.taskChartDataBuffer = [];
    this.executorDataBuffer = [];

    this.numActiveTasks = 0;
    this.maxNumActiveTasks = 0;
}

TaskChart.prototype.create = function () {
    if (this.cellmonitor.view != 'tasks') {
        throw "SparkMonitor: Drawing tasks graph when view is not tasks";
    }
    var that = this;

    var container = this.cellmonitor.displayElement.find('.taskcontainer').empty()[0];
    var trace1 = {
        x: [new Date(1000), new Date(4000), new Date(11000), new Date(41000)],
        y: [10, 15, 13, 17],
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#00aedb',
        name: 'Active Tasks'
    };

    var trace2 = {
        x: [new Date(7000), new Date(19000), new Date(3000), new Date(21000)],
        y: [16, 5, 11, 9],
        fill: 'tozeroy',
        type: 'scatter',
        mode: 'none',
        fillcolor: '#F5C936',
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
        },
        dragmode: 'pan',
        shapes: [

            //line vertical

            {
                type: 'line',
                x0: Date(1000),
                y0: 10,
                x1: Date(1000),
                y1: 0,
                line: {
                    color: 'rgb(55, 128, 191)',
                    width: 3
                }
            },

            //Line Horizontal

            {
                type: 'line',
                x0: Date(2000),
                y0: 2,
                x1: Date(5000),
                y1: 2,
                line: {
                    color: 'rgb(50, 171, 96)',
                    width: 4,
                    dash: 'dashdot'
                }
            },

            //Line Diagonal

            {
                type: 'line',
                x0: Date(5000),
                y0: 0,
                x1: Date(22000),
                y1: 22,
                line: {
                    color: 'rgb(128, 0, 128)',
                    width: 4,
                    dash: 'dot'
                }
            }
        ]

    };
    var options = { displaylogo: false }

    Plotly.newPlot(container, data, layout, options);
    this.taskChart = container;
}

TaskChart.prototype.addData = function (time, numTasks) {
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
    this.addExecutorData(time, this.cellmonitor.monitor.totalCores);

}

TaskChart.prototype.addExecutorData = function (time, numCores) {
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

TaskChart.prototype.addLinetoTasks = function (time, id, title) {
    // if (this.view == "tasks") {
    //     // this.taskGraph.addCustomTime(time, id);
    //     // this.taskGraph.setCustomTimeTitle(title, id);
    // }
}

TaskChart.prototype.hide = function () {
    Plotly.purge(this.taskChart);
    this.taskChart = null;
}

TaskChart.prototype.registerRefresher = function () {
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