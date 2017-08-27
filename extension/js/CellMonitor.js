/**
 * Definitions for the CellMonitor object.
 * @module CellMonitor
 */
import Jupyter from 'base/js/namespace';    // The main Jupyter object for all frontend APIs of the notebook
import events from 'base/js/events';        // Jupyter events module to listen for notebook page events
import requirejs from 'require'             // Used to asynchronously load other modules - Timeline and TaskChart  
import $ from 'jquery';                     // For manipulating the DOM
import livestamp from 'kuende-livestamp';   // Used for displaying auto-updating timestamps like '5 mins ago'
import WidgetHTML from './cellmonitor.html' // Template HTML for the display
import './styles.css'                       // CSS styles
import './jobtable.css'                     // CSS specific to job table
import spinner from './images/spinner.gif'  // loading animation for spark-ui proxy
import moment from 'moment'                 // For handling durations
import 'moment-duration-format';            // Plugin for moment to format durations to strings

//Asynchronously loaded constructors for Timeline and TaskChart
var Timeline = null;
var TaskChart = null;

//Loading modules asynchronously
requirejs(['./timeline'], function (timeline) {
    Timeline = timeline;
    console.log("SparkMonitor: Timeline module loaded", [timeline]);
});
requirejs(['./taskchart'], function (taskchart) {
    TaskChart = taskchart;
    console.log("SparkMonitor: TaskChart module loaded", [taskchart])
});

/**
 * Class that implements a monitoring display for a single cell.
 * @constructor
 * @param {SparkMonitor} monitor - The parent singleton SparkMonitor instance.
 * @param {CodeCell} cell - The Jupyter CodeCell instance of the cell.
 */
function CellMonitor(monitor, cell) {
    var that = this;
    window.cm = this;//Debugging from console

    this.monitor = monitor; //Parent SparkMonitor instance
    this.cell = cell        //Jupyter Cell instance
    this.view = "jobs";     //The current display tab -- "jobs" || "timeline" || "tasks"
    this.lastview = "jobs"; //The previous display tab, used for restoring hidden display

    this.initialDisplayCreated = false; //Used by jobstart event to show display first time
    this.displayVisible = false; //Used to toggle display

    this.cellcompleted = false; //Cell has finished executing
    this.allcompleted = false;  //All job end messages have arrived for cell.

    this.displayElement = null; //HTML DOM element of the monitor

    this.cellStartTime = new Date(); //This is only from the frontend
    this.cellEndTime = -1;

    this.badgesmodified = false;  // Used to refresh counts only if changed.
    this.badgeInterval = null;    // The return value of setInterval
    // Values for badge counters in the title of display
    this.numActiveJobs = 0;
    this.numCompletedJobs = 0;
    this.numFailedJobs = 0;

    events.off('finished' + cell.cell_id + 'currentcell'); //Clearing event handler from previous instance if any
    events.one('finished' + cell.cell_id + 'currentcell', function () { that.onCellExecutionCompleted(); })

    //Job Table Data----------------------------------
    this.jobData = {};
    this.stageData = {};
    this.stageIdtoJobId = {};

    // Timeline and TaskChart module instances
    this.timeline = null;
    this.taskchart = null;

    // Only if the load successfully create these views.
    if (Timeline) this.timeline = new Timeline(this);
    if (TaskChart) this.taskchart = new TaskChart(this);
}

