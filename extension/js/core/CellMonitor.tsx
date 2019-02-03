import * as React from "react";
import styled from "styled-components";

import JobListView from "./JobListView";
// import TaskView from "./TaskView";
// import TimelineView from "./TimelineView";

import { Counter } from "./Components";
import { connect } from 'react-redux'

const StyledCellMonitor = styled.div`
  & {
    box-shadow: 0 0 2px 0px rgba(0, 0, 0, 0.4);
    background-color: #f7f7f7;
    margin: 5px 0px;
    font-family: sans-serif;
  }

  .title {
    background-color: #f37600;
    overflow: hidden;
    height: 30px;
  }

  .titleright {
    float: right;
    position: relative;
    height: 100%;
  }

  .titleleft {
    display: inline-block;
    height: 100%;
  }

  .tbitem {
    padding: 0px 15px;
    height: 30px;
    text-align: center;
    vertical-align: middle;
    display: table-cell;
  }

  .titlecollapse:hover {
    background-color: #c45917;
  }

  .headericon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAXUlEQVR4AWMAgVGwjkGKNA3/GT4wZDAwkqABDA8zaBKtAQp/MjQwsBGnAQGvMVgTpwEB/zFMZ+AjoAEDPmUIpKGGfwzTGPho5OmfDPUMbKREnAYpSSOdgZGSxDcKADdXTK1stp++AAAAAElFTkSuQmCC);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 100%;
    width: 15px;
    display: inline-block;
    top: -2px;
    height: 24px;
    vertical-align: middle;
    transition: transform 0.4s;
    transform: rotate(90deg);
  }

  .headericoncollapsed {
    transform: rotate(0deg);
  }
  .uibuttondisabled {
    color: #b2b2b2;
  }
  .cancel:active {
    font: larger;
  }

  .tabbuttonicon {
    display: inline-block;
    position: relative;
    top: -2px;
    width: 24px;
    height: 24px;
    vertical-align: middle;
  }

  .timelinetabbuttonicon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAALklEQVR4AWMYRuA/YTjYNdA/lLCJka6BvgDF4gY4uwFZhnQN9PcDIZp0DcMGAADGCJlpwLGAQAAAAABJRU5ErkJggg==);
  }

  .sparkuitabbuttonicon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAASklEQVR4AWMYnCCQ4SXDfyLgKwZ/sHq4csLwJVg9mIkfwNUNPg3/Bp+Gv4NPwx96aXhFdOJ7AtHgT2R6fcHgg9ViNIgGCGsY/AAAawWT4i3LWOwAAAAASUVORK5CYII=);
  }

  .taskviewtabbuttonicon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAQ0lEQVR4Ac3SsQ2AQAzF0LcgOrH/AuSWCHUa0pxQ7Pa7++ZyC/nhthRCNoZC9h4OMCXA9ACDg7+/tNv5o7BEM79M5QVZbBWGPizgRwAAAABJRU5ErkJggg==);
  }

  .jobtabbuttonicon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAG0lEQVR4AWMY2eA/BMJYmHAQahj19Kinhz0AAOazv0F7pjjzAAAAAElFTkSuQmCC);
  }

  .stopbuttonicon {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAr0lEQVR4Ab2TxxWDQBBDv2M3bmI7cJquoAsoiJNzAXvdAjBRzjl8XeaNJDL8nSFGyopQaFVMVmzuMGVLfqZtsb1Kl5j8hmK6XFDE7yi6vJj8gaant7pr1hkOr5DHkeleBghTxAGjpuKLCZw8Q6RaFqGmokleglhpqQqKS0tE0FIVxSXCB4UnL+nlm/7gsQ7ZPvPiXvs0Jh9+fNAluhPvfvoDiQFGwpJQaFlMVmz+zB4uewsoywq4xgAAAABJRU5ErkJggg==);
  }

  .closebuttonicon {
    background-size: 20px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAa0lEQVR4AeWSsREDIQwEtwlRhO3vP0JFPLgeHJDdnEfBh2y8F2hHnM5FJ1AayRtLshiE6F8WHUsw9kT0m8BDMFlMotZ10rzuaHtS63qo6s8HWkaLFXpo5ErXyKWukS25dRM5sXz+Pt+Ls/kBnolC6l7shJkAAAAASUVORK5CYII=);
    background-repeat: no-repeat;
    background-position: center;
  }

  .tabbutton {
    display: inline-block;
    position: relative;
    height: 100%;
    font-size: small;
    cursor: pointer;
    cursor: hand;
    padding: 5px 18px;
  }

  .closebutton {
    padding: 5px 5px;
    border-left: 1px solid #c25e00;
  }

  .tabbuttons {
    margin: 0px 0px;
    font-size: 0;
    /* border: 0 1px solid #c25e00; */
  }

  .tabbutton:hover {
    background-color: #c45917;
  }

  .cancelbutton:hover {
    background-color: #c45917;
  }

  .tabbuttonactive {
    /*color: white;*/
    box-shadow: 0px 0px 1px 0px rgba(0, 0, 0, 0.46) inset;
    background-color: rgba(0, 0, 0, 0.2);
    font-weight: bold;
    border: 0;
  }

  .content {
    float: clear;
  }
`;

