/**
 * Module to display a popup with details of a task.
 * @module taskdetails
 */

import './taskdetails.css'; // CSS styles
import $ from 'jquery'; // jQuery to manipulate the DOM
import moment from 'moment'; // moment to format date objects

/**
 * Fills data in the template HTML element.
 * @param {Object} element - the HTML element
 * @param {Object} item - data about the task.
 */
function fillData(element, item) {
    const data = item.data;
    element.find('.data-taskid').text(data.taskId);
    element.find('.data-stageid').text(data.stageId);
    element.find('.data-host').text(data.host);
    element.find('.data-executorid').text(data.executorId);
    const status = $('<span></span>')
        .addClass(data.status)
        .text(data.status);
    element.find('.data-status').html(status);
    const start = $('<time></time>')
        .addClass('timeago')
        .attr('data-livestamp', new Date(data.launchTime))
        .attr('title', new Date(data.launchTime).toString())
        .livestamp(new Date(data.launchTime));
    element.find('.data-launchtime').html(start);
    if (data.finishTime) {
        const end = $('<time></time>')
            .addClass('timeago')
            .attr('data-livestamp', new Date(data.finishTime))
            .attr('title', new Date(data.finishTime).toString())
            .livestamp(new Date(data.finishTime));
        element.find('.finish').show();
        element.find('.data-finishtime').html(end);
        const duration = moment.duration(new Date(data.finishTime).getTime() - new Date(data.launchTime).getTime());
        element.find('.data-duration').text(duration.format('d[d] h[h]:mm[m]:ss[s]:SS[ms]'));
    }
    if (data.status === 'FAILED' || data.status === 'KILLED') {
        element.find('.error').show();
        element.find('.data-error').text(data.errorMessage);
    }
    if (data.status === 'SUCCESS' || data.status === 'FAILED' || data.status === 'KILLED') {
        const metrics = data.metrics;
        element.find('.metricdata').show();
        const e = element.find('.legend-area');
        const svg = element.find('.taskbarsvg');
        const format = 'd[d] h[h]:mm[m]:ss[s]:SS[ms]';
        svg.find('.scheduler-delay-proportion')
            .attr('x', `${metrics.schedulerDelayProportionPos}%`)
            .attr('width', `${metrics.schedulerDelayProportion}%`);
        e.find('.scheduler-delay').text(moment.duration(metrics.schedulerDelay).format(format));

        svg.find('.deserialization-time-proportion')
            .attr('x', `${metrics.deserializationTimeProportionPos}%`)
            .attr('width', `${metrics.deserializationTimeProportion}%`);
        e.find('.deserialization-time').text(moment.duration(metrics.deserializationTime).format(format));

        svg.find('.shuffle-read-time-proportion')
            .attr('x', `${metrics.shuffleReadTimeProportionPos}%`)
            .attr('width', `${metrics.shuffleReadTimeProportion}%`);
        e.find('.shuffle-read-time').text(moment.duration(metrics.shuffleReadTime).format(format));

        svg.find('.executor-runtime-proportion')
            .attr('x', `${metrics.executorComputingTimeProportionPos}%`)
            .attr('width', `${metrics.executorComputingTimeProportion}%`);
        e.find('.executor-runtime').text(moment.duration(metrics.executorComputingTime).format(format));

        svg.find('.shuffle-write-time-proportion')
            .attr('x', `${metrics.shuffleWriteTimeProportionPos}%`)
            .attr('width', `${metrics.shuffleWriteTimeProportion}%`);
        e.find('.shuffle-write-time').text(moment.duration(metrics.shuffleWriteTime).format(format));

        svg.find('.serialization-time-proportion')
            .attr('x', `${metrics.serializationTimeProportionPos}%`)
            .attr('width', `${metrics.serializationTimeProportion}%`);
        e.find('.serialization-time').text(moment.duration(metrics.serializationTime).format(format));

        svg.find('.getting-result-time-proportion')
            .attr('x', `${metrics.gettingResultTimeProportionPos}%`)
            .attr('width', `${metrics.gettingResultTimeProportion}%`);
        e.find('.getting-result-time').text(moment.duration(metrics.gettingResultTime).format(format));
    }
}

