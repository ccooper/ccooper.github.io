// Functions for calculating uptime from treestatus data

var MIN_YEAR = 2017;
var total_seconds_per_month = {};
var outage_seconds_per_month = {}
var seconds_per_day = 60*60*24;
var current_time = new Date();
var current_year = current_time.getFullYear();
var current_month = current_time.getUTCMonth();
var branches = ["autoland", "mozilla-central", "mozilla-inbound", "try"]

var month_for_output = function(m) {
    return m+1;
}

var get_num_days_in_month = function(y, m) {
    // Month go from 0-11, so we don't need to add 1 to the month
    var last_day_of_month = new Date(y, m+1, 0);
    return last_day_of_month.getUTCDate()
}

var initialize_total_seconds_per_month = function() {
    for (var y = MIN_YEAR; y <= current_year; y++) {
        for (var m = 0; m < 12; m++) {
            key = y + "-" + pad(month_for_output(m))
            if (y == current_year && m == current_month) {
                let first_of_month = new Date(current_year, current_month, 1);
                total_seconds_per_month[key] = seconds_delta(current_time, first_of_month);
                break;
            } else if (y == current_year && m > current_month) {
                break;
            }
            num_days = get_num_days_in_month(y, m)
            total_seconds_per_month[key] = num_days * seconds_per_day
        }
    }
}

var initialize_outage_seconds_for_branch = function(branch) {
    outage_seconds_per_month[branch] = {};
    for (var key in total_seconds_per_month) {
        outage_seconds_per_month[branch][key] = 0;
    }
}

var same_day = function(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate();
}

var seconds_delta = function(d1, d2) {
    return Math.abs((d1.getTime() - d2.getTime())/1000);
}

var get_start_of_next_day = function(dt) {
    var new_dt = new Date(dt);
    new_dt.setUTCDate(dt.getUTCDate() + 1);
    new_dt.setUTCHours(0,0,0,0);
    return new_dt
}

var calculate_closure_seconds = function(branch, start_dt, end_dt) {
    while (start_dt < end_dt) {
        var start_month = start_dt.getUTCMonth();
        var key = start_dt.getFullYear() + "-" + pad(month_for_output(start_month));
        if (same_day(start_dt, end_dt)) {
            if (key in outage_seconds_per_month[branch]) {
                outage_seconds_per_month[branch][key] += seconds_delta(end_dt, start_dt)
            } else {
                console.log("Key: " + key + " doesn't exist in outage_seconds_per_month");
            }
            break;
        } else {
            new_end_dt = get_start_of_next_day(start_dt)
            outage_seconds_per_month[branch][key] += seconds_delta(new_end_dt, start_dt);
            start_dt = new_end_dt
        }
    }
}

var calculate_uptime = function(branch, key) {
    if (!(key in total_seconds_per_month)) {
        console.log("ERROR: " + key + " not in total_seconds_per_month");
        return 0
    }
    if (!(branch in outage_seconds_per_month)) {
        outage_seconds_per_month[branch] = {};
    }
    if (!(key in outage_seconds_per_month[branch])) {
        outage_seconds_per_month[branch][key] = 0
    }
    uptime = (total_seconds_per_month[key] - outage_seconds_per_month[branch][key]) / total_seconds_per_month[key] * 100
    return uptime
}

var make_header_row = function() {
    let header_row = document.createElement("tr");
    let th1 = document.createElement("th");
    th1.classList.add("uptime");
    th1.textContent = "year-month";
    header_row.append(th1);
    for (var i = 0; i < branches.length; i++) {
        let thX = document.createElement("th");
        thX.classList.add("uptime");
        thX.textContent = branches[i];
        header_row.appendChild(thX);
    }
    return header_row;
}

var make_empty_row = function(key) {
    let new_row = document.createElement("tr");
    let td1 = document.createElement("td");
    td1.id = key;
    td1.classList.add("uptime");
    var current_month_key = current_year + "-" + pad(month_for_output(current_month));
    if (current_month_key == key) {
        td1.innerHTML = key + '<sup title="current month">*</sup>';
    } else {
        td1.textContent = key;
    }
    new_row.appendChild(td1);
    for (var i = 0; i < branches.length; i++) {
        let tdX = document.createElement("td");
        tdX.id = key + "-" + branches[i];
        tdX.classList.add("uptime");
        tdX.innerHTML = '<img class="spinner" src="./images/ajax-loader.gif" />';
        new_row.appendChild(tdX);
    }
    return new_row;
}

var calculate_downtime_minutes = function(branch, key) {
    let seconds = outage_seconds_per_month[branch][key];
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return hours + ":" + pad(minutes) + ":" + pad(seconds.toFixed(0));
}

var get_class_for_uptime = function(uptime) {
    switch(true) {
        case (uptime >= 99.9):
            return "good";
        case (uptime < 99.9 && uptime >= 95.0):
            return "ok";
        case (uptime < 95.0 && uptime >= 90.0):
            return "bad";
        case (uptime < 90.0):
            return "worst";
        default:
            return "";
    }
}

var handle_branch = function(branch, result) {
    initialize_outage_seconds_for_branch(branch);
    var current_state = "open";
    var current_time = new Date();
    for (var entry in result) {
        var dt = new Date(result[entry]["when"]);
        if (dt.getFullYear() < MIN_YEAR) {
            break;
        }
        if (result[entry]["status"] == "closed" && current_state == "open") {
            calculate_closure_seconds(branch, dt, current_time);
        }
        current_state = result[entry]["status"];
        current_time = dt;
    }
    for (var key in total_seconds_per_month) {
        var td = document.getElementById(key + "-" + branch);
        uptime = calculate_uptime(branch, key);
        td.classList.add(get_class_for_uptime(uptime));
        let downtime_minutes = calculate_downtime_minutes(branch, key);
        td.innerHTML = '<span title="Downtime (HH:MM:SS): ' + downtime_minutes + '">' + uptime.toFixed(3) + "%" + '</span>';
    }
}

var create_uptime_table = function() {
    var uptime_table = document.getElementById("uptime_table");
    uptime_table.appendChild(make_header_row());
    var keys = Object.keys(total_seconds_per_month).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
        uptime_table.appendChild(make_empty_row(keys[i]));
    }
}


var update_uptime_table = function() {
}


document.addEventListener('DOMContentLoaded', function () {
    initialize_total_seconds_per_month();
    create_uptime_table();
    branches.forEach(function(branch) {
        var branch_url = "https://treestatus.mozilla-releng.net/trees/" + branch + "/logs?all=1";
        fetch(branch_url).then(function(response) {
            return response.json();
        }).then(function(data) {
            handle_branch(branch, data.result);
        });
    });
});