/** Creates and renders the display below the cell. */
CellMonitor.prototype.createDisplay = function () {
    var that = this;
    if (!this.cell.element.find('.CellMonitor').length) {
        var element = $(WidgetHTML).hide();
        this.displayElement = element;
        this.cell.element.find('.inner_cell').append(element);
        element.slideToggle();
        this.displayVisible = true;
        if (!this.allcompleted) this.badgeInterval = setInterval($.proxy(this.setBadges, this), 1000);
        this.setBadges(true);

        element.find('.stopbutton').click(function () { that.stopJobs(); });
        if (this.cellcompleted) element.find('.stopbutton').hide();
        element.find('.closebutton').click(function () { that.removeDisplay(); });

        element.find('.sparkuitabbutton').click(function () { that.openSparkUI(''); });
        element.find('.titlecollapse').click(function () {
            if (that.view != "hidden") {
                that.lastview = that.view;
                that.hideView(that.view);
                that.view = "hidden";
                that.cell.element.find('.content').slideUp({
                    queue: false, duration: 400,
                    complete: function () {
                        that.cell.element.find('.headericon').addClass('headericoncollapsed');
                        element.find('.tabcontent').removeClass('tabcontentactive');
                        element.find('.tabbutton').removeClass('tabbuttonactive');
                    }
                });
            } else {
                that.showView(that.lastview);
            }
        });
        if (!this.timeline) element.find('.timelinetabbutton').hide();
        if (!this.taskchart) element.find('.taskviewtabbutton').hide();
        element.find('.taskviewtabbutton').click(function () {
            if (that.view != 'tasks') { that.showView("tasks"); }
        });
        element.find('.timelinetabbutton').click(function () {
            if (that.view != 'timeline') { that.showView("timeline"); }
        });
        element.find('.jobtabletabbutton').click(function () {
            if (that.view != 'jobs') { that.showView("jobs"); }
        });
        this.showView("jobs");
    }
    else console.error("SparkMonitor: Error Display Already Exists");
}

/** Remove the display from a cell. */
CellMonitor.prototype.removeDisplay = function () {
    this.displayVisible = false;
    if (this.badgeInterval) {
        clearInterval(this.badgeInterval);
        this.badgeInterval = null;
    }
    this.hideView(this.view);
    this.displayElement.remove();
}

/**
 * Stop Running Jobs
 * Stopping Jobs does not work at the moment.  
 * This interrupts the kernel currently.  
 * Issue with jupyter comm messaging while kernel is busy.  
 */
CellMonitor.prototype.stopJobs = function () {
    Jupyter.notebook.kernel.interrupt(); // This does not stop the job..does not work as expected.
    this.monitor.send({
        msgtype: 'sparkStopJobs',
    });
}

/** 
 * Opens the Spark UI in an IFrame.
 * @param {string} [url=] - A relative url to open within the main domain.
 */
CellMonitor.prototype.openSparkUI = function (url) {
    if (!url) url = '';
    var iframe = $('\
                    <div style="overflow:hidden">\
                    <iframe src="'+ Jupyter.notebook.base_url + 'sparkmonitor/' + url + '" frameborder="0" scrolling="yes" class="sparkuiframe">\
                    </iframe>\
                    </div>\
                    ');
    iframe.find('.sparkuiframe').css('background-image', 'url("' + requirejs.toUrl('./' + spinner) + '")');
    iframe.find('.sparkuiframe').css('background-repeat', 'no-repeat');
    iframe.find('.sparkuiframe').css('background-position', "50% 50%");
    iframe.find('.sparkuiframe').width('100%');
    iframe.find('.sparkuiframe').height('100%');
    iframe.dialog({
        title: "Spark UI 127.0.0.1:4040",
        width: 1000,
        height: 500,
        autoResize: false,
        dialogClass: "sparkui-dialog"
    });
}

/** Renders a view specified 
 * @param {string} view - The view to render- "jobs", "timeline", "tasks" or "hidden"
 */
CellMonitor.prototype.showView = function (view) {
    var that = this;
    var element = this.displayElement;
    element.find('.tabcontent').removeClass('tabcontentactive')
    element.find('.tabbutton').removeClass('tabbuttonactive')
    if (this.view == "hidden") {
        element.find('.content').slideDown({
            queue: false, duration: 400,
            complete: function () { that.cell.element.find('.headericon').removeClass('headericoncollapsed'); }
        });
    }
    switch (view) {
        case "jobs":
            this.hideView(this.view);
            this.view = "jobs";
            element.find('.jobtablecontent').addClass('tabcontentactive');
            element.find('.jobtabletabbutton').addClass('tabbuttonactive');
            this.createJobTable();
            break;
        case "tasks":
            this.hideView(this.view);
            this.view = "tasks";
            element.find('.taskviewcontent').addClass('tabcontentactive');
            element.find('.taskviewtabbutton').addClass('tabbuttonactive');
            if (this.taskchart) this.taskchart.create();
            else throw "Error Task Chart Module not loaded yet"
            break;
        case "timeline":
            this.hideView(this.view);
            this.view = "timeline";
            element.find('.timelinecontent').addClass('tabcontentactive');
            element.find('.timelinetabbutton').addClass('tabbuttonactive');
            if (this.timeline) this.timeline.create();
            else throw "Error Timeline Module not loaded yet"
            break;
    }
}

