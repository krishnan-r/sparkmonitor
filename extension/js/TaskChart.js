/**
 * Definitions for the TaskChart object.
 * This file and its imports are packaged as a separate AMD module, which is loaded asynchronously.
 * @module TaskChart
 */

import Plotly from 'plotly.js/lib/core'; // The plotting library

export default class TaskChart {
    /**
     * Adds a chart with number of active tasks and executor cores to the monitoring display
     * @constructor
     * @param {CellMonitor} cellmonitor - The parent CellMonitor to render in.
     */
    constructor(cellmonitor) {
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
    create() {
        if (this.cellmonitor.view !== 'tasks') {
            throw new Error('SparkMonitor: Drawing tasks graph when view is not tasks');
        }
        this.clearRefresher();
        const container = this.cellmonitor.displayElement.find('.taskcontainer').empty()[0];
        const tasktrace = {
            x: this.taskChartDataX,
            y: this.taskChartDataY,
            fill: 'tozeroy',
            type: 'scatter',
            mode: 'none',
            fillcolor: '#00aedb',
            name: 'Active Tasks',
        };
        const executortrace = {
            x: this.executorDataX,
            y: this.executorDataY,
            fill: 'tozeroy',
            type: 'scatter',
            mode: 'none',
            fillcolor: '#F5C936',
            name: 'Executor Cores',
        };
        const jobtrace = {
            x: this.jobDataX,
            y: this.jobDataY,
            text: this.jobDataText,
            type: 'scatter',
            mode: 'markers',
            fillcolor: '#F5C936',
            // name: 'Jobs',
            showlegend: false,
            marker: {
                symbol: 23,
                color: '#4CB5AE',
                size: 1,
            },
        };
        const data = [executortrace, tasktrace, jobtrace];
        const layout = {
            // title: 'Active Tasks and Executors Cores',
            // showlegend: false,
            margin: {
                t: 30, // top margin
                l: 30, // left margin
                r: 30, // right margin
                b: 60, // bottom margin
            },
            xaxis: {
                type: 'date',
                // title: 'Time',
            },
            yaxis: {
                fixedrange: true,
            },
            dragmode: 'pan',
            shapes: this.shapes,
            legend: {
                orientation: 'h',
                x: 0,
                y: 5,
                // traceorder: 'normal',
                font: {
                    family: 'sans-serif',
                    size: 12,
                    color: '#000',
                },
                // bgcolor: '#E2E2E2',
                // bordercolor: '#FFFFFF',
                // borderwidth: 2
            },
        };
        this.taskChartDataBufferX = [];
        this.taskChartDataBufferY = [];
        this.executorDataBufferX = [];
        this.executorDataBufferY = [];
        this.jobDataBufferX = [];
        this.jobDataBufferY = [];
        this.jobDataBufferText = [];
        const options = { displaylogo: false, scrollZoom: true };
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
    addData(time, numTasks) {
        this.taskChartDataX.push(new Date(time).getTime());
        this.taskChartDataY.push(numTasks);
        // this.taskcountchanged = true;
        if (this.cellmonitor.view === 'tasks') {
            this.taskChartDataBufferX.push(new Date(time).getTime());
            this.taskChartDataBufferY.push(numTasks);
        }
        this.addExecutorData(time, this.cellmonitor.monitor.totalCores);
    }

    /**
     * Add a data point to the executors trace.
     * @param {Date} time - The x axis value of time
     * @param {number} numCores - Number of executor cores
     */
    addExecutorData(time, numCores) {
        this.executorDataX.push(new Date(time).getTime());
        this.executorDataY.push(numCores);
        this.taskcountchanged = true;
        if (this.cellmonitor.view === 'tasks') {
            this.executorDataBufferX.push(new Date(time).getTime());
            this.executorDataBufferY.push(numCores);
        }
    }

    /** Hides the TaskChart. */
    hide() {
        this.clearRefresher();
        try {
            Plotly.purge(this.taskChart);
        } catch (err) {
            console.log(err);
        }
        this.taskChart = null;
    }

    /** Registers a refresher to update the TaskChart. */
    registerRefresher() {
        this.clearRefresher();
        this.taskinterval = setInterval(() => {
            this.refreshTaskChart();
        }, 800);
    }

    /** Refreshed the TaskChart. */
    refreshTaskChart() {
        if (this.taskcountchanged && this.cellmonitor.view === 'tasks') {
            try {
                Plotly.extendTraces(
                    this.taskChart,
                    {
                        x: [this.executorDataBufferX.slice(), this.taskChartDataBufferX.slice()],
                        y: [this.executorDataBufferY.slice(), this.taskChartDataBufferY.slice()],
                    },
                    [0, 1],
                );
                Plotly.extendTraces(
                    this.taskChart,
                    {
                        x: [this.jobDataBufferX.slice()],
                        //  y: [this.jobDataBufferY.slice()],
                        text: [this.jobDataBufferText],
                    },
                    [2],
                );

                const update = {
                    shapes: this.shapes,
                };
                Plotly.relayout(this.taskChart, update);
            } catch (err) {
                console.log(err);
            }
            this.taskChartDataBufferX = [];
            this.taskChartDataBufferY = [];
            this.executorDataBufferX = [];
            this.executorDataBufferY = [];
            this.jobDataBufferX = [];
            this.jobDataBufferY = [];
            this.jobDataBufferText = [];
            this.taskcountchanged = false;
        }
    }

    /** Removes the TaskChart Refresher. */
    clearRefresher() {
        if (this.taskinterval) {
            clearInterval(this.taskinterval);
            this.taskinterval = null;
        }
    }

    /** Called when all cell execution is completed and all jobs have completed. */
    onAllCompleted() {
        this.clearRefresher();
    }

    /**
     * Add a data point to the job trace.
     * @param {string} jobId - The JobId
     * @param {Data} time - The time of event
     * @param {string} event - "started" or "ended"
     */
    addJobData(jobId, time, event) {
        this.jobDataX.push(new Date(time).getTime());
        this.jobDataY.push(0);
        this.jobDataText.push(`Job ${jobId} ${event}`);
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
            },
        });
        if (this.cellmonitor.view === 'tasks') {
            this.jobDataBufferX.push(new Date(time).getTime());
            this.jobDataBufferY.push(0);
            this.jobDataBufferText.push(`Job ${jobId} ${event}`);
        }
    }

    // ----------Data Handling Functions----------------

    /** Called when a Spark job starts. */
    onSparkJobStart(data) {
        this.addJobData(data.jobId, new Date(data.submissionTime), 'started');
        this.addExecutorData(data.submissionTime, data.totalCores);
    }

    /** Called when a Spark job ends. */
    onSparkJobEnd(data) {
        this.addJobData(data.jobId, new Date(data.completionTime), 'ended');
    }

    /** Called when a Spark task is started. */
    onSparkTaskStart(data) {
        this.addData(data.launchTime, this.numActiveTasks);
        this.numActiveTasks += 1;
        this.addData(data.launchTime, this.numActiveTasks);
    }

    /** Called when a Spark task is ended. */
    onSparkTaskEnd(data) {
        this.addData(data.finishTime, this.numActiveTasks);
        this.numActiveTasks -= 1;
        this.addData(data.finishTime, this.numActiveTasks);
    }
}
