/**
 * Definitions for the SparkMonitor singleton object.
 * @module SparkMonitor
 */

import CellMonitor from './CellMonitor'; // CellMonitor object constructor
import NotebookListener from './NotebookListener'; // Module to detect currently running cell
import { v4 as uuidv4 } from 'uuid';

export default class SparkMonitor {
    /**
     * SparkMonitor is the main singleton class that is responsible for managing CellMonitor instances for cells that run spark jobs.
     * It also delegates spark lifecycle events from the backend to corresponding CellMonitor.
     * @constructor
     * @param {NotebookPanel} nbPanel - The Jupyter NotebookPanel instance
     *
     */
    constructor(nbPanel) {
        this.nbPanel = nbPanel;
        // create our notebook listener
        this.listener = new NotebookListener(nbPanel);
        /** Dictionary of CellMonitor objects with id as keys. */
        this.cellmonitors = {};
        /** Communication object with the kernel. */
        this.comm = null;

        // Fixes Reloading the browser
        this.startComm(nbPanel.session.kernel);
        // Fixes Restarting the Kernel
        this.nbPanel.session.kernel.statusChanged.connect((_, status) => {
            if (status === 'starting') {
                this.nbPanel.session.kernel.ready.then(() => {
                    this.startComm(this.nbPanel.session.kernel);
                });
            }
        });

        /** Data mapping jobs to cells for delegating further lifecycle events of a job. */
        this.data = {};
        this.appName = 'NULL';
        this.appId = 'NULL';
        this.app = 'NULL';
        this.totalCores = 0;
        this.numExecutors = 0;

        this.display_mode = 'shown'; // "shown" || "hidden"

        // listen for cell removed
        this.nbPanel.content.model.cells.changed.connect((_, data) => {
            if (data.type === 'remove') {
                const cellmonitor = this.getCellMonitor(data.cell.id);
                if (cellmonitor) {
                    cellmonitor.removeDisplay();
                    this.stopCellMonitor(data.cell.id);
                }
            }
        });

        // this.createButtons();
    }

    /**
     * Returns the CellMonitor given a id
     * @param {string} id - The Jupyter id
     * @return {CellMonitor} The CellMonitor object for the cell
     */
    getCellMonitor(id) {
        return this.cellmonitors[id];
    }

    /**
     * Start a CellMonitor for a cell.
     * @param {CodeCell} cell - The Jupyter CodeCell instance
     * @return {CellMonitor} The CellMonitor object for the cell
     */
    startCellMonitor(cell) {
        if (this.cellmonitors[cell.id] !== undefined) {
            this.cellmonitors[cell.id].removeDisplay();
        }
        if (this.listener.cellReexecuted) {
            this.cellExecutedAgain(cell);
        }
        this.cellmonitors[cell.id] = new CellMonitor(this, cell);
        this.display_mode = 'shown';
        return this.cellmonitors[cell.id];
    }

    /**
     * Callback called when a cell is executed again.
     * @param {CodeCell} cell - The Jupyter CodeCell instance.
     */
    cellExecutedAgain(cell) {
        this.stopCellMonitor(cell.id);
    }

    /**
     * Stop the CellMonitor for a cell.
     * @param {CodeCell} cell - The Jupyter CodeCell instance
     */
    stopCellMonitor(id) {
        if (this.cellmonitors[id] !== null) {
            this.cellmonitors[id].removeDisplay();
            this.cellmonitors[id] = null;
            delete this.cellmonitors[id];
        }
    }

    /** Adds a button to the toolbar for toggling all monitoring dispalys. */
    static createButtons() {
        // let that = this;
        // let handler () {
        // 	that.toggleAll();
        // };
        // let action = {
        // 	icon: 'fa-tasks', // a font-awesome class used on buttons, etc
        // 	help: 'Toggle Spark Monitoring Displays',
        // 	help_index: 'zz', // Sorting Order in keyboard shortcut dialog
        // 	handler: handler
        // };
        // let prefix = 'SparkMonitor';
        // let action_name = 'toggle-spark-monitoring';
        // let full_action_name = Jupyter.actions.register(action, action_name, prefix); // returns 'my_extension:show-alert'
        // Jupyter.toolbar.add_buttons_group([full_action_name]);
    }

