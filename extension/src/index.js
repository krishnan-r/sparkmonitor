import SparkMonitor from './SparkMonitor'
// import currentcell from './currentcell'
import { JupyterLab } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { NotebookPanel } from '@jupyterlab/notebook';


const extension = {
    id: 'jupyterlab_sparkmonitor',
    autoStart: true,
    requires: [INotebookTracker],
    activate(app, notebooks) {
        console.log('JupyterLab SparkMonitor is activated!');

        var monitor = new SparkMonitor();
        notebooks.widgetAdded.connect(( sender, nbPanel ) => {
            console.log('Notebook added!');
            const session = nbPanel.session;
            session.ready.then(() =>  {
                console.log("Notebook session ready");
                let kernel = session.kernel;
                kernel.ready.then(() => {
                    console.log("Notebook kernel ready");
                    // Register comm
                    monitor.startComm(kernel, app);
                })
            })
        });

        window.sm = monitor;
        // currentcell.register();
        
    },
};

export default extension;