/**
 * Shows a popup dialog with details of a task.
 * @param {Object} item - data about the task.
 */
function showTaskDetails(item) {
    const taskHTML = `
    <div class="taskdetails">
        <div class="tasktitle">Task <span class="data-taskid">5</span><span class="tasktitlestage">from Stage  <span class="data-stageid">6</span></span>
        </div>
        <div class="metricdata">
        <svg class="taskbarsvg">
            <rect class="scheduler-delay-proportion" x="0%" y="0px" height="100%" width="10%"></rect>
            <rect class="deserialization-time-proportion" x="10%" y="0px" height="100%" width="10%"></rect>
            <rect class="shuffle-read-time-proportion" x="20%" y="0px" height="100%" width="20%"></rect>
            <rect class="executor-runtime-proportion" x="40%" y="0px" height="100%" width="10%"></rect>
            <rect class="shuffle-write-time-proportion" x="50%" y="0px" height="100%" width="10%"></rect>
            <rect class="serialization-time-proportion" x="60%" y="0px" height="100%" width="20%"></rect>
            <rect class="getting-result-time-proportion" x="80%" y="0px" height="100%" width="20%"></rect>
        </svg>
        </div>
        <div class="legend-area metricdata">
        Metrics:
        <table>
            <thead>
            <tr>
                <th></th>
                <th>Phase</th>
                <th>Time Taken</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="scheduler-delay-proportion"></rect>
                </svg>
                </td>
                <td>Scheduler Delay</td>
                <td class="scheduler-delay">0</td>
            </tr>
            <tr class="finish">
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="deserialization-time-proportion"></rect>
                </svg>
                </td>
                <td>Task Deserialization Time</td>
                <td class="deserialization-time">0</td>
            </tr>
            <tr class="finish">
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="shuffle-read-time-proportion"></rect>
                </svg>
                </td>
                <td>Shuffle Read Time</td>
                <td class="shuffle-read-time">0</td>
            </tr>
            <tr>
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="executor-runtime-proportion"></rect>
                </svg>
                </td>
                <td>Executor Computing Time</td>
                <td class="executor-runtime">0</td>
            </tr>
            <tr>
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="shuffle-write-time-proportion"></rect>
                </svg>
                </td>
                <td>Shuffle Write Time</td>
                <td class="shuffle-write-time">0</td>
            </tr>
            <tr>
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="serialization-time-proportion"></rect>
                </svg>
                </td>
                <td>Result Serialization Time</td>
                <td class="serialization-time">0</td>
            </tr>
            <tr>
                <td>
                <svg>
                    <rect x="0px" y="0px" width="10px" height="10px" class="getting-result-time-proportion"></rect>
                </svg>
                </td>
                <td>Getting Result Time</td>
                <td class="getting-result-time">0</td>
            </tr>
            </tbody>
        </table>
        </div>
        Other Details:
        <table>
        <thead>
            <tr>
            <th>Parameter</th>
            <th>Value</th>
            </tr>
        </thead>
        <tbody>
            <tr>
            <td>Launch Time</td>
            <td class="data-launchtime">0</td>
            </tr>
            <tr class="finish">
            <td>Finish Time</td>
            <td class="data-finishtime">0</td>
            </tr>
            <tr class="finish">
            <td>Duration</td>
            <td class="data-duration">0</td>
            </tr>
            <tr>
            <td>Executor Id</td>
            <td class="data-executorid">0</td>
            </tr>
            <tr>
            <td>Host</td>
            <td class="data-host">0</td>
            </tr>
            <tr>
            <td>Status</td>
            <td class="data-status">nil</td>
            </tr>
            <tr class="error">
            <td>Error Message</td>
            <td>
                <pre class="data-error"></pre>
            </td>
            </tr>
        </tbody>
        </table>
    </div>
    `;

    const div = $('<div></div>').html(taskHTML);
    fillData(div, item);
    const options = {
        title: 'Task Details',
        width: 800,
        height: 500,
        autoResize: false,
        dialogClass: 'task-dialog',
        position: { my: 'right', at: 'right', of: window }, // noqa
    };
    div.dialog(options);
}

export default {
    show: showTaskDetails,
};