/**
 * Hides the view specified, performing any clean up necessary.
 * @param {string} view - The view to hide.
 */
CellMonitor.prototype.hideView = function (view) {
    try {
        switch (view) {
            case "jobs":
                this.hideJobTable();
                break;
            case "tasks":
                if (this.taskchart) this.taskchart.hide();
                break;
            case "timeline":
                if (this.timeline) this.timeline.hide();
                break;
        }
    }
    catch (err) {
    }
}
/**
 * Updates the counters on the title of the display.
 * @param {boolean} [redraw=false] - Forces a redraw regardless of whether data has changed if true.
 */
CellMonitor.prototype.setBadges = function (redraw = false) {
    if (this.badgesmodified || redraw) {
        this.badgesmodified = false;
        this.displayElement.find('.badgeexecutorcount').text(this.monitor.numExecutors);
        this.displayElement.find('.badgeexecutorcorescount').text(this.monitor.totalCores);
        if (this.numActiveJobs > 0) {
            this.displayElement.find('.badgerunning').show().css('display', 'inline');
            this.displayElement.find('.badgerunningcount').html(this.numActiveJobs);
        }
        else this.displayElement.find('.badgerunning').hide(500)
        if (this.numCompletedJobs > 0) {
            this.displayElement.find('.badgecompleted').show().css('display', 'inline');
            this.displayElement.find('.badgecompletedcount').html(this.numCompletedJobs);
        }
        else this.displayElement.find('.badgecompleted').hide(500)
        if (this.numFailedJobs > 0) {
            this.displayElement.find('.badgefailed').show().css('display', 'inline');
            this.displayElement.find('.badgefailedcount').html(this.numFailedJobs);
        }
        else this.displayElement.find('.badgefailed').hide(500)
    }
}

/** Called when a cells execution is completed, as detected by the currentcell module. */
CellMonitor.prototype.onCellExecutionCompleted = function () {
    this.cellEndTime = new Date();
    this.cellcompleted = true;
    if (this.numActiveJobs == 0 && !this.allcompleted) {
        this.onAllCompleted();
    }
    if (this.displayVisible) this.displayElement.find('.stopbutton').hide(500);
}

/** Called when all jobs have ended and the cell's execution is completed. */
CellMonitor.prototype.onAllCompleted = function () {
    this.allcompleted = true;
    if (this.badgeInterval) {
        clearInterval(this.badgeInterval);
        this.badgeInterval = null;
    }
    if (this.displayVisible) this.setBadges(true);
    if (this.timeline) this.timeline.onAllCompleted();
    if (this.taskchart) this.taskchart.onAllCompleted();
}

//--------Job Table Functions----------------------

/** Create and renders the job table and registers refreshers to update it.  */
CellMonitor.prototype.createJobTable = function () {
    if (this.view != 'jobs') {
        throw "SparkMonitor: Drawing job table when view is not jobs";
    }
    var that = this;
    var thead = $("<thead><tr>\
                            <th class='thbutton'></th>\
                            <th class='thjobid'>Job ID</th >\
                            <th class='thjobname'>Job Name</th>\
                            <th class='thjobstatus'>Status</th>\
                            <th class='thjobstages'>Stages</th>\
                            <th class='thjobtasks'>Tasks</th>\
                            <th class='thjobstart'>Submission Time</th>\
                            <th class='thjobtime'>Duration</th>\
                        </tr ></thead >");
    var tbody = $('<tbody></tbody>').addClass('jobtablebody');

    for (var jobId in that.jobData) {
        var jobdata = that.jobData[jobId];
        var jobrow = that.createJobItem();
        that.updateJobItem(jobrow, jobdata, true);
        tbody.append(jobrow);
    }
    var table = $("<table/>").addClass('jobtable');
    table.append(thead, tbody);
    this.displayElement.find('.jobtablecontent').empty().append(table);
    if (!this.allcompleted) this.registerJobTableRefresher();
}
/** 
 * Creates HTML element for a single stage item in the table.
 * @return {jQuery} - The stage row element.
 */
