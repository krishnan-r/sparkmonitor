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
            'alldata': applicationEnd.toString()
        })

    def onJobEnd(self, jobEnd):
        self.jobEnd = jobEnd
        self.monitor.send({
            'msgtype': 'sparkJobEnd',
            'alldata': jobEnd.toString(),
            'completionTime': jobEnd.time(),
            'jobId': jobEnd.jobId()
        })

    def onJobStart(self, jobStart):
        self.jobStart = jobStart  # For debugging
        logger.info(jobStart.toString())
        self.monitor.send({
            'msgtype': 'sparkJobStart',
            'alldata': jobStart.toString(),
            'submissionTime': jobStart.time(),
            'name': jobStart.properties()[u'callSite.short'],
            'jobId': jobStart.jobId()
        })

    def onStageCompleted(self, stageCompleted):
        try:
            self.stageCompleted = stageCompleted
            self.monitor.send({
                'msgtype': 'sparkStageCompleted',
                'alldata': stageCompleted.toString(),
                'name': stageCompleted.stageInfo().name(),
                'details': stageCompleted.stageInfo().details(),
                'completionTime': stageCompleted.stageInfo().completionTime().get(),
                'stageId': stageCompleted.stageInfo().stageId()
            })
        except Exception as e:
            logger.info(e)

    def onStageSubmitted(self, stageSubmitted):
        try:
             
            self.stageSubmitted = stageSubmitted
            # if (stageSubmitted.stageInfo().completionTime().isEmpty()):
            #     status:'skipped'
            # else:
            #     st=stageSubmitted.stageInfo().submissionTime().get()
            #     status:'running'
            self.monitor.send({
                'msgtype': 'sparkStageSubmitted',
                'alldata': stageSubmitted.toString(),
                'name': stageSubmitted.stageInfo().name(),
                'details': stageSubmitted.stageInfo().details(),
                'submissionTime': stageSubmitted.stageInfo().submissionTime().get(),
                'stageId': stageSubmitted.stageInfo().stageId()
            })
        except Exception as e:
            logger.info('Exception in StageSubmitted: %s ',e)

    def onTaskStart(self, taskStart):
        self.taskStart = taskStart
        logger.info(taskStart.toString())
        self.monitor.send({
            'msgtype': 'sparkTaskStart',
            'alldata': taskStart.toString(),
            'launchTime': taskStart.taskInfo().launchTime(),
            'host': taskStart.taskInfo().host(),
            'executorId': taskStart.taskInfo().executorId(),
            'taskId': taskStart.taskInfo().taskId(),
            'stageId': taskStart.stageId(),
            'stageAttemptId': taskStart.stageAttemptId(),
            'status': taskStart.taskInfo().status()
        })

    def onTaskEnd(self, taskEnd):
        self.taskEnd = taskEnd
        self.monitor.send({
            'msgtype': 'sparkTaskEnd',
            'alldata': taskEnd.toString(),
            'finishTime': taskEnd.taskInfo().finishTime(),
            'host': taskEnd.taskInfo().host(),
            'executorId': taskEnd.taskInfo().executorId(),
            'taskId': taskEnd.taskInfo().taskId(),
            'status': taskEnd.taskInfo().status(),
            'taskType': taskEnd.taskType(),
            'stageId': taskEnd.stageId(),
            'stageAttemptId': taskEnd.stageAttemptId()
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
