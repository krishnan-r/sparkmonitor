define(['base/js/namespace', './misc', 'require', 'jquery'], function (Jupyter, misc, require, events, $) {

    var widgetHTML;
    console.log('SparkMonitor: Loading CSS from', require.toUrl('./styles.css'));
    misc.loadCSS(require.toUrl('./styles.css'));
    console.log('SparkMonitor: Loading HTML from', require.toUrl('./monitor.html'));
    misc.loadHTML(require.toUrl('./monitor.html'), function (data) {
        widgetHTML = data
        console.log('SparkMonitor: Finished Loading HTML from', require.toUrl('./monitor.html'), { 'html': data });
    });

    function CellMonitor(monitor, cell) {
        var that = this;
        this.monitor = monitor;
        this.cell = cell
        this.jobs = [];
    }

    CellMonitor.prototype.createDisplay = function () {
        this.html = widgetHTML
        if(!this.cell.element.find('#CellMonitor').length)this.cell.element.find('.input').after(this.html); 
    }

    CellMonitor.prototype.showDisplay = function () {

    }

    CellMonitor.prototype.removeDisplay = function () {

    }
    CellMonitor.prototype.addJob = function (jobData) {

    }
    CellMonitor.prototype.updateJob = function (jobData) {

    }
    CellMonitor.prototype.onStopJobs = function () {

    }
    return CellMonitor;
});