CellMonitor.prototype.createStageItem = function () {
    var srow = $('<tr></tr>').addClass('stagerow');
    var tdstageid = $('<td></td>').addClass('tdstageid');;
    var tdstagename = $('<td></td>').text('Unknown').addClass('tdstagename');
    var status = $('<span></span>').addClass("UNKNOWN").text('UNKNOWN');
    var tdstatus = $('<td></td>').addClass("tdstagestatus").html(status);
    var progress = $('\<div class="cssprogress">\
                               <div class="data"></div><span class="val1"></span><span class="val2"></span></div>').addClass('tdstageitemprogress');
    var tdtasks = $('<td></td>').addClass("tdstageprogress").append(progress);
    var tdstarttime = $('<td></td>').text('Unknown').addClass('tdstagestarttime');
    var tdduration = $('<td></td>').text('-').addClass('tdstageduration');
    srow.append(tdstageid, tdstagename, tdstatus, tdtasks, tdstarttime, tdduration);
    return srow;
}

/** 
 * Fills data in a stage row element
 * @param {jQuery} element - The stage row element
 * @param {Object} data - The stage item data
 * @param {boolean} [redraw=false] - Force a redraw even if data is not modified.
 */
CellMonitor.prototype.updateStageItem = function (element, data, redraw = false) {
    if (data.modified || redraw) {
        data.modified = false;
        var status = $('<span></span>').addClass(data.status).text(data.status);
        element.find('.tdstagestatus').html(status);
        element.find('.tdstageid').text(data.id);
        var val1 = 0, val2 = 0;
        var text = '' + data.numCompletedTasks + '' + (data.numActiveTasks > 0 ? ' + ' + data.numActiveTasks + ' ' : '') + ' / ' + data.numTasks;
        if (data.numTasks > 0) {
            val1 = (data.numCompletedTasks / data.numTasks) * 100;
            val2 = (data.numActiveTasks / data.numTasks) * 100;
            element.find('.tdstageitemprogress .data').text(text);
        }
        element.find('.tdstagestatus')
        element.find('.tdstageitemprogress .val1').width(val1 + '%');
        element.find('.tdstageitemprogress .val2').width(val2 + '%');
        if (data.name) {
            element.find('.tdstagename').text(data.name);
        }
        if (data.start) {
            var start = $('<time></time>').addClass('timeago').attr('data-livestamp', data.start).attr('title', data.start.toString()).text(data.start.toString())
            element.find('.tdstagestarttime').empty().html(start);
        }
        if (data.start && data.end && data.status != "RUNNING") {
            var duration = moment.duration(data.end.getTime() - data.start.getTime());
            element.find('.tdstageduration').text(duration.format("d[d] h[h]:mm[m]:ss[s]"));
        }
    }

}

/** 
 * Creates HTML element for a single job item in the table.
 * @return {jQuery} - The job row element, containing one row item for the job and another for the expandable stages table.
 */
