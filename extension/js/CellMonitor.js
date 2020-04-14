/**
 * Definitions for the CellMonitor object.
 * @module CellMonitor
 */
import $ from 'jquery'; // For manipulating the DOM
import './styles.css'; // CSS styles
import './jobtable.css'; // CSS specific to job table
import moment from 'moment'; // For handling durations
import 'moment-duration-format'; // Plugin for moment to format durations to strings
import JobTimeline from './Timeline';
import TaskChart from './TaskChart';
import 'kuende-livestamp';   // Used for displaying auto-updating timestamps like '5 mins ago'
// import { ServerConnection } from '@jupyterlab/services';

export default class CellMonitor {
    /**
     * Class this implements a monitoring display for a single cell.
     * @constructor
     * @param {SparkMonitor} monitor - The parent singleton SparkMonitor instance.
     * @param {CodeCell} cell - The Jupyter CodeCell instance of the cell.
     */
    constructor(monitor, cell) {
        this.monitor = monitor; // Parent SparkMonitor instance
        this.cell = cell; // Jupyter Cell instance
        this.view = 'jobs'; // The current display tab -- "jobs" || "timeline" || "tasks"
        this.lastview = 'jobs'; // The previous display tab, used for restoring hidden display

        this.initialDisplayCreated = false; // Used by jobstart event to show display first time
        this.displayVisible = false; // Used to toggle display

        this.cellcompleted = false; // Cell has finished executing
        this.allcompleted = false; // All job end messages have arrived for cell.

        this.displayElement = null; // HTML DOM element of the monitor

        this.cellStartTime = new Date(); // This is only from the frontend
        this.cellEndTime = -1;

        this.badgesmodified = false; // Used to refresh counts only if changed.
        this.badgeInterval = null; // The return value of setInterval
        // Values for badge counters in the title of display
        this.numActiveJobs = 0;
        this.numCompletedJobs = 0;
        this.numFailedJobs = 0;

        // Listen to event for cell finished executing
        this.monitor.nbPanel.session.kernel.statusChanged.connect((sender, status) => {
            console.log(status);
            if (status === 'idle') {
                this.onCellExecutionCompleted();
            }
        });

        // Job Table Data----------------------------------
        this.jobData = {};
        this.stageData = {};
        this.stageIdtoJobId = {};

        // Only if the load successfully create these views.
        this.timeline = new JobTimeline(this);
        this.taskchart = new TaskChart(this);

        // Our template HTML
        this.template = document.createElement('div');
        this.template.innerHTML = `
            <div class="CellMonitor pm">
                <div class="title"><span class="titleleft">
                        <span class="tbitem titlecollapse "><span class="headericon"></span></span>
                    <span class="tbitem badgecontainer">
                        <b>Apache Spark: </b>
                        <span class="badgeexecutor"><span class="badgeexecutorcount">0</span> EXECUTORS</span>
                    <span class="badgeexecutorcores"><span class="badgeexecutorcorescount">0</span> CORES</span>
                    <b>Jobs:</b>
                    <span class="badges"><span class=badgerunning><span class="badgerunningcount">0</span> RUNNING</span>
                    <span class=badgecompleted><span class="badgecompletedcount">0</span> COMPLETED</span><span class=badgefailed><span class="badgefailedcount">0</span>    FAILED</span>
                    </span>
                    </span>
                    </span>
                    <span class="titleright">
                        <span class="tabbuttons">
                        <span class=" jobtabletabbutton tabbutton" dt="tooltiptop" title="Jobs"><span class="jobtabbuttonicon tabbuttonicon"></span></span>
                    <span class=" taskviewtabbutton tabbutton" dt="tooltiptop" title="Tasks"><span class="taskviewtabbuttonicon tabbuttonicon"></span></span>
                    <span class=" timelinetabbutton tabbutton" dt="tooltiptop" title="Event Timeline"><span class="timelinetabbuttonicon tabbuttonicon"></span></span>
                    </span>
                    </span>
                </div>

                <div class="content">
                    <div class="jobtablecontent tabcontent ">
                    </div>
                    <div class="taskviewcontent tabcontent">
                    <div class="taskcontainer"></div>
                    </div>
                    <div class="timelinecontent tabcontent">
                    <div class="timelinetoolbar">
                        Event Timeline <span class="timecheckboxspan"><input type="checkbox" name="showtimes" class="timecheckbox" value="Bike">Show task phases</span>
                    </div>
                    <div class="timelinewrapper hidephases">
                        <div class="timelinecontainer1">
                        </div>
                        <div class="timelinecontainer2">
                        </div>
                        <div class="timelinecontainer3">
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            `;
    }

