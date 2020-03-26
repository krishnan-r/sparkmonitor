
import timeline from './Timeline';


// the work here is the same as Timeline in that
// we need to see how to move the jquery stuff
// into proper widgets for jupyterlab
// probably the easiest way is to strip some features
// and get a basic widget working first
// time estimate: 3 days
export default class CellMonitor {
    constructor(monitor, cell) {
        this.monitor = monitor;
        this.cell = cell;
        this.view = "jobs";
        this.lastView = "jobs";

        // listen to event for current cell finished

        // create a timeline and taskchart view
        // Timeline and TaskChart module instances
        this.timeline = null;
        this.taskchart = null;

        // Only if the load successfully create these views.
        if (Timeline) this.timeline = new Timeline(this);
        if (TaskChart) this.taskchart = new TaskChart(this);

    }

    createDisplay() {
        // if a cell monitor does not already exist
        // then:
        // create the display (this should be a component)

    }

    removeDisplay() {
        
    }

    showView(view) {
        // shows either jobs, tasks, or timeline
    }

    hideView(view) {
        //hides the given view
    }

    onCellExecutionCompleted() {
        // set class variables
        onAllCompleted();
    }

    onAllCompleted() {

    }

    //------------Job Table Functions
    createJobTable() {
        // creating a table 
        // is there a better way than to append jquery style?
    }

    createStageItem() {

    }
    
    updateStageItem(element, data, redraw=false) {

    }

    createJobItem() {

    }

    updateJobItem() {

    }

    updateJobTable() {

    }

    //---------Data Handling Functions
    onSparkJobStart(data) {

    }

    onSparkJobEnd(data) {

    }

    onSparkStageSubmitted(data) {

    }

    onSparkStageCompleted(data) {

    }

    onSparkTaskStart(data) {

    }

    onSparkTaskEnd(data) {

    }

}