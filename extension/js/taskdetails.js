/**
 * Module to display a popup with details of a task.
 * @module taskdetails
 */

import './taskdetails.css'                      // CSS styles
import taskHTML from './taskdetails.html'       // Template HTML
import $ from 'jquery';                         // jQuery to manipulate the DOM
import moment from 'moment'                     // moment to format date objects

/**
 * Shows a popup dialog with details of a task.
 * @param {Object} item - data about the task.
 */
function showTaskDetails(item) {
    var div = $('<div></div>').html(taskHTML);
    fillData(div, item);
    var options = {
        dialogClass: 'noTitleStuff',
        title: "Task Details",
        width: 800,
        height: 500,
        autoResize: false,
        dialogClass: "task-dialog",
        position: { my: "right", at: "right", of: window },
    }
    div.dialog(options);
}

/**
 * Fills data in the template HTML element.
 * @param {Object} element - the HTML element
 * @param {Object} item - data about the task.
 */
function fillData(element, item) {
    var data = item.data;
    element.find('.data-taskid').text(data.taskId);
    element.find('.data-stageid').text(data.stageId);
    element.find('.data-host').text(data.host);
    element.find('.data-executorid').text(data.executorId);
    var status = $('<span></span>').addClass(data.status).text(data.status)
    element.find('.data-status').html(status);
    var start = $('<time></time>').addClass('timeago').attr('data-livestamp', new Date(data.launchTime)).attr('title', new Date(data.launchTime).toString()).livestamp(new Date(data.launchTime));
    element.find('.data-launchtime').html(start);
    if (data.finishTime) {
        var end = $('<time></time>').addClass('timeago').attr('data-livestamp', new Date(data.finishTime)).attr('title', new Date(data.finishTime).toString()).livestamp(new Date(data.finishTime));
        element.find('.finish').show();
        element.find('.data-finishtime').html(end);
        var duration = moment.duration(new Date(data.finishTime).getTime() - new Date(data.launchTime).getTime());
        element.find('.data-duration').text(duration.format("d[d] h[h]:mm[m]:ss[s]:SS[ms]"));
    }
    if (data.status == "FAILED" || data.status == "KILLED") {
        element.find('.error').show();
        element.find('.data-error').text(data.errorMessage);
    }
    if (data.status == "SUCCESS" || data.status == "FAILED" || data.status == "KILLED") {
        var metrics = data.metrics;
        element.find('.metricdata').show();
        var e = element.find('.legend-area');
        var svg = element.find('.taskbarsvg');
        var format = "d[d] h[h]:mm[m]:ss[s]:SS[ms]";
        svg.find('.scheduler-delay-proportion')
            .attr('x', '' + metrics.schedulerDelayProportionPos + '%')
            .attr('width', '' + metrics.schedulerDelayProportion + '%');
        e.find('.scheduler-delay').text(moment.duration(metrics.schedulerDelay).format(format));

        svg.find('.deserialization-time-proportion')
            .attr('x', '' + metrics.deserializationTimeProportionPos + '%')
            .attr('width', '' + metrics.deserializationTimeProportion + '%');
        e.find('.deserialization-time').text(moment.duration(metrics.deserializationTime).format(format));

        svg.find('.shuffle-read-time-proportion')
            .attr('x', '' + metrics.shuffleReadTimeProportionPos + '%')
            .attr('width', '' + metrics.shuffleReadTimeProportion + '%');
        e.find('.shuffle-read-time').text(moment.duration(metrics.shuffleReadTime).format(format));

        svg.find('.executor-runtime-proportion')
            .attr('x', '' + metrics.executorComputingTimeProportionPos + '%')
            .attr('width', '' + metrics.executorComputingTimeProportion + '%');
        e.find('.executor-runtime').text(moment.duration(metrics.executorComputingTime).format(format));

        svg.find('.shuffle-write-time-proportion')
            .attr('x', '' + metrics.shuffleWriteTimeProportionPos + '%')
            .attr('width', '' + metrics.shuffleWriteTimeProportion + '%');
        e.find('.shuffle-write-time').text(moment.duration(metrics.shuffleWriteTime).format(format));

        svg.find('.serialization-time-proportion')
            .attr('x', '' + metrics.serializationTimeProportionPos + '%')
            .attr('width', '' + metrics.serializationTimeProportion + '%');
        e.find('.serialization-time').text(moment.duration(metrics.serializationTime).format(format));

        svg.find('.getting-result-time-proportion')
            .attr('x', '' + metrics.gettingResultTimeProportionPos + '%')
            .attr('width', '' + metrics.gettingResultTimeProportion + '%');
        e.find('.getting-result-time').text(moment.duration(metrics.gettingResultTime).format(format));
    }
}

export default {
    'show': showTaskDetails,
} 