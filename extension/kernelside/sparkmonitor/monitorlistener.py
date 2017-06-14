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
        })

    def onJobEnd(self, jobEnd):
        self.jobEnd = jobEnd
        self.monitor.send({
            'msgtype': 'sparkJobEnd',
            'completionTime': jobEnd.time(),
            'jobId': jobEnd.jobId()
        })

    def onJobStart(self, jobStart):
        self.jobStart = jobStart  # For debugging
        logger.info(jobStart.toString())
        self.monitor.send({
            'msgtype': 'sparkJobStart',
            'submissionTime': jobStart.time(),
            'name': jobStart.properties()[u'callSite.short'],
            'jobId': jobStart.jobId()
        })

    def onStageCompleted(self, stageCompleted):
        try:
            self.stageCompleted = stageCompleted
            self.monitor.send({
                'msgtype': 'sparkStageCompleted',
                'name': stageCompleted.stageInfo().name(),
                'details': stageCompleted.stageInfo().details(),
                'completionTime': stageCompleted.stageInfo().completionTime().get(),
                'stageId': stageCompleted.stageInfo().stageId(),
                'submissionTime': stageCompleted.stageInfo().submissionTime().get(),
                'name': stageCompleted.stageInfo().name(),
            })
        except Exception as e:
            logger.info('Exception in StageCompleted %s', e)

    def onStageSubmitted(self, stageSubmitted):
        try:

            self.stageSubmitted = stageSubmitted
            # if (stageSubmitted.stageInfo().completionTime().isEmpty()):
            #     status:'skipped'
            # else:
            #     st=stageSubmitted.stageInfo().submissionTime().get()
            #     status:'running'
            try:
                logger.info('Stage %s:', stageSubmitted.stageInfo().stageId())
            except Exception as e:
                logger.info('Exception in STAGEID: %s ', e)
            try:
                logger.info('CompletionTime %s',
                            stageSubmitted.stageInfo().completionTime().get())
            except Exception as e:
                logger.info('Exception in COMPLETIONTIME: %s ', e)
            try:
                logger.info(' SubmissionTime: %s',
                            stageSubmitted.stageInfo().submissionTime().get())
                logger.info('\n')
            except Exception as e:
                logger.info('Exception in SUBMISSIONTIME: %s ', e)

            self.monitor.send({
                'msgtype': 'sparkStageSubmitted',
                'name': stageSubmitted.stageInfo().name(),
                'submissionTime': stageSubmitted.stageInfo().submissionTime().get(),
                'stageId': stageSubmitted.stageInfo().stageId()
            })
        except Exception as e:
            logger.info('Exception in StageSubmitted: %s ', e)

    def onTaskStart(self, taskStart):
        self.taskStart = taskStart
       # logger.info(taskStart.toString())
        self.monitor.send({
            'msgtype': 'sparkTaskStart',
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
