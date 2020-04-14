/**
 * Definitions for the Timeline object.
 * This file and its imports are packaged as a separate AMD module, which is loaded asynchronously.
 * @module Timeline
 */

import { DataSet, Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './timeline.css'; // Custom Styles
import taskUI from './taskdetails'; // Module for displaying popup when clicking on a task
import $ from 'jquery'; // jQuery to manipulate the DOM

export default class JobTimeline {
    /**
     * Adds an event timeline to the monitoring display.
     * @constructor
     * @param {CellMonitor} cellmonitor - The parent CellMonitor to render in.
     */
    constructor(cellmonitor) {
        this.cellmonitor = cellmonitor; // The parent cell monitor object
        this.timelineGroups1 = new DataSet([
            {
                id: 'jobs',
                content: 'Jobs:',
                className: 'visjobgroup',
            },
        ]);
        this.timelineGroups2 = new DataSet([{ id: 'stages', content: 'Stages:' }]);
        this.timelineGroups3 = new DataSet([]);
        this.timelineData1 = new DataSet({ queue: true }); // Jobs timeline
        this.timelineData2 = new DataSet({ queue: true }); // Stages timeline
        this.timelineData3 = new DataSet({ queue: true }); // Tasks timeline
        this.runningItems1 = new DataSet();
        this.runningItems2 = new DataSet();
        this.runningItems3 = new DataSet();
        this.runningItems = {};
        this.userdragged = false;
        this.timelineOptions1 = {
            rollingMode: {
                follow: false,
                offset: 0.75,
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
                offset: 0.75,
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
                offset: 0.75,
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
            align: 'left',
            orientation: 'top',
            verticalScroll: false,
        };
        this.timeline1 = null; // Jobs
        this.timeline2 = null; // Stages
        this.timeline3 = null; // Tasks
        this.firstJobStart = new Date();
        this.firstjobstarted = false;
        this.latestTime = new Date();
    }

    /** Registers a refresher to update the timeline. */
    registerRefresher() {
        this.i = 0;
        this.clearRefresher();
        this.flushInterval = setInterval(() => {
            this.refreshTimeline();
        }, 1000);
    }

    /**
     * Refreshes the timeline.
     * Running items are updated with "end" as the current time once in every three refresh cycles.
     * The queued data updates are flushed in every cycle.
     * @param {boolean} redraw - Force a refresh of running items.
     */
    refreshTimeline(redraw) {
        this.i += 1;
        if (this.i >= 2 || redraw) {
            this.i = 0;
            const date = new Date();
            this.timelineData1.flush();
            this.timelineData2.flush();
            this.timelineData3.flush();
            this.runningItems1.forEach(item => {
                this.timelineData1.update({
                    id: item.id,
                    end: date,
                });
            });
            this.runningItems2.forEach(item => {
                this.timelineData2.update({
                    id: item.id,
                    end: date,
                });
            });
            this.runningItems3.forEach(item => {
                this.timelineData3.update({
                    id: item.id,
                    end: date,
                });
            });
            this.setRanges(this.firstJobStart, this.latestTime, false, true);
        }
        this.timelineData1.flush();
        this.timelineData2.flush();
        this.timelineData3.flush();
    }

    /** Remove the refresher to update the timeline */
    clearRefresher() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Adds a line to the timeline
     * @param {Date} time - The time
     * @param {string} id - A unique string to identify the line. (Duplicates throw errors).
     * @param {string} title - The tooltip for the line.
     * @todo title is not displayed currently. The pointer events for the line are disabled in CSS to prevent dragging, this hides tooltip also.
     */
    addLinetoTimeline(time, id, title) {
        if (this.cellmonitor.view === 'timeline' && this.cellmonitor.displayVisible) {
            this.timeline1.addCustomTime(time, id);
            this.timeline1.setCustomTimeTitle(title, id);
            this.timeline2.addCustomTime(time, id);
            this.timeline2.setCustomTimeTitle(title, id);
            this.timeline3.addCustomTime(time, id);
            this.timeline3.setCustomTimeTitle(title, id);
        }
    }

    /**
     * Sets the timeline range, and visible window range.
     * @param {Date} start - The minimum date.
     * @param {Date} end - The maximum date.
     * @param {boolean} setminmax - Set the maximum/minimum scrollable date also.
     * @param {boolean} moveWindow - Move the current displayed timeline also.
     * @param {boolean} hidecurrenttime - Hide the red line  showing current time.
     */
    setRanges(start, end, setminmax, moveWindow, hidecurrenttime) {
        const b = end.getTime();
        const a = start.getTime();
        const min = new Date(a - (b - a) / 15);
        const max = new Date(b + (b - a) / 15);
        this.timelineOptions1.start = new Date(min);
        this.timelineOptions2.start = new Date(min);
        this.timelineOptions3.start = new Date(min);
        this.timelineOptions1.end = new Date(max);
        this.timelineOptions2.end = new Date(max);
        this.timelineOptions3.end = new Date(max);
        if (hidecurrenttime) {
            this.timelineOptions1.showCurrentTime = false;
            this.timelineOptions2.showCurrentTime = false;
            this.timelineOptions3.showCurrentTime = false;
        }
        if (setminmax) {
            this.timelineOptions1.min = new Date(min);
            this.timelineOptions2.min = new Date(min);
            this.timelineOptions3.min = new Date(min);

            this.timelineOptions1.max = new Date(max);
            this.timelineOptions2.max = new Date(max);
            this.timelineOptions3.max = new Date(max);
        }
        if (
            moveWindow &&
            this.cellmonitor.view === 'timeline' &&
            !this.userdragged &&
            this.cellmonitor.displayVisible
        ) {
            if (this.timeline1) this.timeline1.setWindow(min, max);
            if (this.timeline2) this.timeline2.setWindow(min, max);
            if (this.timeline3) this.timeline3.setWindow(min, max);
        }
    }

    /** Creates and renders the timeline from the stored data. */
    create() {
        if (this.cellmonitor.view === 'timeline') {
            const container1 = this.cellmonitor.displayElement.find('.timelinecontainer1').empty()[0];
            const container2 = this.cellmonitor.displayElement.find('.timelinecontainer2').empty()[0];
            const container3 = this.cellmonitor.displayElement.find('.timelinecontainer3').empty()[0];
            this.userdragged = false;
            this.setRanges(this.firstJobStart, this.latestTime, false, true, false);
            this.timelineData1.flush();
            this.timelineData2.flush();
            this.timelineData3.flush();
            this.timeline1 = new Timeline(container1, this.timelineData1, this.timelineGroups1, this.timelineOptions1);
            this.timeline2 = new Timeline(container2, this.timelineData2, this.timelineGroups2, this.timelineOptions2);
            this.timeline3 = new Timeline(container3, this.timelineData3, this.timelineGroups3, this.timelineOptions3);
            const checkbox = this.cellmonitor.displayElement.find('.timecheckbox');
            checkbox.click(() => {
                if (this.checked) {
                    this.cellmonitor.displayElement
                        .find('.timelinewrapper')
                        .addClass('showphases')
                        .removeClass('hidephases');
                } else {
                    this.cellmonitor.displayElement
                        .find('.timelinewrapper')
                        .addClass('hidephases')
                        .removeClass('showphases');
                }
            });
            // Make dragging one timeline drag all timelines - ie jobs, stages and tasks should move together
            this.timeline1.on('rangechange', (properties) => {
                if (properties.byUser) this.timeline2.setWindow(properties.start, properties.end, { animation: false });
                if (properties.byUser) this.timeline3.setWindow(properties.start, properties.end, { animation: false });
            });
            this.timeline2.on('rangechange', (properties) => {
                if (properties.byUser) this.timeline1.setWindow(properties.start, properties.end, { animation: false });
                if (properties.byUser) this.timeline3.setWindow(properties.start, properties.end, { animation: false });
            });
            this.timeline3.on('rangechange', (properties) => {
                if (properties.byUser) this.timeline1.setWindow(properties.start, properties.end, { animation: false });
                if (properties.byUser) this.timeline2.setWindow(properties.start, properties.end, { animation: false });
            });
            this.timeline1.redraw();
            this.timeline2.redraw();
            this.timeline3.redraw();
            const onuserclick = () => {
                this.userdragged = true;
            };
            const onuserdrag = data => {
                if (data.byUser) this.userdragged = true;
            };
            this.timeline1.on('click', onuserclick);
            this.timeline2.on('click', onuserclick);
            this.timeline3.on('click', onuserclick);
            this.timeline1.on('rangechanged', onuserdrag);
            this.timeline2.on('rangechanged', onuserdrag);
            this.timeline3.on('rangechanged', onuserdrag);
            // Display corresponding popups when clicking on a job/stage/task
            if (!this.cellmonitor.allcompleted) this.registerRefresher();
            this.timeline3.on('select', (properties) => {
                if (properties.items.length) {
                    taskUI.show(this.timelineData3.get(properties.items[0]));
                }
            });
            this.timeline1.on('select', (properties) => {
                if (properties.items.length) {
                    const name = properties.items[0];
                    this.cellmonitor.openSparkUI(`jobs/job/?id=${name}`);
                }
            });
            this.timeline2.on('select', (properties) => {
                if (properties.items.length) {
                    const name = properties.items[0];
                    this.cellmonitor.openSparkUI(`stages/stage/?id=${name}&attempt=0`);
                }
            });
            setTimeout(() => {
                this.timelineData1.forEach(item => {
                    this.addLinetoTimeline(item.start, `${this.cellmonitor.appId}${item.id}start`, 'Job Started');
                    if (this.timelineData1.get(item.id).mode === 'done')
                        this.addLinetoTimeline(item.end, `${this.cellmonitor.appId}${item.id}end`, 'Job Ended');
                });
            }, 0);
        }
    }

    /** Hide the timeline. */
    hide() {
        try {
            if (this.timeline1) this.timeline1.destroy();
            if (this.timeline2) this.timeline2.destroy();
            if (this.timeline3) this.timeline3.destroy();
            this.timeline1 = null;
            this.timeline2 = null;
            this.timeline3 = null;
        } catch (err) {
            this.clearRefresher();
        }
    }

    /** Called when the cell has finished executing as well as all jobs in it have completed. */
    onAllCompleted() {
        this.setRanges(this.firstJobStart, this.latestTime, true, false, true);
        this.clearRefresher();
        if (this.cellmonitor.displayVisible && this.cellmonitor.view === 'timeline') {
            this.refreshTimeline(true);
        }
    }

    /**
     * Creates the HTML element for a task item.
     * The different phases are rendered in svg.
     * When phases are hidden, all phases are made transparent.
     * @param {Object} data - The task data.
     * @return {string} - The HTML string for the element.
     */
    static createTaskBar(data) {
        const html =
            '<svg class="taskbarsvg">' +
            '<rect class="scheduler-delay-proportion" x="0%" y="0px" height="100%" width="10%"></rect>' +
            '<rect class="deserialization-time-proportion" x="10%" y="0px" height="100%" width="10%"></rect>' +
            '<rect class="shuffle-read-time-proportion" x="20%" y="0px" height="100%" width="20%"></rect>' +
            '<rect class="executor-runtime-proportion" x="40%" y="0px" height="100%" width="10%"></rect>' +
            '<rect class="shuffle-write-time-proportion" x="50%" y="0px" height="100%" width="10%"></rect>' +
            '<rect class="serialization-time-proportion" x="60%" y="0px" height="100%" width="20%"></rect>' +
            '<rect class="getting-result-time-proportion" x="80%" y="0px" height="100%" width="20%"></rect>' +
            '</svg>';
        const element = $('<div></div>')
            .html(html)
            .addClass('taskbardiv')
            .attr('data-taskid', data.taskId);
        const metrics = data.metrics;
        const svg = element.find('.taskbarsvg');
        svg.find('.scheduler-delay-proportion')
            .attr('x', `${metrics.schedulerDelayProportionPos}%`)
            .attr('width', `${metrics.schedulerDelayProportion}%`);

        svg.find('.deserialization-time-proportion')
            .attr('x', `${metrics.deserializationTimeProportionPos}%`)
            .attr('width', `${metrics.deserializationTimeProportion}%`);

        svg.find('.shuffle-read-time-proportion')
            .attr('x', `${metrics.shuffleReadTimeProportionPos}%`)
            .attr('width', `${metrics.shuffleReadTimeProportion}%`);

        svg.find('.executor-runtime-proportion')
            .attr('x', `${metrics.executorComputingTimeProportionPos}%`)
            .attr('width', `${metrics.executorComputingTimeProportion}%`);

        svg.find('.shuffle-write-time-proportion')
            .attr('x', `${metrics.shuffleWriteTimeProportionPos}%`)
            .attr('width', `${metrics.shuffleWriteTimeProportion}%`);

        svg.find('.serialization-time-proportion')
            .attr('x', `${metrics.serializationTimeProportionPos}%`)
            .attr('width', `${metrics.serializationTimeProportion}%`);

        svg.find('.getting-result-time-proportion')
            .attr('x', `${metrics.gettingResultTimeProportionPos}%`)
            .attr('width', `${metrics.gettingResultTimeProportion}%`);

        return element.prop('outerHTML');
    }

    // ----------Data Handling Functions----------------

    /** Called when a Spark job starts. */
    onSparkJobStart(data) {
        const name = $('<div>')
            .text(data.name)
            .html()
            .split(' ')[0]; // Escaping HTML <, > from string
        this.timelineData1.update({
            id: data.jobId,
            start: new Date(data.submissionTime),
            end: new Date(),
            content: `${data.jobId}:${name}`,
            group: 'jobs',
            className: 'itemrunning job',
            mode: 'ongoing',
        });
        this.runningItems1.add({ id: data.jobId });
        if (!this.firstjobstarted) {
            this.firstJobStart = new Date(data.submissionTime);
            this.firstjobstarted = true;
        }
        this.latestTime = new Date(data.submissionTime);
    }

    /** Called when a Spark job ends. */
    onSparkJobEnd(data) {
        this.timelineData1.update({
            id: data.jobId,
            end: new Date(data.completionTime),
            className: data.status === 'SUCCEEDED' ? 'itemfinished job' : 'itemfailed job',
            mode: 'done',
        });
        this.runningItems1.remove({ id: data.jobId });
        this.addLinetoTimeline(new Date(data.completionTime), `job${data.jobId}end`, `Job ${data.jobId}Ended`);
        this.latestTime = new Date(data.completionTime);
    }

    /** Called when a Spark stage is submitted. */
    onSparkStageSubmitted(data) {
        const name = $('<div>')
            .text(data.name)
            .html()
            .split(' ')[0]; // Hack for escaping HTML <, > from string.
        let submissionDate;
        if (data.submissionTime === -1) submissionDate = new Date();
        else submissionDate = new Date(data.submissionTime);

        this.timelineData2.update({
            id: data.stageId,
            start: submissionDate,
            content: `${data.stageId}:${name}`,
            group: 'stages',
            end: new Date(),
            className: 'itemrunning stage',
            mode: 'ongoing',
        });
        this.runningItems2.add({ id: data.stageId });
    }

    /** Called when a Spark stage is completed. */
    onSparkStageCompleted(data) {
        this.timelineData2.update({
            id: data.stageId,
            start: new Date(data.submissionTime),
            group: 'stages',
            end: new Date(data.completionTime),
            className: data.status === 'COMPLETED' ? 'itemfinished stage' : 'itemfailed stage',
            mode: 'done',
        });
        this.runningItems2.remove({ id: data.stageId });
    }

    /** Called when a Spark task is started. */
    onSparkTaskStart(data) {
        if (!this.timelineGroups3.get(`${data.executorId}-${data.host}`)) {
            this.timelineGroups3.update({
                id: `${data.executorId}-${data.host}`,
                content: `Tasks:<br>${data.executorId}<br>${data.host}`,
            });
        }
        this.timelineData3.update({
            id: data.taskId,
            stage: data.stageId,
            start: new Date(data.launchTime),
            end: new Date(),
            content: `${data.taskId}`,
            group: `${data.executorId}-${data.host}`,
            className: 'itemrunning task',
            mode: 'ongoing',
            align: 'center',
            data,
        });
        this.runningItems3.add({ id: data.taskId });
        this.latestTime = new Date(data.launchTime);
    }

    /** Called when a Spark task is ended. */
    onSparkTaskEnd(data) {
        let content;
        if (data.status === 'SUCCESS') {
            content = JobTimeline.createTaskBar(data);
        } else content = `${data.taskId}`;
        this.timelineData3.update({
            id: data.taskId,
            end: new Date(data.finishTime),
            className: data.status === 'SUCCESS' ? 'itemfinished task' : 'itemfailed task',
            mode: 'done',
            content,
            align: data.status === 'SUCCESS' ? 'left' : 'center',
            data,
        });
        this.runningItems3.remove({ id: data.taskId });
        this.latestTime = new Date(data.finishTime);
    }
}
