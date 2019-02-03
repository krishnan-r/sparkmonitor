import React from "react";
import styled from "styled-components";

const StyledProgress = styled.div`
  & {
    background: #e7e7e7;
    width: 100%;
    height: 20px;
    text-align: left;
    position: relative;
    font-size: 75%;
    border-radius: 2px;
    color: white;
  }

  .val1 {
    background: #20b520;
  }

  .data {
    text-align: center;
    width: 100%;
    position: absolute;
    z-index: 4;
    line-height: 20px;
  }

  .val2 {
    background: #42a5f5;
  }

  span {
    position: relative;
    height: 100%;
    display: inline-block;
    position: relative;
    overflow: hidden;
    margin: 0;
    padding: 0;
    transition: width 1s;
  }
`;

interface ProgressBarProps {
  val1: string;
  val2: string;
}

export function ProgressBar(props: ProgressBarProps) {
  return (
    <StyledProgress>
      <div className="data"> 25% </div>
      <span className="val1" style={{ width: props.val1 }} />
      <span className="val2" style={{ width: props.val2 }} />
    </StyledProgress>
  );
}

const StyledCounter = styled.span`
  & {
    text-align: center;
    background-color: rgba(117, 57, 0, 0.65);
    background-color: ${(props: any) => props.color};
    font-size: 80%;
    padding: 5px 8px;
    color: white;
    border-radius: 2px;
    box-shadow: 0px 0px 1px 0px rgba(0, 0, 0, 0.36);
    white-space: nowrap;
    font-weight: bold;
    margin: 0 2px;
  }
`;
interface CounterProps {
  color?: string;
  count: number;
  text?: string;
}

export function Counter(props: CounterProps) {
  return (
    <StyledCounter color={props.color}>
      {props.count} {props.text}
    </StyledCounter>
  );
}

const ToolTip = styled.span`
  /*-------------Tooltip Popup---------------*/
  .ui-tooltip {
    background: #666;
    color: white;
    border: none;
    padding: 0;
    opacity: 1;
  }

  .ui-tooltip-content {
    position: relative;
    padding: 5px;
  }

  .ui-tooltip-content::after {
    content: "";
    position: absolute;
    border-style: solid;
    display: block;
    width: 0;
  }

  .tpright .ui-tooltip-content::after {
    top: 5px;
    left: -10px;
    border-color: transparent #666;
    border-width: 10px 10px 10px 0;
  }

  .tpleft .ui-tooltip-content::after {
    top: 5px;
    right: -10px;
    border-color: transparent #666;
    border-width: 10px 0 10px 10px;
  }

  .tptop .ui-tooltip-content::after {
    bottom: -10px;
    left: 72px;
    border-color: #666 transparent;
    border-width: 10px 10px 0;
  }

  .tpbottom .ui-tooltip-content::after {
    top: -10px;
    left: 72px;
    border-color: #666 transparent;
    border-width: 0 10px 10px;
  }
`;

const StyledButton = styled.span`
  & {
    text-align: center;
    background-color: rgba(117, 57, 0, 0.65);
    background-color: ${(props: any) => props.color};
    font-size: 80%;
    padding: 5px 8px;
    color: white;
    border-radius: 2px;
    box-shadow: 0px 0px 1px 0px rgba(0, 0, 0, 0.36);
    white-space: nowrap;
    font-weight: bold;
    margin: 0 2px;
  }
`;
interface Button {
  color?: string;
  count: number;
  text?: string;
}

export function Button(props: CounterProps) {
  return <StyledButton />;
}



let sparkuistyles = styled.div`
.sparkuiframe {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-repeat: no-repeat;
  background-position: center center;
}

.sparkui-dialog {
  padding: 0;
  box-shadow: 0px 0px 6px 0px rgba(128, 128, 128, 0.83);
}

.sparkui-dialog .ui-corner-all {
  border-radius: 0px;
}

.sparkui-dialog .ui-dialog-content.ui-widget-content {
  padding: 0;
}

.sparkui-dialog .ui-widget-header {
  border: 1px solid rgb(243, 118, 0);
  background: #f37600;
  color: #000;
  font-weight: bold;
  text-align: center;
}

.taskcontainer {
  user-select: none;
}
`