CellMonitor.prototype.createJobItem = function () {
    var fakerow = $('<tr><td class="stagetableoffset"></td><td colspan=7 class="stagedata"></td></tr>').addClass('jobstagedatarow').hide();
    var stagetable = $("<table class='stagetable'>\
                    <thead>\
                    <th class='thstageid'>Stage Id</th>\
                    <th class='thstagename'>Stage Name</th>\
                    <th class='thstagestatus'>Status</th>\
                    <th class='thstagetasks'>Tasks</th>\
                    <th class='thstagestart'>Submission Time</th>\
                    <th class='thstageduration'>Duration</th>\
                    </thead>\
                    <tbody></tbody></table>").addClass('stagetable');
    //var stagetablebody = stagetable.find('tbody');
    fakerow.find('.stagedata').append(stagetable);
    var tdbutton = $('<td></td>').addClass('tdstagebutton').html('<span class="tdstageicon"></span>');
    var icon = tdbutton.find('.tdstageicon');
    tdbutton.click(function () {
        icon.toggleClass('tdstageiconcollapsed');
        fakerow.slideToggle();
    })
    var tdjobid = $('<td></td>').addClass('tdjobid');
    var tdjobname = $('<td></td>').addClass('tdjobname');
    var status = $('<span></span>').addClass("pending").text("PENDING").addClass('tditemjobstatus');
    var tdjobstatus = $('<td></td>').addClass('tdjobstatus').html(status);
    var tdjobstages = $('<td></td>').addClass('tdjobstages')
    var jobprogress = $('\
                        <div class="cssprogress">\
                        <div class="data"></div><span class="val1"></span><span class="val2"></span></div>').addClass('tdjobitemprogress');
    var tdjobtasks = $('<td></td>').addClass('tdtasks').append(jobprogress);
    var duration = "-", durationtext = "-";
    var tdjobtime = $('<td></td>').addClass('tdjobstarttime')
    var tdjobduration = $('<td></td>').text(durationtext).addClass('tdjobduration');
    var row = $('<tr></tr>').addClass('jobrow')
    row.append(tdbutton, tdjobid, tdjobname, tdjobstatus, tdjobstages, tdjobtasks, tdjobtime, tdjobduration);
    return row.add(fakerow);
}

/** 
 * Fills data in a job row element.
 * @param {jQuery} element - The job row element
 * @param {Object} data - The job item data
 * @param {boolean} [redraw=false] - Force a redraw even if data is not modified.
 */
CellMonitor.prototype.updateJobItem = function (element, data, redraw = false) {
    if (data.modified || redraw) {
        data.modified = false;
        element.addClass('jobrow' + data.id);
        var that = this;
        data.stageIds.forEach(function (stageId) {
            var srow = element.find('.stagerow' + stageId);
            if (!srow.length) {
                srow = that.createStageItem().addClass("stagerow" + stageId);
                element.find('.stagetable tbody').append(srow);
                that.updateStageItem(srow, that.stageData[stageId], true);
            }
            else {
                that.updateStageItem(srow, that.stageData[stageId]);
            }
        });
        var val1 = 0, val2 = 0;
        if (data.numTasks > 0) {
            val1 = (data.numCompletedTasks / data.numTasks) * 100;
            val2 = (data.numActiveTasks / data.numTasks) * 100;
            var text = '' + data.numCompletedTasks + '' + (data.numActiveTasks > 0 ? ' + ' + data.numActiveTasks + ' ' : '') + ' / ' + data.numTasks;
            element.find('.tdjobitemprogress').find('.data').text(text);
            element.find('.tdjobitemprogress .val1').width(val1 + '%');
            element.find('.tdjobitemprogress .val2').width(val2 + '%');
        }
        element.find('.tdjobid').text(data.id);
        element.find('.tdjobname').text(data.name);
        var status = $('<span></span>').addClass(data.status).text(data.status).addClass('tditemjobstatus');
        element.find('.tdjobstatus').html(status);
        element.find('.tdjobstages').text('' + data.numCompletedStages + '/' + data.numStages + '' + (data.numSkippedStages > 0 ? ' (' + data.numSkippedStages + ' skipped)' : '        ') + (data.numActiveStages > 0 ? '(' + data.numActiveStages + ' active) ' : ''));
        var start = $('<time></time>').addClass('timeago').attr('data-livestamp', data.start).attr('title', data.start.toString()).addClass('tdjobstart').livestamp(data.start);
        element.find('.tdjobstarttime').html(start);
        if (data.status != "RUNNING") {
            var duration = moment.duration(data.end.getTime() - data.start.getTime());
            element.find('.tdjobduration').text(duration.format("d[d] h[h]:mm[m]:ss[s]"));
        }
    }
}
/** Updates the data in the job table */
CellMonitor.prototype.updateJobTable = function () {
    var that = this;
    if (this.view != 'jobs') {
        throw "SparkMonitor: Updating job table when view is not jobs";
    }
    for (var jobId in that.jobData) {
        var jobdata = that.jobData[jobId];
        var jobrow = this.displayElement.find('.jobtablecontent table tbody .jobrow' + jobId);
        if (!jobrow.length) {
            jobrow = this.createJobItem();
            this.displayElement.find('.jobtablebody').append(jobrow);
            this.updateJobItem(jobrow, jobdata, true);
        }
        else {
            this.updateJobItem(jobrow, jobdata);
        }
    }
}

