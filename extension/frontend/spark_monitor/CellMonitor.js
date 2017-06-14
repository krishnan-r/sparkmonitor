define(['base/js/namespace', './misc', 'require', 'base/js/events', 'jquery', './vis.min'],
    function (Jupyter, misc, require, events, $, vis) {

        var widgetHTML;
        //console.log('SparkMonitor: Loading CSS from', require.toUrl('./styles.css'));
        misc.loadCSS(require.toUrl('./vis.min.css'));
        misc.loadCSS(require.toUrl('./styles.css'));
        //console.log('SparkMonitor: Loading HTML from', require.toUrl('./monitor.html'));
        misc.loadHTML(require.toUrl('./cellmonitor.html'), function (data) {
            widgetHTML = data
            //console.log('SparkMonitor: Finished Loading HTML from', require.toUrl('./monitor.html'), { 'html': data });
        });

        function CellMonitor(monitor, cell, data, timelineGroups) {
            var that = this;
            this.monitor = monitor;
            this.cell = cell
            this.jobs = [];
            this.alldata = data;

            this.timelineDataView = new vis.DataView(data, {
                filter: function (item) {
                    return (item.cell_id == cell.cell_id);
                },
                fields: ['id', 'start', 'end', 'content', 'group', 'title', 'type', 'className']
            });

            this.timelineOptions = {
                rollingMode: {
                    follow: false,
                    offset: 0.75
                },
                margin: {
                    item: 2,
                    axis: 2,

                },
                stack: true,
                showTooltips: true,
                maxHeight: '250px',
                minHeight: '70px',
                zoomMax: 10800000,
                zoomMin: 2000,
                editable: false,
                tooltip: {
                    overflowMethod: 'cap',
                },
                align: 'center',
                orientation: 'top'

            };
            this.timelineGroups = timelineGroups;
            this.timeline = {};


        }

        CellMonitor.prototype.createDisplay = function () {
            this.html = widgetHTML
            var that = this;

            if (!this.cell.element.find('.CellMonitor').length) {
                var element = $(this.html).hide();
                this.displayElement = element;
                this.cell.element.find('.inner_cell').append(element);
                element.slideToggle();
                element.find('.titlecollapse').click(function () {
                    that.cell.element.find('.content').slideToggle({ queue: false });
                    that.cell.element.find('.headericon').toggleClass('headericoncollapsed');
                    that.timeline.redraw();
                });
                element.find('.cancel').click(function () {
                    console.log('Stopping Jobs');
                    Jupyter.notebook.kernel.interrupt();
                    that.monitor.send({
                        msgtype: 'sparkStopJobs',
                    });
                });
                this.createTimeline()
            }

        }

        CellMonitor.prototype.onStopJobs = function () {

        }
        CellMonitor.prototype.resizeTimeline = function () {
            try {
                var range = this.timeline.getItemRange()
                if (!range.min) range.min = new Date;
                if (!range.max) range.max = -1;
                var offset = range.max - range.min;
                this.timeline.setWindow(range.min - offset, range.max + offset*2, { animation: true });
            }
            catch (err) {
                console.log("SparkMonitor: Error resizing timeline:", err);
            }


        }

        CellMonitor.prototype.createTimeline = function () {
            var container = this.cell.element.find('.timelinecontainer')[0]
            this.timeline = new vis.Timeline(container, this.timelineDataView, this.timelineGroups, this.timelineOptions);
        }
        return CellMonitor;
    });