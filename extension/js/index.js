/**
 * Entrypoint module for the SparkMonitor frontend extension.
 *
 * @module module
 */

import SparkMonitor from './SparkMonitor';
import { INotebookTracker } from '@jupyterlab/notebook';

/** Entrypoint: Called when the extension is loaded by jupyter. */
const extension = {
    id: 'jupyterlab_sparkmonitor',
    autoStart: true,
    requires: [INotebookTracker],
    activate(app, notebooks) {
        console.log('JupyterLab SparkMonitor is activated!');
        notebooks.widgetAdded.connect((sender, nbPanel) => {
            console.log('Notebook added!');
            const session = nbPanel.session;
            session.ready.then(() => {
                console.log('Notebook session ready');
                const kernel = session.kernel;
                kernel.ready.then(() => {
                    const monitor = new SparkMonitor(nbPanel);
                    console.log('Notebook kernel ready');
                    monitor.startComm(kernel);
                });
            });
        });
    },
};

export default extension;
