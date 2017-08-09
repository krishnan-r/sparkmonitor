import './taskdetails.css'
import taskHTML from './taskdetails.html'

import $ from 'jquery';



function showTaskDetails(item) {
    console.log("Popoup data: ", item);

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
    element.find('.data-status').text(data.status);
    element.find('.data-launchtime').text(data.launchTime);

    if (data.finishTime) {
        element.find('.finish').show();
        element.find('.data-finishtime').text(data.finishTime);
        element.find('.data-duration').text(data.finishTime - data.launchTime);
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