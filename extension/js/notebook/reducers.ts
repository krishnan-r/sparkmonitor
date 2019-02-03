import { } from "./actions";
import { List, Map, fromJS } from "immutable";
import { combineReducers } from "redux";

let initialState = fromJS({
  jobs: [],
  stages: [],
  apps: [],
  tasks: []
});

function spark(state = initialState, action: any) {
  let { type, data } = action;
  switch (type) {
    case "sparkJobStart":
      state = state.updateIn(["jobs"], (jobs: any) => jobs.push(data));
      break;

    case "sparkJobEnd":
      break;

    case "sparkStageSubmitted":
      break;
    case "sparkStageCompleted":
      break;
    case "sparkTaskStart":
      break;
    case "sparkTaskEnd":
      break;
    case "sparkApplicationStart":
      break;
    case "sparkApplicationEnd":
      break;
    case "sparkExecutorAdded":
      break;
    case "sparkExecutorRemoved":
      break;
    case "CELL_OUTPUT_CLEARED":
      state = state.updateIn(["jobs"], (jobs: any) => jobs.filter((job: any) => job.cell_id != action.cell_id));
      break;
    default:
      return state;
  }
  return state;
}

export default combineReducers({
  spark
});