    /** Creates and renders the display below the cell. */
    createDisplay() {
        if (!$(this.cell.node).find('.CellMonitor').length) {
            const element = $(this.template).hide();
            this.displayElement = element;
            this.cell.node.appendChild(this.template);

            element.slideToggle();
            this.displayVisible = true;
            if (!this.allcompleted) this.badgeInterval = setInterval($.proxy(this.setBadges, this), 1000);
            this.setBadges(true);

            if (this.cellcompleted) element.find('.stopbutton').hide();
            element.find('.closebutton').click(() => {
                this.removeDisplay();
            });

            element.find('.titlecollapse').click(() => {
                if (this.view !== 'hidden') {
                    this.lastview = this.view;
                    this.hideView(this.view);
                    this.view = 'hidden';
                    $(this.cell.node)
                        .find('.content')
                        .slideUp({
                            queue: false,
                            duration: 400,
                            complete: () => {
                                $(this.cell.node)
                                    .find('.headericon')
                                    .addClass('headericoncollapsed');
                                element.find('.tabcontent').removeClass('tabcontentactive');
                                element.find('.tabbutton').removeClass('tabbuttonactive');
                            },
                        });
                } else {
                    this.showView(this.lastview);
                }
            });
            if (!this.timeline) element.find('.timelinetabbutton').hide();
            if (!this.taskchart) element.find('.taskviewtabbutton').hide();
            element.find('.taskviewtabbutton').click(() => {
                if (this.view !== 'tasks') {
                    this.showView('tasks');
                }
            });
            element.find('.timelinetabbutton').click(() => {
                if (this.view !== 'timeline') {
                    this.showView('timeline');
                }
            });
            element.find('.jobtabletabbutton').click(() => {
                if (this.view !== 'jobs') {
                    this.showView('jobs');
                }
            });
            this.showView('jobs');
        } else console.error('SparkMonitor: Error Display Already Exists');
    }

    /** Remove the display from a cell. */
    removeDisplay() {
        this.displayVisible = false;
        if (this.badgeInterval) {
            clearInterval(this.badgeInterval);
            this.badgeInterval = null;
        }
        this.hideView(this.view);
        this.displayElement.remove();
    }

    /** Renders a view specified
     * @param {string} view - The view to render- "jobs", "timeline", "tasks" or "hidden"
     */
    showView(view) {
        const element = this.displayElement;
        element.find('.tabcontent').removeClass('tabcontentactive');
        element.find('.tabbutton').removeClass('tabbuttonactive');
        if (this.view === 'hidden') {
            element.find('.content').slideDown({
                queue: false,
                duration: 400,
                complete: () => {
                    $(this.cell.node)
                        .find('.headericon')
                        .removeClass('headericoncollapsed');
                },
            });
        }
        switch (view) {
            case 'jobs':
                this.hideView(this.view);
                this.view = 'jobs';
                element.find('.jobtablecontent').addClass('tabcontentactive');
                element.find('.jobtabletabbutton').addClass('tabbuttonactive');
                this.createJobTable();
                break;
            case 'tasks':
                this.hideView(this.view);
                this.view = 'tasks';
                element.find('.taskviewcontent').addClass('tabcontentactive');
                element.find('.taskviewtabbutton').addClass('tabbuttonactive');
                if (this.taskchart) this.taskchart.create();
                else throw new Error('Error Task Chart Module not loaded yet');
                break;
            case 'timeline':
                this.hideView(this.view);
                this.view = 'timeline';
                element.find('.timelinecontent').addClass('tabcontentactive');
                element.find('.timelinetabbutton').addClass('tabbuttonactive');
                if (this.timeline) this.timeline.create();
                else throw new Error('Error Timeline Module not loaded yet');
                break;
            default:
                throw new Error('unexpected view given');
        }
    }

