import './taskdetails.css'
import taskHTML from './taskdetails.html'

import $ from 'jquery';



function showTaskDetails(data) {
    var div = $('<div></div>').html(taskHTML);

    var options = {
        dialogClass: 'noTitleStuff',
        title: "Task Details",
        width: 800,
        height: 500,
        autoResize: false,
        dialogClass: "task-dialog",
        position: { my: "right", at: "right", of: window },
    }

    div.dialog(options);

}

// function fillData(data) {
//     var metrics = data.metrics
//     if(data.status==)

// }




export default {
    'show': showTaskDetails,

} 