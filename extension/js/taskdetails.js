import './taskdetails.css'
import taskHTML from './taskdetails.html'

import $ from 'jquery';
import moment from 'moment'



function showTaskDetails(item) {
    //console.log("Popup data: ", item);

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
        var svg = element.find('.taskbarsvg');

        svg.find('.scheduler-delay-proportion')
            .attr('x', '' + metrics.schedulerDelayProportionPos + '%')
            .attr('width', '' + metrics.schedulerDelayProportion + '%');

        svg.find('.deserialization-time-proportion')
            .attr('x', '' + metrics.deserializationTimeProportionPos + '%')
            .attr('width', '' + metrics.deserializationTimeProportion + '%');

        svg.find('.shuffle-read-time-proportion')
            .attr('x', '' + metrics.shuffleReadTimeProportionPos + '%')
            .attr('width', '' + metrics.shuffleReadTimeProportion + '%');

        svg.find('.executor-runtime-proportion')
            .attr('x', '' + metrics.executorComputingTimeProportionPos + '%')
            .attr('width', '' + metrics.executorComputingTimeProportion + '%');

        svg.find('.shuffle-write-time-proportion')
            .attr('x', '' + metrics.shuffleWriteTimeProportionPos + '%')
            .attr('width', '' + metrics.shuffleWriteTimeProportion + '%');

        svg.find('.serialization-time-proportion')
            .attr('x', '' + metrics.serializationTimeProportionPos + '%')
            .attr('width', '' + metrics.serializationTimeProportion + '%');

        svg.find('.getting-result-time-proportion')
            .attr('x', '' + metrics.gettingResultTimeProportionPos + '%')
            .attr('width', '' + metrics.gettingResultTimeProportion + '%');
    }

}




export default {
    'show': showTaskDetails,

} 