    /**
     * Hides the view specified, performing any clean up necessary.
     * @param {string} view - The view to hide.
     */
    hideView(view) {
        try {
            switch (view) {
                case 'jobs':
                    this.hideJobTable();
                    break;
                case 'tasks':
                    if (this.taskchart) this.taskchart.hide();
                    break;
                case 'timeline':
                    if (this.timeline) this.timeline.hide();
                    break;
                default:
                    throw new Error('Unexpected view given');
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Updates the counters on the title of the display.
     * @param {boolean} [redraw=false] - Forces a redraw regardless of whether data has changed if true.
     */
    setBadges(redraw = false) {
        if (this.badgesmodified || redraw) {
            this.badgesmodified = false;
            this.displayElement.find('.badgeexecutorcount').text(this.monitor.numExecutors);
            this.displayElement.find('.badgeexecutorcorescount').text(this.monitor.totalCores);
            if (this.numActiveJobs > 0) {
                this.displayElement
                    .find('.badgerunning')
                    .show()
                    .css('display', 'inline');
                this.displayElement.find('.badgerunningcount').html(this.numActiveJobs);
            } else this.displayElement.find('.badgerunning').hide(500);
            if (this.numCompletedJobs > 0) {
                this.displayElement
                    .find('.badgecompleted')
                    .show()
                    .css('display', 'inline');
                this.displayElement.find('.badgecompletedcount').html(this.numCompletedJobs);
            } else this.displayElement.find('.badgecompleted').hide(500);
            if (this.numFailedJobs > 0) {
                this.displayElement
                    .find('.badgefailed')
                    .show()
                    .css('display', 'inline');
                this.displayElement.find('.badgefailedcount').html(this.numFailedJobs);
            } else this.displayElement.find('.badgefailed').hide(500);
        }
    }

    /** Called when a cells execution is completed, as detected by the currentcell module. */
    onCellExecutionCompleted() {
        this.cellEndTime = new Date();
        this.cellcompleted = true;
        if (this.numActiveJobs === 0 && !this.allcompleted) {
            this.onAllCompleted();
        }
        if (this.displayVisible) this.displayElement.find('.stopbutton').hide(500);
    }

    /** Called when all jobs have ended and the cell's execution is completed. */
    onAllCompleted() {
        this.allcompleted = true;
        if (this.badgeInterval) {
            clearInterval(this.badgeInterval);
            this.badgeInterval = null;
        }
        if (this.displayVisible) this.setBadges(true);
        if (this.timeline) this.timeline.onAllCompleted();
        if (this.taskchart) this.taskchart.onAllCompleted();
    }

    // --------Job Table Functions----------------------

    /** Create and renders the job table and registers refreshers to update it.  */
    createJobTable() {
        if (this.view !== 'jobs') {
            throw new Error('SparkMonitor: Drawing job table when view is not jobs');
        }
        const thead = $(
            `<thead><tr>
                                <th class='thbutton'></th>
                                <th class='thjobid'>Job ID</th >
                                <th class='thjobname'>Job Name</th>
                                <th class='thjobstatus'>Status</th>
                                <th class='thjobstages'>Stages</th>
                                <th class='thjobtasks'>Tasks</th>
                                <th class='thjobstart'>Submission Time</th>
                                <th class='thjobtime'>Duration</th>
                            </tr ></thead >`,
        );
        const tbody = $('<tbody></tbody>').addClass('jobtablebody');

        Object.keys(this.jobData).forEach(jobId => {
            const jobrow = CellMonitor.createJobItem();
            this.updateJobItem(jobrow, jobId, true);
            tbody.append(jobrow);
        });
        const table = $('<table/>').addClass('jobtable');
        table.append(thead, tbody);
        this.displayElement
            .find('.jobtablecontent')
            .empty()
            .append(table);
        if (!this.allcompleted) this.registerJobTableRefresher();
    }

    /**
     * Creates HTML element for a single stage item in the table.
     * @return {jQuery} - The stage row element.
     */
    static createStageItem() {
        const srow = $('<tr></tr>').addClass('stagerow');
        const tdstageid = $('<td></td>').addClass('tdstageid');
        const tdstagename = $('<td></td>')
            .text('Unknown')
            .addClass('tdstagename');
        const status = $('<span></span>')
            .addClass('UNKNOWN')
            .text('UNKNOWN');
        const tdstatus = $('<td></td>')
            .addClass('tdstagestatus')
            .html(status);
        const progress = $(
            `<div class="cssprogress">
                                <div class="data"></div><span class="val1"></span><span class="val2"></span></div>`,
        ).addClass('tdstageitemprogress');
        const tdtasks = $('<td></td>')
            .addClass('tdstageprogress')
            .append(progress);
        const tdstarttime = $('<td></td>')
            .text('Unknown')
            .addClass('tdstagestarttime');
        const tdduration = $('<td></td>')
            .text('-')
            .addClass('tdstageduration');
        srow.append(tdstageid, tdstagename, tdstatus, tdtasks, tdstarttime, tdduration);
        return srow;
    }

    /**
     * Fills data in a stage row element
     * @param {jQuery} element - The stage row element
     * @param {Object} data - The stage item data
     * @param {boolean} [redraw=false] - Force a redraw even if data is not modified.
     */
    updateStageItem(element, stageId, redraw = false) {
        const data = this.stageData[stageId];
        if (data.modified || redraw) {
            this.stageData[stageId].modified = false;
            const status = $('<span></span>')
                .addClass(data.status)
                .text(data.status);
            element.find('.tdstagestatus').html(status);
            element.find('.tdstageid').text(data.id);
            let val1 = 0;
            let val2 = 0;
            const text = `${data.numCompletedTasks}${data.numActiveTasks > 0 ? ` + ${data.numActiveTasks} ` : ''} / ${
                data.numTasks
            }`;
            if (data.numTasks > 0) {
                val1 = (data.numCompletedTasks / data.numTasks) * 100;
                val2 = (data.numActiveTasks / data.numTasks) * 100;
                element.find('.tdstageitemprogress .data').text(text);
            }
            element.find('.tdstagestatus');
            element.find('.tdstageitemprogress .val1').width(`${val1}%`);
            element.find('.tdstageitemprogress .val2').width(`${val2}%`);
            if (data.name) {
                element.find('.tdstagename').text(data.name);
            }
            if (data.start) {
                const start = $('<time></time>')
                    .addClass('timeago')
                    .attr('data-livestamp', data.start)
                    .attr('title', data.start.toString())
                    .text(data.start.toString());
                element
                    .find('.tdstagestarttime')
                    .empty()
                    .html(start);
            }
            if (data.start && data.end && data.status !== 'RUNNING') {
                const duration = moment.duration(data.end.getTime() - data.start.getTime());
                element.find('.tdstageduration').text(duration.format('d[d] h[h]:mm[m]:ss[s]'));
            }
        }
    }

    /**
     * Creates HTML element for a single job item in the table.
     * @return {jQuery} - The job row element, containing one row item for the job and another for the expandable stages table.
     */
    static createJobItem() {
        const fakerow = $('<tr><td class="stagetableoffset"></td><td colspan=7 class="stagedata"></td></tr>')
            .addClass('jobstagedatarow')
            .hide();
        const stagetable = $(
            `<table class='stagetable'>
                        <thead>
                        <th class='thstageid'>Stage Id</th>
                        <th class='thstagename'>Stage Name</th>
                        <th class='thstagestatus'>Status</th>
                        <th class='thstagetasks'>Tasks</th>
                        <th class='thstagestart'>Submission Time</th>
                        <th class='thstageduration'>Duration</th>
                        </thead>
                        <tbody></tbody></table>`,
        ).addClass('stagetable');
        // let stagetablebody = stagetable.find('tbody');
        fakerow.find('.stagedata').append(stagetable);
        const tdbutton = $('<td></td>')
            .addClass('tdstagebutton')
            .html('<span class="tdstageicon"></span>');
        const icon = tdbutton.find('.tdstageicon');
        tdbutton.click(() => {
            icon.toggleClass('tdstageiconcollapsed');
            fakerow.slideToggle();
        });
        const tdjobid = $('<td></td>').addClass('tdjobid');
        const tdjobname = $('<td></td>').addClass('tdjobname');
        const status = $('<span></span>')
            .addClass('pending')
            .text('PENDING')
            .addClass('tditemjobstatus');
        const tdjobstatus = $('<td></td>')
            .addClass('tdjobstatus')
            .html(status);
        const tdjobstages = $('<td></td>').addClass('tdjobstages');
        const jobprogress = $(
            `               <div class="cssprogress">
                            <div class="data"></div><span class="val1"></span><span class="val2"></span></div>`,
        ).addClass('tdjobitemprogress');
        const tdjobtasks = $('<td></td>')
            .addClass('tdtasks')
            .append(jobprogress);
        const durationtext = '-';
        const tdjobtime = $('<td></td>').addClass('tdjobstarttime');
        const tdjobduration = $('<td></td>')
            .text(durationtext)
            .addClass('tdjobduration');
        const row = $('<tr></tr>').addClass('jobrow');
        row.append(tdbutton, tdjobid, tdjobname, tdjobstatus, tdjobstages, tdjobtasks, tdjobtime, tdjobduration);
        return row.add(fakerow);
    }

    /**
     * Fills data in a job row element.
     * @param {jQuery} element - The job row element
     * @param {Object} data - The job item data
     * @param {boolean} [redraw=false] - Force a redraw even if data is not modified.
     */
    updateJobItem(element, jobId, redraw = false) {
        const data = this.jobData[jobId];
        if (data.modified || redraw) {
            this.jobData[jobId].modified = false;
            element.addClass(`jobrow${data.id}`);
            data.stageIds.forEach(stageId => {
                let srow = element.find(`.stagerow${stageId}`);
                if (!srow.length) {
                    srow = CellMonitor.createStageItem().addClass(`stagerow${stageId}`);
                    element.find('.stagetable tbody').append(srow);
                    this.updateStageItem(srow, stageId, true);
                } else {
                    this.updateStageItem(srow, stageId);
                }
            });
            let val1 = 0;
            let val2 = 0;
            if (data.numTasks > 0) {
                val1 = (data.numCompletedTasks / data.numTasks) * 100;
                val2 = (data.numActiveTasks / data.numTasks) * 100;
                const text = `${data.numCompletedTasks}${
                    data.numActiveTasks > 0 ? ` + ${data.numActiveTasks} ` : ''
                } / ${data.numTasks}`;
                element
                    .find('.tdjobitemprogress')
                    .find('.data')
                    .text(text);
                element.find('.tdjobitemprogress .val1').width(`${val1}%`);
                element.find('.tdjobitemprogress .val2').width(`${val2}%`);
            }
            element.find('.tdjobid').text(data.id);
            element.find('.tdjobname').text(data.name);
            const status = $('<span></span>')
                .addClass(data.status)
                .text(data.status)
                .addClass('tditemjobstatus');
            element.find('.tdjobstatus').html(status);
            element
                .find('.tdjobstages')
                .text(
                    `${data.numCompletedStages}/${data.numStages}${
                        data.numSkippedStages > 0 ? ` (${data.numSkippedStages} skipped)` : '        '
                    }${data.numActiveStages > 0 ? `(${data.numActiveStages} active) ` : ''}`,
                );
            const start = $('<time></time>')
                .addClass('timeago')
                .attr('data-livestamp', data.start)
                .attr('title', data.start.toString())
                .addClass('tdjobstart')
                .livestamp(data.start);
            element.find('.tdjobstarttime').html(start);
            if (data.status !== 'RUNNING') {
                const duration = moment.duration(data.end.getTime() - data.start.getTime());
                element.find('.tdjobduration').text(duration.format('d[d] h[h]:mm[m]:ss[s]'));
            }
        }
    }

    /** Updates the data in the job table */
    updateJobTable() {
        if (this.view !== 'jobs') {
            throw new Error('SparkMonitor: Updating job table when view is not jobs');
        }
        Object.keys(this.jobData).forEach(jobId => {
            let jobrow = this.displayElement.find(`.jobtablecontent table tbody .jobrow${jobId}`);
            if (!jobrow.length) {
                jobrow = CellMonitor.createJobItem();
                this.displayElement.find('.jobtablebody').append(jobrow);
                this.updateJobItem(jobrow, jobId, true);
            } else {
                this.updateJobItem(jobrow, jobId);
            }
        });
    }

    /** Registers a refresher to update the job table. */
    registerJobTableRefresher() {
        clearInterval(this.jobtableinterval);
        this.jobtableinterval = setInterval($.proxy(this.updateJobTable, this), 1000);
    }

    /** Clear the refreshers to update the job table. */
    clearJobTableRefresher() {
        clearInterval(this.jobtableinterval);
    }

    /** Hide the job table. */
    hideJobTable() {
        this.clearJobTableRefresher();
    }

    // ----------Data Handling Functions----------------

    /** Called when a Spark job starts. */
    onSparkJobStart(data) {
        this.numActiveJobs += 1;
        this.badgesmodified = true;
        this.appId = data.appId;
        const name = $('<div>')
            .text(data.name)
            .html()
            .split(' ')[0]; // Escaping HTML <, > from string
        this.jobData[data.jobId] = {
            id: data.jobId,
            start: new Date(data.submissionTime),
            name,
            status: data.status,
            stageIds: data.stageIds,
            numTasks: data.numTasks,
            numActiveTasks: 0,
            numCompletedTasks: 0,
            numFailedTasks: 0,
            numStages: data.stageIds.length,
            numActiveStages: 0,
            numCompletedStages: 0,
            numFailedStages: 0,
            numSkippedStages: 0,
            modified: true,
        };
        data.stageIds.forEach(stageid => {
            if (!this.stageIdtoJobId[stageid]) this.stageIdtoJobId[stageid] = [];
            this.stageIdtoJobId[stageid].push(data.jobId);
            const stageName = $('<div>')
                .text(data.stageInfos[stageid].name)
                .html()
                .split(' ')[0]; // Hack for escaping HTML <, > from string.
            this.stageData[stageid] = {
                id: stageid,
                status: 'PENDING',
                job: data.jobId,
                name: stageName,
                numTasks: data.stageInfos[stageid].numTasks,
                numActiveTasks: 0,
                numCompletedTasks: 0,
                numFailedTasks: 0,
                modified: true,
            };
        });
        if (name === 'null') {
            const laststageid = Math.max.apply(null, data.stageIds);
            this.jobData[data.jobId].name = this.stageData[laststageid].name;
        }
        if (!this.initialDisplayCreated) {
            this.createDisplay();
            this.initialDisplayCreated = true;
        }
        if (this.timeline) this.timeline.onSparkJobStart(data);
        if (this.taskchart) this.taskchart.onSparkJobStart(data);
    }

    /** Called when a Spark job ends. */
    onSparkJobEnd(data) {
        this.jobData[data.jobId].status = data.status;
        this.jobData[data.jobId].stageIds.forEach(stageid => {
            if (this.stageData[stageid].status === 'PENDING') {
                this.stageData[stageid].status = 'SKIPPED';
                this.jobData[data.jobId].numSkippedStages += 1;
                this.jobData[data.jobId].numStages -= 1;
                this.stageData[stageid].modified = true;
                this.jobData[data.jobId].numTasks -= this.stageData[stageid].numTasks;
            }
        });
        this.numActiveJobs -= 1;
        if (data.status === 'SUCCEEDED') {
            this.numCompletedJobs += 1;
            this.jobData[data.jobId].status = 'COMPLETED';
        } else {
            this.numFailedJobs += 1;
            this.jobData[data.jobId].status = 'FAILED';
        }
        this.badgesmodified = true;
        this.jobData[data.jobId].end = new Date(data.completionTime);
        this.jobData[data.jobId].modified = true;
        if (this.timeline) this.timeline.onSparkJobEnd(data);
        if (this.taskchart) this.taskchart.onSparkJobEnd(data);
        if (this.numActiveJobs === 0 && this.cellcompleted && !this.allcompleted) {
            this.onAllCompleted();
        }
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
        this.stageIdtoJobId[data.stageId].forEach(jobId => {
            this.jobData[jobId].numActiveStages += 1;
            this.jobData[jobId].modified = true;
        });
        this.stageData[data.stageId].status = 'RUNNING';
        this.stageData[data.stageId].name = name;
        this.stageData[data.stageId].start = submissionDate;
        this.stageData[data.stageId].numTasks = data.numTasks;
        this.stageData[data.stageId].modified = true;

        if (this.timeline) this.timeline.onSparkStageSubmitted(data);
    }

    /** Called when a Spark stage is completed. */
    onSparkStageCompleted(data) {
        this.stageIdtoJobId[data.stageId].forEach(jobId => {
            this.jobData[jobId].numActiveStages -= 1;
            this.jobData[jobId].modified = true;
            if (data.status === 'COMPLETED') {
                this.jobData[jobId].numCompletedStages += 1;
            } else {
                this.jobData[jobId].numFailedStages += 1;
            }
        });
        this.stageData[data.stageId].status = data.status;
        this.stageData[data.stageId].start = new Date(data.submissionTime);
        this.stageData[data.stageId].end = new Date(data.completionTime);
        this.stageData[data.stageId].modified = true;

        if (this.timeline) this.timeline.onSparkStageCompleted(data);
    }

    /** Called when a Spark task is started. */
    onSparkTaskStart(data) {
        this.stageData[data.stageId].numActiveTasks += 1;
        this.stageData[data.stageId].firsttaskstart = new Date(data.launchTime);
        this.stageData[data.stageId].modified = true;

        this.stageIdtoJobId[data.stageId].forEach(jobId => {
            this.jobData[jobId].numActiveTasks += 1;
            this.jobData[jobId].modified = true;
        });
        if (this.timeline) this.timeline.onSparkTaskStart(data);
        if (this.taskchart) this.taskchart.onSparkTaskStart(data);
    }

    /** Called when a Spark task is ended. */
    onSparkTaskEnd(data) {
        this.stageData[data.stageId].numActiveTasks -= 1;
        this.stageData[data.stageId].modified = true;
        if (data.status === 'SUCCESS') {
            this.stageData[data.stageId].numCompletedTasks += 1;
        } else {
            this.stageData[data.stageId].numFailedTasks += 1;
        }
        this.stageIdtoJobId[data.stageId].forEach(jobId => {
            this.jobData[jobId].numActiveTasks -= 1;
            this.jobData[jobId].modified = true;
            if (data.status === 'SUCCESS') {
                this.jobData[jobId].numCompletedTasks += 1;
            } else {
                this.jobData[jobId].numFailedTasks += 1;
            }
        });
        if (this.timeline) this.timeline.onSparkTaskEnd(data);
        if (this.taskchart) this.taskchart.onSparkTaskEnd(data);
    }

    /** Called when an executor is added to spark */
    onSparkExecutorAdded() {
        this.badgesmodified = true;
    }

    /** Called when an executor is removed from spark */
    onSparkExecutorRemoved() {
        this.badgesmodified = true;
    }
}
