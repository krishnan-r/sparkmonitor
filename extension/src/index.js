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

        notebooks.widgetAdded.connect(( sender, nbPanel ) => {
            let monitor = new SparkMonitor(nbPanel);
            console.log('Notebook added!');
            const session = nbPanel.session;
            session.ready.then(() =>  {
                console.log("Notebook session ready");
                let kernel = session.kernel;
                kernel.ready.then(() => {
                    console.log("Notebook kernel ready");
                    monitor.startComm(kernel, app);
                })
            })
        });

        //window.sm = monitor;
        
    },
};

export default extension;
