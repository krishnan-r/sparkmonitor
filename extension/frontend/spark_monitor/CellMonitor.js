define(['base/js/namespace', './misc', 'require', 'base/js/events', 'jquery', './vis.min'],
    function (Jupyter, misc, require, events, $, vis) {

        console.log('VIS DEBUG:', vis);

        var widgetHTML;
        console.log('SparkMonitor: Loading CSS from', require.toUrl('./styles.css'));
        misc.loadCSS(require.toUrl('./styles.css'));
        misc.loadCSS(require.toUrl('./vis.min.css'));

        console.log('SparkMonitor: Loading HTML from', require.toUrl('./monitor.html'));
        misc.loadHTML(require.toUrl('./cellmonitor.html'), function (data) {
            widgetHTML = data
            console.log('SparkMonitor: Finished Loading HTML from', require.toUrl('./monitor.html'), { 'html': data });
        });

        function CellMonitor(monitor, cell, data, timelineOptions, timelineGroups) {
            var that = this;
            this.monitor = monitor;
            this.cell = cell
            this.jobs = [];
            this.alldata = data;
            this.timelineDataView = new vis.DataView(data, {
                filter: function (item) {
                    return (item.cell_id == cell.cell_id);
                },
                fields: ['id', 'start', 'end', 'content', 'group', 'title']
            });
            this.timelineOptions = timelineOptions;
            this.timelineGroups = timelineGroups;
            this.timeline={};
        }

        CellMonitor.prototype.createDisplay = function () {
            this.html = widgetHTML
            if (!this.cell.element.find('#CellMonitor').length) {
                this.cell.element.find('.input').after(this.html);
                this.createTimeline()
            }
        }

        CellMonitor.prototype.resizeTimeline = function () {
           //this.timeline.fit(); //??
        }

        CellMonitor.prototype.onStopJobs = function () {

        }

        CellMonitor.prototype.createTimeline = function () {
            var container = this.cell.element.find('#timelinecontainer')[0]
            this.timeline = new vis.Timeline(container, this.timelineDataView, this.timelineGroups, this.timelineOptions);
        }
        return CellMonitor;
    });