from .listener import SparkListener
import logging


class MonitorSparkListener(SparkListener):
    def __init__(self, monitor):
        self.monitor = monitor
        self.isRegistered = False
        global logger
        logger = logging.getLogger('sparkmonitor.monitorlistener')

    def onApplicationEnd(self, applicationEnd):
        self.applicationEnd = applicationEnd
        self.monitor.send({
            'msgtype': 'sparkApplicationEnd',
            'data': applicationEnd.toString()
        })

    def onJobEnd(self, jobEnd):
        self.jobEnd = jobEnd
        self.monitor.send({
            'msgtype': 'sparkJobEnd',
            'data': jobEnd.toString()
        })

    def onJobStart(self, jobStart):
        self.jobStart = jobStart  # For debugging
        logger.info(jobStart.toString())
        self.monitor.send({
            'msgtype': 'sparkJobStart',
            'data': jobStart.toString()
        })

    def onStageCompleted(self, stageCompleted):
        self.stageCompleted = stageCompleted
        self.monitor.send({
            'msgtype': 'sparkStageCompleted',
            'data': stageCompleted.toString()
        })

    def onStageSubmitted(self, stageSubmitted):
        self.stageSubmitted = stageSubmitted
        self.monitor.send({
            'msgtype': 'sparkStageSubmitted',
            'data': stageSubmitted.toString()
        })

    def onTaskStart(self, taskStart):
        self.taskStart = taskStart
        self.monitor.send({
            'msgtype': 'sparkTaskStart',
            'data': taskStart.toString()
        })

    def onTaskEnd(self, taskEnd):
        self.taskEnd = taskEnd
        self.monitor.send({
            'msgtype': 'sparkTaskEnd',
            'data': taskEnd.toString()
        })

    def register(self, sc):
        logger.info('Registerning listener with spark...')
        if(not self.isRegistered):
            sc._gateway.start_callback_server()
            sc._jsc.sc().addSparkListener(self)
            self.isRegistered = True
            self.monitor.send({'msgtype': 'listenerregistered'})
        else:
            logger.error(
                'SparkMonitor: In MonitorSparkListener Already registered listener, so skipping')