interface CellMonitorOwnProps {
	cell_id: string;
}

interface CellMonitorDispatchProps {

}

interface CellMonitorStateProps {
	cell_active: boolean

}

type CellMonitorProps = CellMonitorStateProps & CellMonitorStateProps & CellMonitorOwnProps

export class CellMonitorDisplay extends React.Component<CellMonitorProps, any> {
	constructor(props: CellMonitorProps) {
		super(props);
		this.state = {
			collapsed: false,
			view: "jobs",
			executors: 5,
			executor_cores: 6,
			jobs_running: 1,
			jobs_completed: 2,
			jobs_failed: 3
		};
	}

	toggleCollapse() {
		this.setState({
			collapsed: !this.state.collapsed
		});
	}

	render() {
		if (!this.props.cell_active) return <></>
		return (
			<>
				<StyledCellMonitor>
					<div className="title">
						<span className="titleleft">
							<span
								className="tbitem titlecollapse "
								onClick={() => {
									this.toggleCollapse();
								}}
							>
								<span
									className={
										"headericon " +
										(this.state.collapsed ? "headericoncollapsed " : "")
									}
								/>
							</span>
							<span className="tbitem">
								<b>Apache Spark: </b>
								<Counter count={this.state.executors} text="Executors" />
								<Counter count={this.state.executor_cores} text="Cores" />
								<b>Jobs: </b>
								<Counter
									count={this.state.jobs_running}
									text="RUNNING"
									color="#42A5F5"
								/>
								<Counter
									count={this.state.jobs_completed}
									text="COMPLETED"
									color="#20B520"
								/>
								<Counter
									count={this.state.jobs_failed}
									text="FAILED"
									color="#DB3636"
								/>
							</span>
						</span>

						<span className="titleright">
							<span className="tabbuttons">
								<span className="jobtabletabbutton tabbutton" title="Jobs">
									<span className="jobtabbuttonicon tabbuttonicon" />
								</span>
								<span className="taskviewtabbutton tabbutton" title="Tasks">
									<span className="taskviewtabbuttonicon tabbuttonicon" />
								</span>
								<span
									className="timelinetabbutton tabbutton"
									title="Event Timeline"
								>
									<span className="timelinetabbuttonicon tabbuttonicon" />
								</span>
								<span
									className="sparkuitabbutton tabbutton"
									title="Open the Spark UI"
								>
									<span className="sparkuitabbuttonicon tabbuttonicon" />
								</span>
								<span
									className="stopbutton tabbutton"
									title="Stop Running Jobs"
								>
									<span className="stopbuttonicon tabbuttonicon" />
								</span>
								<span className="closebutton tabbutton" title="Close Display">
									<span className="closebuttonicon tabbuttonicon" />
								</span>
							</span>
						</span>
					</div>

					<div className="content">
						{!this.state.collapsed && this.state.view === "jobs" && (
							<JobListView cell_id={this.props.cell_id} />
						)}
						{!this.state.collapsed && this.state.view === "tasks" && (
							<br/>// <TaskView />
						)}
						{!this.state.collapsed && this.state.view === "timeline" && (
							<br/>// <TimelineView />
						)}
					</div >
				</StyledCellMonitor>
			</>
		);
	}

}

function mapStateToProps(state: any, props: CellMonitorOwnProps): CellMonitorStateProps {
	console.log(state);
	let cell_active = (state.spark.getIn(['jobs']).count((job: any) => job.cell_id == props.cell_id) > 0)
	return {
		cell_active
	};

}

function mapDispatchToProps(dispatch: any, props: CellMonitorOwnProps): CellMonitorDispatchProps {
	return {};
}

const CellMonitor = connect(mapStateToProps, mapDispatchToProps)(CellMonitorDisplay);
export default CellMonitor;