/** Registers a refresher to update the job table. */
CellMonitor.prototype.registerJobTableRefresher = function () {
    clearInterval(this.jobtableinterval);
    var that = this;
    this.jobtableinterval = setInterval($.proxy(this.updateJobTable, this), 1000);
}

/** Clear the refreshers to update the job table. */
CellMonitor.prototype.clearJobTableRefresher = function () {
    clearInterval(this.jobtableinterval);
}

/** Hide the job table. */
CellMonitor.prototype.hideJobTable = function () {
    this.clearJobTableRefresher();
}

//----------Data Handling Functions----------------

/** Called when a Spark job starts. */
CellMonitor.prototype.onSparkJobStart = function (data) {
    var that = this;
    this.numActiveJobs += 1;
    this.badgesmodified = true;
    this.appId = data.appId;
    var name = $('<div>').text(data.name).html().split(' ')[0];//Escaping HTML <, > from string
    this.jobData[data.jobId] = {
        id: data.jobId,
        start: new Date(data.submissionTime),
        name: name,
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
    data.stageIds.forEach(function (stageid) {
        if (!that.stageIdtoJobId[stageid]) that.stageIdtoJobId[stageid] = [];
        that.stageIdtoJobId[stageid].push(data.jobId);
        var name = $('<div>').text(data['stageInfos'][stageid]['name']).html().split(' ')[0];//Hack for escaping HTML <, > from string.
        that.stageData[stageid] = {
            id: stageid,
            status: 'PENDING',
            job: data.jobId,
            name: name,
            numTasks: data['stageInfos'][stageid]['numTasks'],
            numActiveTasks: 0,
            numCompletedTasks: 0,
            numFailedTasks: 0,
            modified: true,
        };
    });
    if (name == "null") {
        var laststageid = Math.max.apply(null, data.stageIds);
        that.jobData[data.jobId]['name'] = that.stageData[laststageid]['name'];
    }
    if (!this.initialDisplayCreated) {
        this.createDisplay();
        this.initialDisplayCreated = true;
    }
    if (this.timeline) this.timeline.onSparkJobStart(data);
    if (this.taskchart) this.taskchart.onSparkJobStart(data);
}

/** Called when a Spark job ends. */
CellMonitor.prototype.onSparkJobEnd = function (data) {
    var that = this;
    this.jobData[data.jobId]['status'] = data.status;
    this.jobData[data.jobId]['stageIds'].forEach(function (stageid) {
        if (that.stageData[stageid]['status'] == 'PENDING') {
            that.stageData[stageid]['status'] = "SKIPPED";
            that.jobData[data.jobId]['numSkippedStages'] += 1;
            that.jobData[data.jobId]['numStages'] -= 1;
            that.stageData[stageid]['modified'] = true;
            that.jobData[data.jobId]['numTasks'] -= that.stageData[stageid]['numTasks'];
        }
    })
    this.numActiveJobs -= 1;
    if (data.status == "SUCCEEDED") {
        this.numCompletedJobs += 1;
        this.jobData[data.jobId]['status'] = "COMPLETED";
    } else {
        this.numFailedJobs += 1;
        this.jobData[data.jobId]['status'] = "FAILED"
    }
    this.badgesmodified = true;
    this.jobData[data.jobId]['end'] = new Date(data.completionTime);
    this.jobData[data.jobId]['modified'] = true;
    if (this.timeline) this.timeline.onSparkJobEnd(data);
    if (this.taskchart) this.taskchart.onSparkJobEnd(data);
    if (this.numActiveJobs == 0 && this.cellcompleted && !this.allcompleted) {
        this.onAllCompleted();
    }
}

/** Called when a Spark stage is submitted. */
CellMonitor.prototype.onSparkStageSubmitted = function (data) {
    var that = this;
    var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.
    var submissionDate;
    if (data.submissionTime == -1) submissionDate = new Date()
    else submissionDate = new Date(data.submissionTime);
    this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
        that.jobData[jobId]['numActiveStages'] += 1;
        that.jobData[jobId]['modified'] = true;
    });
    this.stageData[data.stageId]['status'] = "RUNNING";
    this.stageData[data.stageId]['name'] = name;
    this.stageData[data.stageId]['start'] = submissionDate;
    this.stageData[data.stageId]['numTasks'] = data.numTasks;
    this.stageData[data.stageId]['modified'] = true;

    if (this.timeline) this.timeline.onSparkStageSubmitted(data);
}