    // -----Functions to show/hide all displays
    /** Toggle all displays. */
    toggleAll() {
        if (this.display_mode === 'hidden') this.showAll();
        else if (this.display_mode === 'shown') this.hideAll();
    }

    /** Show all displays. */
    showAll() {
        Object.keys(this.cellmonitors).forEach(id => {
            if (
                Object.prototype.hasOwnProperty.call(this.cellmonitors, id) &&
                this.cellmonitors[id].displayVisible === false
            ) {
                this.cellmonitors[id].createDisplay();
            }
        });
        this.display_mode = 'shown';
    }

    /** Hide all displays. */
    hideAll() {
        Object.keys(this.cellmonitors).forEach(id => {
            if (
                Object.prototype.hasOwnProperty.call(this.cellmonitors, id) &&
                this.cellmonitors[id].displayVisible === true
            ) {
                this.cellmonitors[id].removeDisplay();
            }
        });
        this.display_mode = 'hidden';
    }

    // ------Functions to communicate with kernel

    /**
     * Called when comm to kernel is closed.
     * @param {Object} msg - The JSON parsed close message object.
     */
    static onCommClose(msg) {
        console.log('SparkMonitor: Comm Close Message:', msg);
    }

    /**
     * Starts communication with the kernel.
     * Closes any existing communication.
     * @param {IKernelConnection} kernel - The current kernel instance
     */
    startComm(kernel) {
        console.log('SparkMonitor: Starting Comm with kernel.');
        this.listener.ready().then(() => {
            this.comm = kernel.connectToComm('SparkMonitor');
            this.comm.open({ msgtype: 'openfromfrontend' });
            this.comm.onMsg = message => {
                this.handleMessage(message);
            };
            this.comm.onClose = message => {
                this.onCommClose(message);
            };
            console.log('SparkMonitor: Connection with comms established');
        });
    }

    /**
     * Send a message to the kernel.
     * @param {Object} msg - The message object.
     */
    send(msg) {
        this.comm.send(msg);
    }

    // ------------Message Handling Functions that update the data and delegate to corresponding cell monitors--------------------------------

    /**
     * Called when a Spark job is started.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkJobStart(data) {
        const cell = this.listener.getActiveCell();
        if (cell.id === '') {
            cell.id = uuidv4();
        }

        if (cell === null) {
            console.error('SparkMonitor: Job started with no running cell.');
            return;
        }
        console.log(`SparkMonitor: Job Start at cell: ${cell.id} ${data}`);

        let cellmonitor = this.getCellMonitor(cell.id);
        if (!cellmonitor) {
            cellmonitor = this.startCellMonitor(cell);
        }
        this.data[`app${this.app}job${data.jobId}`] = {
            cell_id: cell.id,
        };

        // These values are set here as previous messages may be missed if reconnecting from a browser reload.
        this.totalCores = data.totalCores;
        this.numExecutors = data.numExecutors;

        if (cellmonitor) cellmonitor.onSparkJobStart(data);
    }

    /**
     * Called when a Spark job is ended.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkJobEnd(data) {
        const id = this.data[`app${this.app}job${data.jobId}`].cell_id;
        if (id) {
            console.log('SparkMonitor: Job End at cell: ', id, data);
            const cellmonitor = this.getCellMonitor(id);
            if (cellmonitor) cellmonitor.onSparkJobEnd(data);
        } else console.error('SparkMonitor:ERROR no cellID for job');
    }

    /**
     * Called when a Spark stage is submitted.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkStageSubmitted(data) {
        console.log('SparkMonitor:Stage Submitted', data);
        const cell = this.listener.getActiveCell();

        if (cell === null) {
            console.error('SparkMonitor: Stage started with no running cell.');
            return;
        }
        this.data[`app${this.app}stage${data.stageId}`] = {
            cell_id: cell.id,
        };
        const cellmonitor = this.getCellMonitor(cell.id);
        if (cellmonitor) cellmonitor.onSparkStageSubmitted(data);
    }

    /**
     * Called when a Spark stage is completed.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkStageCompleted(data) {
        console.log('SparkMonitor:Stage Completed', data);
        const id = this.data[`app${this.app}stage${data.stageId}`].cell_id;
        if (id) {
            const cellmonitor = this.cellmonitors[id];
            if (cellmonitor) cellmonitor.onSparkStageCompleted(data);
        } else console.error('SparkMonitor:ERROR no cellId for completed stage');
    }

    /**
     * Called when a Spark task is started.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkTaskStart(data) {
        const id = this.data[`app${this.app}stage${data.stageId}`].cell_id;
        if (id) {
            const cellmonitor = this.getCellMonitor(id);
            if (cellmonitor) cellmonitor.onSparkTaskStart(data);
        } else console.error('SparkMonitor:ERROR no cellID for task start');
    }

    /**
     * Called when a Spark task is ended.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkTaskEnd(data) {
        const id = this.data[`app${this.app}stage${data.stageId}`].cell_id;
        if (id) {
            const cellmonitor = this.getCellMonitor(id);
            if (cellmonitor) cellmonitor.onSparkTaskEnd(data);
        } else console.error('SparkMonitor:ERROR no cellID for task end');
    }

    /**
     * Called when a Spark Application is ended.
     * @param {Object} data - The data from the spark listener event.
     */

