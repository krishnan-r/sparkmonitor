
default export class TaskChart {
    constructor(cellmonitor) {

    }

    create() {

    }

    addData(time, numTasks) {

    }

    addExecutorData(time, numCores) {

    }

    hide() {

    }

    registerRefresher() {

    }

    refreshTaskChart() {

    }

    clearRefresher() {

    }

    addJobData(jobId, time, event) {

    }

    onSparkJobStart (data) {
        this.addJobData(data.jobId, new Date(data.submissionTime), "started");
        this.addExecutorData(data.submissionTime, data.totalCores);
    }
    
    /** Called when a Spark job ends. */
    onSparkJobEnd(data) {
        this.addJobData(data.jobId, new Date(data.completionTime), "ended");
    }
    
    /** Called when a Spark task is started. */
    onSparkTaskStart(data) {
        this.addData(data.launchTime, this.numActiveTasks);
        this.numActiveTasks += 1;
        this.addData(data.launchTime, this.numActiveTasks);
    }
    
    /** Called when a Spark task is ended. */
    onSparkTaskEnd (data) {
        this.addData(data.finishTime, this.numActiveTasks);
        this.numActiveTasks -= 1;
        this.addData(data.finishTime, this.numActiveTasks);
    }

}