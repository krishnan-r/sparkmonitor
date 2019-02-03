import currentcell from "./currentcell";

let Jupyter = require("base/js/namespace");
let events = require("base/js/events");
let $ = require('jquery');

import ReactDOM from 'react-dom';
import React from 'react';
import * as redux from "redux";
import { Provider } from 'react-redux';
import CellMonitor from '../core/CellMonitor';
import rootReducer from "./reducers";
import { SparkEventAction } from "./actions";

let comm: any;
let store: any;

function startComm() {
  if (comm) comm.close();
  console.log("SparkMonitor: Starting Comm with kernel.");
  if (Jupyter.notebook.kernel) {
    comm = Jupyter.notebook.kernel.comm_manager.new_comm("SparkMonitor", {
      msgtype: "openfromfrontend"
    });
    // Register a message handler
    comm.on_msg(handle_comm_message);
    comm.on_close((msg: any) => {
      console.log("SparkMonitor: Comm Close Message:", msg);
    });
  } else {
    console.log("SparkMonitor: No communication established, kernel null");
  }
}

function handle_comm_message(msg: any) {
  if (!msg.content.data.msgtype) {
    console.warn("SparkMonitor: Unknown message");
  }
  if (msg.content.data.msgtype == "fromscala") {
    let data = JSON.parse(msg.content.data.msg);
    //console.log(data);
    let cell = currentcell.getRunningCell();

    if (cell == null) {
      console.error("SparkMonitor: Event with no running cell.");
      return;
    } else {
      data.cell_id = cell.cell_id;
    }

    store.dispatch(SparkEventAction(data.msgtype, data));
    if (data.msgtype == "sparkJobStart") {
      console.log("SparkMonitor: Job start at cell: ", cell.cell_id, data);
    }
  }
}

export function createStore() {
  store = redux.createStore(
    rootReducer,
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
    (window as any).__REDUX_DEVTOOLS_EXTENSION__()
  );
}

function register_cell_events() {
  //Removing display when output area is cleared
  events.on('clear_output.CodeCell', function (event: any, data: any) {
    store.dispatch({
      type: "CELL_OUTPUT_CLEARED",
      cell_id: data.cell.cell_id
    })
  });

  events.on('execute.CodeCell', function (event: any, data: any) {

    store.dispatch({
      type: "CELL_EXECUTED",
      cell_id: data.cell.cell_id
    })
    let element = data.cell.element.find('.SparkMonitor');

    if (element.length) {
      ReactDOM.unmountComponentAtNode(element[0]);

    } else {
      element = $('<div class="SparkMonitor"/>');
      data.cell.element.find('.inner_cell').append(element);
    }
    ReactDOM.render(<Provider store={store}><CellMonitor cell_id={data.cell.cell_id}></CellMonitor></Provider>, element[0]);

  });

}

export function load_ipython_extension() {
  console.log("SparkMonitor: Loading front-end extension.");
  currentcell.register();
  // Create the toolbar button
  var action = {
    icon: "fa-tasks",
    help: "Toggle Spark Monitoring Displays",
    help_index: "zz", // Sorting Order in keyboard shortcut dialog
    handler: () => { }
  };
  var full_action_name = Jupyter.actions.register(
    action,
    "toggle-spark-monitoring",
    "SparkMonitor"
  );
  Jupyter.toolbar.add_buttons_group([full_action_name]);

  startComm(); //Fixes Reloading the browser
  events.on("kernel_connected.Kernel", () => {
    startComm();
  }); //Fixes Restarting the Kernel

  createStore();
  register_cell_events();
}
