/**
 * Definitions for the SparkMonitor singleton object.
 * @module SparkMonitor
 */

import { KernelMessage, Kernel } from '@jupyterlab/services';
import { NotebookListener } from './NotebookListener';
import CellMonitor from '../js/CellMonitor';

// luckily the majority of this code is logic
// but we need to figure out communicating with the kernel
// time estimate: 3 days
export default class SparkMonitor {
    
    constructor(nbPanel) {
    
        // create our notebook listener
        this.listener = new NotebookListener(nbPanel);

        // create a dictionary of cellmonitor objects (is this needed?)
        this.cellmonitors = {};

        // create comm object with kernel
        this.comm = null;
    
        // class information
        this.data = {};
        this.appName = "NULL";
        this.appId = "NULL";
        this.app = "NULL";
        this.totalCores = 0;
        this.numExecutors = 0;

        this.display_mode = "shown"; // "shown" || "hidden"
    
        // add an event listener for output area being cleared
    
        // create buttons
    
    }

    // add a button to toolbar to toggle all monitoring display
    createButtons() {
        // go through each cell monitor and either create or remove the display
    }


    getCellMonitor(id) {
        return this.cellmonitors[id];
    }

    startCellMonitor(cell) {
        // remove it if it already exists
        if (this.cellmonitors[cell.id] != null) {
            //this.cellmonitors[cell.id].removeDisplay();
        }

        // we have to account for when this is executed a second time

        this.cellmonitors[cell.id] = new CellMonitor(this, cell);
        this.display_mode = 'shown';

        return this.cellmonitors[cell.id];
    }

    stopCellMonitor(id) {
        if (this.cellmonitors[id] != null) {
            this.cellmonitors[id].removeDisplay();
            this.cellmonitors[id] = null;
            delete this.cellmonitors[id];
        }
    }

    startComm(kernel, app) {
        this.listener.ready().then(() => {
            this.comm = kernel.connectToComm('SparkMonitor');
            this.comm.open({'msgtype': 'openfromfrontend'});
            this.comm.onMsg = (message) => {
                this.handleMessage(message);
            };
            this.comm.onClose = (message) => {
                this.onCommClose(message);
            };
            console.log('SparkMonitor: Connection with comms established');
        })
    }

    handleMessage(msg) {
        if (!msg.content.data.msgtype) {
            console.warn("SparkMonitor: Unknown message");
        }
        //console.log(msg);
        if (msg.content.data.msgtype == "fromscala") {
            let data = JSON.parse(msg.content.data.msg);
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
                    break;
                case 'sparkExecutorAdded':
                    this.onSparkExecutorAdded(data);
                    break;
                case 'sparkExecutorRemoved':
                    this.onSparkExecutorRemoved(data);
                    break;
            }
        }
    }

    onCommClose(message) {
        console.log(`SparkMonitor: Comm close message: ${message}`);
    }

    sendComm(message) {
        this.comm.send(message);
    }

    // ------- Messaging handling functions

    onSparkJobStart(data) {
        // get the current running cell (i think there's an easy way to do this)
        let cell = this.listener.getActiveCell();

        if (cell == null) {
            console.error('SparkMonitor: Job Started with no running cell');
            return;
        }
        
        console.log(`SparkMonitor: Job Start at cell: ${cell.id} ${data}`)
        
        // start the cell monitor for the cell
        let cellMonitor = this.getCellMonitor(cell.id);
        if (!cellMonitor) {
            cellMonitor = this.startCellMonitor(cell);
        }

        this.data['app' + this.app + 'job' + data.jobId] = {
            cell_id: cell.id,
        }

        // set values again in case of a browser reload
        this.totalCores = data.totalCores;
        this.numExecutors = data.numExecutors;

        // run the cell monitor's event for this
        if (cellMonitor) cellMonitor.onSparkJobStart(data);

    }

    onSparkJobEnd(data) {
        let cell_id = this.data['app' + this.app + 'job' + data.jobId]['cell_id'];
        if (cell_id) {
            console.log('SparkMonitor: Job End at cell: ', cell_id, data);
            let cellmonitor = this.getCellMonitor(cell_id);
            if (cellmonitor) cellmonitor.onSparkJobEnd(data);

        }
        else console.error('SparkMonitor:ERROR no cellID for job');

    }

    onSparkStageSubmitted(data) {
        console.log('SparkMonitor:Stage Submitted', data);
        let cell = this.listener.getActiveCell();

        if (cell == null) {
            console.error('SparkMonitor: Stage started with no running cell.');
            return;
        }
        this.data['app' + this.app + 'stage' + data.stageId] = {
            cell_id: cell.id,
        };
        let cellmonitor = this.getCellMonitor(cell.id);
        if (cellmonitor) cellmonitor.onSparkStageSubmitted(data);
    }

    onSparkStageCompleted(data) {
        console.log('SparkMonitor:Stage Completed', data);
        let cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
        if (cell_id) {
            let cellmonitor = this.cellmonitors[cell_id]
            if (cellmonitor) cellmonitor.onSparkStageCompleted(data);
        }
        else console.error('SparkMonitor:ERROR no cellId for completed stage');
    }

    onSparkTaskStart(data) {
        let cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
        if (cell_id) {
            let cellmonitor = this.getCellMonitor(cell_id);
            if (cellmonitor) cellmonitor.onSparkTaskStart(data);

        }
        else console.error('SparkMonitor:ERROR no cellID for task start');
    }

    onSparkTaskEnd(data) {
        var cell_id = this.data['app' + this.app + 'stage' + data.stageId]['cell_id'];
        if (cell_id) {
            var cellmonitor = this.getCellMonitor(cell_id)
            if (cellmonitor) cellmonitor.onSparkTaskEnd(data);

        }
        else console.error('SparkMonitor:ERROR no cellID for task end');
    }

    onSparkApplicationStart(data) {
        this.appId = data.appId;
        this.appName = data.appName;
        this.appAttemptId = data.appAttemptId;
        this.app = this.appId + '_' + this.appAttemptId;
    }

    onSparkExecutorAdded(data) {
        this.totalCores = data.totalCores;
        this.numExecutors += 1;
        let cell = currentcell.getRunningCell()
        if (cell != null) {
            let cellmonitor = this.getCellMonitor(cell.cell_id);
            if (cellmonitor) cellmonitor.onSparkExecutorAdded(data);
        }
    }

    onSparkExecutorRemoved(data) {
        this.totalCores = data.totalCores;
        this.numExecutors -= 1;
        let cell = currentcell.getRunningCell()
        if (cell != null) {
            let cellmonitor = this.getCellMonitor(cell.cell_id);
            if (cellmonitor) cellmonitor.onSparkExecutorRemoved(data);
        }
    }

}