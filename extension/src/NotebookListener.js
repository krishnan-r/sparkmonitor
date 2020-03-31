import { NotebookActions } from '@jupyterlab/notebook';
import { PromiseDelegate } from "@phosphor/coreutils";

export class NotebookListener {

    constructor(notebookPanel) {
        this._ready = new PromiseDelegate();
        this.activeCell = null;
        this._notebookPanel = notebookPanel;
        this.init();
    }

    async init() {
        await this._notebookPanel.revealed;
        this._notebook = this._notebookPanel.content;
        console.log("Notebook panel", this._notebookPanel);
        console.log("Notebook", this._notebook);
        this.listen();
        this._ready.resolve(undefined);
    }

    ready() {
        return this._ready.promise;
    }

    getActiveCell() {
        return this.activeCell;
    }

    // We need to be able to get the currently running cell
    listen() {
        this._notebook.model.cells.changed.connect(
            (sender, data) => {
            // to avoid duplicates during load wait til load is complete
            //if (!this.verNotebook.ready) return;

            var newIndex = data.newIndex;
            var newValues = data.newValues;
            var oldIndex = data.oldIndex;
            var oldValues = data.oldValues;
            console.log(data);
            switch (data.type) {
                case "add":
                // this._addNewCells(newIndex, newValues);
                break;
                case "remove":
                // this._removeCells(oldIndex, oldValues);
                break;
                case "move":
                // this._cellsMoved(oldIndex, newIndex, newValues);
                break;
                case "set":
                // this._cellTypeChanged(oldIndex, newIndex, oldValues);
                break;
                default:
                log("cell list changed!!!!", sender, data);
                break;
            }
            }
        );

        this._notebook.activeCellChanged.connect((_, cell) => {
            //this.focusCell(cell);
        });

        NotebookActions.executed.connect((_, args) => {
            // can get execution signals from other notebooks
            if (args.notebook.id === this._notebook.id) {
                const cell = args.cell;
                this.activeCell = cell;
            }
        });
    }
}