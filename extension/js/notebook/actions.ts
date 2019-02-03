// export interface AppData {
//   id: string;
//   name: string;
//   userName: string;
//   numCores: number;
//   start: Date;
//   numExecutors: number;
//   numActiveJobs: number;
//   numFailedJobs: number;
//   numCompletedJobs: number;
// }

// export interface JobData {
//   id: string;
//   cell_id: string;
//   app_id: string;
//   start: Date;
//   end?: Date;
//   name: string;
//   status: string;
//   numTasks: number;
//   numActiveTasks: number;
//   numCompletedTasks: number;
//   numFailedTasks: number;
//   numStages: number;
//   numActiveStages: number;
//   numCompletedStages: number;
//   numFailedStages: number;
//   numSkippedStages: number;
//   stageIds: [number];
// }

// export interface StageData {
//   id: string;
//   status: string;
//   jobId: string;
//   name: string;
//   numTasks: string;
//   numActiveTasks: number;
//   numCompletedTasks: number;
//   numFailedTasks: number;
// }

// export interface TaskData {
//   id: string;
//   status: string;
//   jobId: string;
//   name: string;
//   numTasks: string;
//   numActiveTasks: number;
//   numCompletedTasks: number;
//   numFailedTasks: number;
// }

type SparkEvent =
  | "sparkJobStart"
  | "sparkJobEnd"
  | "sparkStageSubmitted"
  | "sparkStageCompleted"
  | "sparkTaskStart"
  | "sparkTaskEnd"
  | "sparkApplicationStart"
  | "sparkApplicationEnd"
  | "sparkExecutorAdded"
  | "sparkExecutorRemoved";

export function SparkEventAction(event: SparkEvent, data: any) {
    console.log("event",event);
  return {
    type: event,
    data
  };
}