/** Called when a Spark stage is completed. */
CellMonitor.prototype.onSparkStageCompleted = function (data) {
    var that = this;
    var name = $('<div>').text(data.name).html().split(' ')[0];//Hack for escaping HTML <, > from string.

    this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
        that.jobData[jobId]['numActiveStages'] -= 1;
        that.jobData[jobId]['modified'] = true;
        if (data.status == 'COMPLETED') {
            that.jobData[jobId]['numCompletedStages'] += 1;
        }
        else {
            that.jobData[jobId]['numFailedStages'] += 1;
        }
    });
    this.stageData[data.stageId]['status'] = data.status;
    this.stageData[data.stageId]['start'] = new Date(data.submissionTime);
    this.stageData[data.stageId]['end'] = new Date(data.completionTime);
    this.stageData[data.stageId]['modified'] = true;

    if (this.timeline) this.timeline.onSparkStageCompleted(data);
}

/** Called when a Spark task is started. */
CellMonitor.prototype.onSparkTaskStart = function (data) {
    var that = this;
    this.stageData[data.stageId]['numActiveTasks'] += 1;
    this.stageData[data.stageId]['firsttaskstart'] = new Date(data.launchTime);
    this.stageData[data.stageId]['modified'] = true;

    this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
        that.jobData[jobId]['numActiveTasks'] += 1;
        that.jobData[jobId]['modified'] = true;
    })
    if (this.timeline) this.timeline.onSparkTaskStart(data);
    if (this.taskchart) this.taskchart.onSparkTaskStart(data);
}

/** Called when a Spark task is ended. */
CellMonitor.prototype.onSparkTaskEnd = function (data) {
    var that = this;
    this.stageData[data.stageId]['numActiveTasks'] -= 1;
    this.stageData[data.stageId]['modified'] = true;
    if (data.status == "SUCCESS") {
        this.stageData[data.stageId]['numCompletedTasks'] += 1;
    }
    else {
        this.stageData[data.stageId]['numFailedTasks'] += 1;
    }
    this.stageIdtoJobId[data.stageId].forEach(function (jobId) {
        that.jobData[jobId]['numActiveTasks'] -= 1;
        that.jobData[jobId]['modified'] = true;
        if (data.status == "SUCCESS") {
            that.jobData[jobId]['numCompletedTasks'] += 1;
        }
        else {
            that.jobData[jobId]['numFailedTasks'] += 1;
        }
    });
    if (this.timeline) this.timeline.onSparkTaskEnd(data);
    if (this.taskchart) this.taskchart.onSparkTaskEnd(data);
}

/** Called when an executor is added to spark */
CellMonitor.prototype.onSparkExecutorAdded = function (data) {
    this.badgesmodified = true;
}

/** Called when an executor is removed from spark */
CellMonitor.prototype.onSparkExecutorRemoved = function (data) {
    this.badgesmodified = true;
}

export default CellMonitor;