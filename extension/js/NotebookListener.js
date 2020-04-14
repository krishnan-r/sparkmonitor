import { NotebookActions } from '@jupyterlab/notebook';
import { PromiseDelegate } from '@phosphor/coreutils';

export default class NotebookListener {
    constructor(notebookPanel) {
        this.isReady = new PromiseDelegate();
        this.activeCell = null;
        this.notebookPanel = notebookPanel;
        this.cellReexecuted = false;
        this.init();
    }

    async init() {
        await this.notebookPanel.revealed;
        this.notebook = this.notebookPanel.content;
        this.listen();
        this.isReady.resolve(undefined);
    }

    ready() {
        return this.isReady.promise;
    }

    getActiveCell() {
        return this.activeCell;
    }

    listen() {
        // get the active cell based on where the user is editing
        this.notebook.activeCellChanged.connect((_, cell) => {
            this.activeCell = cell;
        });

        // set the active cell based on the cell executed
        NotebookActions.executed.connect((_, args) => {
            // can get execution signals from other notebooks
            if (args.notebook.id === this.notebook.id) {
                const cell = args.cell;

                this.cellReexecuted = cell === this.activeCell;
                this.activeCell = cell;
            }
        });
    }
}
