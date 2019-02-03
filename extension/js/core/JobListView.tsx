import React from "react";
import { connect } from 'react-redux'
import styled from "styled-components";
import { ProgressBar } from "./Components";

const StyledJobTable = styled.div`
  .tdstageicon {
    display: block;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAXUlEQVR4AWMAgVGwjkGKNA3/GT4wZDAwkqABDA8zaBKtAQp/MjQwsBGnAQGvMVgTpwEB/zFMZ+AjoAEDPmUIpKGGfwzTGPho5OmfDPUMbKREnAYpSSOdgZGSxDcKADdXTK1stp++AAAAAElFTkSuQmCC);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 100%;
    width: 15px;
    top: -2px;
    height: 24px;
    transition: transform 0.4s;
    transform: rotate(0deg);
  }

  .tdstageiconcollapsed {
    transform: rotate(90deg);
  }

  td.stagetableoffset {
    background-color: #e7e7e7;
  }

  th {
    font-size: small;
    background-color: #eeeeee;
    border: 0px;
  }

  td {
    background-color: white;
    border: 0;
    border-spacing: 0;
    font-size: small;
    border-top: 1px solid rgba(84, 84, 84, 0.08);
  }

  table {
    border-radius: 0px;
    border-spacing: 0;
    width: 100%;
    border: 1px solid #cfcfcf;
  }

  tr {
    border: 0px;
  }

  td,
  th {
    text-align: center;
    vertical-align: middle;
    height: 25px;
    line-height: 25px;
  }

  tr .tdstagebutton:hover ~ td,
  tr .tdstagebutton:hover {
    background-color: rgba(184, 223, 255, 0.37);
  }

  th.thbutton {
    width: 4%;
  }
  th.thjobid {
    width: 6%;
  }
  th.thjobname {
    width: 10%;
  }
  th.thjobstatus {
    width: 12%;
  }
  th.thjobtages {
    width: 10%;
  }
  th.thjobtasks {
    width: 28%;
  }
  th.thjobstart {
    width: 20%;
  }
  th.thjobtime {
    width: 10%;
  }
  th.thstageid {
    width: 8%;
  }
  th.thstagename {
    width: 10%;
  }
  th.thstagestatus {
    width: 17%;
  }
  th.thstagetasks {
    width: 33%;
  }
  th.thstagestart {
    width: 20%;
  }
  th.thstageduration {
    width: 12%;
  }
  .RUNNING {
    background-color: #42a5f5;
  }
  .FAILED {
    background-color: #db3636;
  }
  .COMPLETED {
    background-color: #20b520;
  }
  .PENDING {
    background-color: #9c27b0;
  }
  .SKIPPED {
    background-color: #616161;
  }

  .COMPLETED,
  .FAILED,
  .RUNNING,
  .PENDING,
  .SKIPPED {
    font-size: 75%;
    padding: 4px 8px;
    color: white;
    border-radius: 2px;
  }

  .stagetable tr th {
    background: rgb(235, 235, 235);
  }
`;

interface JobListOwnProps {
  cell_id: string;
}
interface JobListStateProps {
  job_ids: [string?];
}

class JobListView extends React.Component<any, any> {
  render() {
    return (
      <StyledJobTable>
        <table>
          <thead>
            <tr>
              <th className="thbutton" />
              <th className="thjobid">Job ID</th>
              <th className="thjobname">Job Name</th>
              <th className="thjobstatus">Status</th>
              <th className="thjobstages">Stages</th>
              <th className="thjobtasks">Tasks</th>
              <th className="thjobstart">Submission Time</th>
              <th className="thjobtime">Duration</th>
            </tr>
          </thead>

          <tbody className="jobtablebody">
            {this.props.job_ids.map((jobid: string) => <ConnectedJobItem id={jobid} />)}
          </tbody>
        </table>
      </StyledJobTable>
    );
  }
}

function mapJobListStateToProps(state: any, props: any): any {

  const jobs = state.spark.getIn(['jobs']).filter((job: any) => job.cell_id == props.cell_id);
  console.log("JOBS",jobs);
  const job_ids = jobs.map((job: any) => job.id);
  return {
    job_ids
  };

}

function mapJobListDispatchToProps(dispatch: any, props: any): any {
  return {};
}

const ConnectedJobListView = connect(mapJobListStateToProps, mapJobListDispatchToProps)(JobListView);
export default ConnectedJobListView;



interface JobItemOwnProps {
  id: string;
}

interface JobItemStateProps {
  name: string;
  status: string;
}

type JobItemProps = JobItemOwnProps & JobItemStateProps;

class JobItem extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      collapsed: false
    };
  }

  toggleStages() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  render() {
    return (
      <>
        <tr className="jobrow">
          <td className="tdstagebutton" onClick={() => { this.toggleStages(); }}>
            <span className={"tdstageicon " + (this.state.collapsed ? "tdstageiconcollapsed" : "")} />
          </td>
          <td className="tdjobid"> {this.props.id} </td>
          <td className="tdjobname"> {this.props.name}} </td>
          <td className="tdjobstatus"> {this.props.status} </td>
          <td className="tdjobstages" />
          <td> <ProgressBar val1="25%" val2="50%" /> </td>
          <td>Submission Time(TODO)</td>
          <td>Duration(TODO)</td>
        </tr>
        {this.state.collapsed && (
          <tr className="jobstagedatarow">
            <td className="stagetableoffset" />
            <td colSpan={7} className="stagedata">
              <StageList />
            </td>
          </tr>
        )}
      </>
    );
  }
}

function mapJobItemStateToProps(state: any, props: JobItemOwnProps): JobItemStateProps {

  let job = state.spark.getIn(['jobs']).find((job: any) => job.id == props.id);
  return {
    name: job.name,
    status: job.status
  };

}

function mapJobItemDispatchToProps(dispatch: any, props: JobItemOwnProps): any {
  return {};
}

const ConnectedJobItem = connect(mapJobItemStateToProps, mapJobItemDispatchToProps)(JobItem);



class StageList extends React.Component {
  render() {
    return (
      <>
        Stages:
        <StageItem />
        <StageItem />
        <StageItem />
      </>
    );
  }
}

class StageItem extends React.Component {
  render() {
    return (
      <>
        <br />
        Stage Item 1
      </>
    );
  }
}