    static onSparkApplicationEnd(data) {
        // Nothing to do here.
        console.log(`SparkMonitor: Spark App ended: ${data}`);
    }

    /**
     * Called when a Spark Application is started.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkApplicationStart(data) {
        this.appId = data.appId;
        this.appName = data.appName;
        this.appAttemptId = data.appAttemptId;
        this.app = `${this.appId}_${this.appAttemptId}`;
    }

    /**
     * Called when an executor is added.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkExecutorAdded(data) {
        this.totalCores = data.totalCores;
        this.numExecutors += 1;
        const cell = this.listener.getActiveCell();
        if (cell !== null) {
            const cellmonitor = this.getCellMonitor(cell.id);
            if (cellmonitor) cellmonitor.onSparkExecutorAdded(data);
        }
    }

    /**
     * Called when a Spark executor is removed.
     * @param {Object} data - The data from the spark listener event.
     */
    onSparkExecutorRemoved(data) {
        this.totalCores = data.totalCores;
        this.numExecutors -= 1;
        const cell = this.listener.getActiveCell();
        if (cell !== null) {
            const cellmonitor = this.getCellMonitor(cell.id);
            if (cellmonitor) cellmonitor.onSparkExecutorRemoved(data);
        }
    }

    /**
     * Delegates a received message to corresponding function.
     *
     * @param {Object} msg - The JSON parsed message object.
     */
    handleMessage(msg) {
        if (!msg.content.data.msgtype) {
            console.warn('SparkMonitor: Unknown message');
        }
        if (msg.content.data.msgtype === 'fromscala') {
            const data = JSON.parse(msg.content.data.msg);
            switch (data.msgtype) {
                case 'sparkJobStart':
                    this.onSparkJobStart(data);
                    break;
                case 'sparkJobEnd':
                    this.onSparkJobEnd(data);
                    break;
                case 'sparkStageSubmitted':
                    this.onSparkStageSubmitted(data);
                    break;
                case 'sparkStageCompleted':
                    this.onSparkStageCompleted(data);
                    break;
                case 'sparkTaskStart':
                    this.onSparkTaskStart(data);
                    break;
                case 'sparkTaskEnd':
                    this.onSparkTaskEnd(data);
                    break;
                case 'sparkApplicationStart':
                    this.onSparkApplicationStart(data);
                    break;
                case 'sparkApplicationEnd':
                    this.onSparkApplicationEnd(data);
                    break;
                case 'sparkExecutorAdded':
                    this.onSparkExecutorAdded(data);
                    break;
                case 'sparkExecutorRemoved':
                    this.onSparkExecutorRemoved(data);
                    break;
                default:
                    break;
            }
        }
    }
}
