/**
 * Definitions for the SparkMonitor singleton object.
 * @module SparkMonitor
 */

import { KernelMessage, Kernel } from '@jupyterlab/services';

// luckily the majority of this code is logic
// but we need to figure out communicating with the kernel
// time estimate: 3 days
export default class SparkMonitor {
    
    constructor() {
    
        console.log("Made it to constructor");

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



    startComm(kernel, app) {
        this.comm = kernel.connectToComm('SparkMonitor');
        this.comm.onMsg = this.onCommMessage;
        this.comm.onClose = this.onCommClose;
        console.log('SparkMonitor: Conenction with comms established');
    };

    onCommMessage(message) {
        // handle the right event based on what kernel tells us
        this.handleMessage(message);
    }

    onCommClose(message) {
        console.log(`SparkMonitor: Comm close message: ${message}`);
    }

    sendComm(message) {
        this.comm.send(message);
    }

    // ------- Messaging handling functions

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

    onSparkApplicationStart(data) {
        this.appId = data.appId;
        this.appName = data.appName;
        this.appAttemptId = data.appAttemptId;
        this.app = this.appId + '_' + this.appAttemptId;
    }

    onSparkExecutorAdded(data) {

    }

    onSparkExecutorRemoved(data) {

    }

    handleMessage(msg) {
        if (!msg.content.data.msgtype) {
            console.warn("SparkMonitor: Unknown message");
        }
        console.log(msg);
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
                    this.onSparkApplicationEnd(data);
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
}