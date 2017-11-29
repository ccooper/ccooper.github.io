Requests = {
    QueryString : function(item){
        var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
        return svalue ? svalue[1] : svalue;
    }
}

var hg_base_url = "https://hg.mozilla.org/";
var hg_params = "/json-pushes/?full&version=2&tipsonly=1&startdate=";
var valid_trees = ["autoland", "mozilla-inbound", "mozilla-central"];

let tree = Requests.QueryString("tree");
let repo_path = tree;
if (tree === "mozilla-inbound" || tree === "autoland") {
    repo_path = "integration/" + tree;
}

document.addEventListener('DOMContentLoaded', function () {
    if (valid_trees.includes(tree)) {
        setPageTitle(tree);
        fetch(hg_base_url + repo_path + hg_params + "24%20hours%20ago").then(function(response) {
            return response.json();
        }).then(function(data) {
            handlePushes(data.pushes, tree);
        });
        fetch("https://treestatus.mozilla-releng.net/trees/" + tree + "/logs?all=1").then(function(response) {
            return response.json();
        }).then(function(data) {
            handleClosures(tree, data.result);
        });
        fetch(hg_base_url + repo_path + hg_params + "1%20week%20ago").then(function(response) {
            return response.json();
        }).then(function(data) {
            handleBackouts(data.pushes, tree);
        });
    }
});

var setPageTitle = function(tree, extra) {
    var page_title= document.getElementById("page-title");
    if (typeof extra === "object") {
        page_title.innerHTML = "tree details - " + tree + " is ";
        page_title.appendChild(extra);
    } else if (typeof extra === "str") {
        page_title.innerHTML = "tree details - " + tree + " - " + extra;
    }
    document.title = tree + " - details";
}

var displayTreeStatus = function(tree, status, reason) {
    let tree_status = document.createElement("span");
    tree_status.innerHTML = "<a target=\"_blank\" href=\"https://mozilla-releng.net/treestatus/show/" + tree + "\">" + status + "</a>";
    tree_status.setAttribute('title', reason);
    tree_status.classList.add(status.split(" ")[0]);
    tree_status.classList.add("details");
    return tree_status;
}

var handlePushes = function(pushes, tree) {
    var backouts = [];
    var merges = [];
    for(let aPush in pushes) {
        let thisCSet = pushes[aPush].changesets[0];
        let date = pushes[aPush].date;
        if(thisCSet.desc.toLowerCase().startsWith("backed out")) {
            let csetEl = createCSet(thisCSet, "backout", date, tree);
            backouts.push(csetEl)
        }
        if(thisCSet.desc.toLowerCase().startsWith("merge")) {
            let csetEl = createCSet(thisCSet, "merge", date, tree);
            merges.push(csetEl)
        }
    }
    rbackouts = backouts.reverse()
    backouts_table = document.getElementById("backout_changesets");
    backouts_table.append(makeTableHeader());
    for(let i in rbackouts) {
        backouts_table.append(rbackouts[i]);
    }
    rmerges = merges.reverse()
    merges_table = document.getElementById("merge_changesets");
    merges_table.append(makeTableHeader());
    for(let i in rmerges) {
        merges_table.append(rmerges[i]);
    }
}

var createCSet = function(cset, type, date, tree) {
    var dateObj = new Date(0);
    dateObj.setUTCSeconds(date);
    let csetEl = document.createElement("tr");
    let author = document.createElement("td");
    let hash = document.createElement("td");
    let dateEl = document.createElement("td");
    let url = "https://hg.mozilla.org/" + tree + "/pushloghtml?changeset=" + cset.node;
    let hashLink = createLink(url, cset.node, "_blank");

    author.textContent = cset.author.split("<")[0].trim();
    dateEl.textContent = dateObj.getFullYear() + "/" + pad(dateObj.getMonth()+1) + "/" + pad(dateObj.getDate()) + " " +
           pad(dateObj.getHours()) + ":" + pad(dateObj.getMinutes());

    hash.appendChild(hashLink);

    csetEl.appendChild(dateEl);
    csetEl.appendChild(author);
    csetEl.appendChild(hash);

    return csetEl;
}

var handleClosures = function(tree, closures) {
    // Display the current tree status
    current_status = closures[0]["status"];
    current_reason = closures[0]["reason"];
    setPageTitle(tree, displayTreeStatus(tree, current_status, current_reason));

    var opened, closed, reason;
    var closures_by_day = {};
    for (var i = 0; i < closures.length; i++) {
        when = new Date(closures[i]['when'].slice(0,19));
        if (closures[i]["status"] == "closed") {
            if (closures[i]['tags'].length > 0) {
                reason = closures[i]['tags'][0];
            } else {
                reason = "no reason";
            }
            closed = when;
            if (opened) {
                closures_by_day = updateDates(opened, closed, reason, closures_by_day);
                let year_month = formatDate(closed).slice(0,7);
                opened = null;
            }
        } else if (closures[i]["status"] == "open" || closures[i]["status"] == "approval required") {
            opened = when;
            closed = null;
            reason = null;
        }
    }
    let closures_by_month = {};
    for (let mydate in closures_by_day) {
        let year_month = mydate.slice(0,7);
        if (!(year_month in closures_by_month)) {
            closures_by_month[year_month] = {};
        }
        for (let reason in closures_by_day[mydate]) {
            if (reason in closures_by_month[year_month]) {
                closures_by_month[year_month][reason] += closures_by_day[mydate][reason];
            } else {
                closures_by_month[year_month][reason] = closures_by_day[mydate][reason];
            }
        }
    }
    var ordered_months = Object.keys(closures_by_month).sort();
    var uptime_data = getUptimeStats(ordered_months, closures_by_month);
    var closure_data = getClosureStats(ordered_months, closures_by_month);
    displayUptimeChart(ordered_months, uptime_data, tree);
    displayClosuresChart(ordered_months, closure_data, tree);
}

var getClosureStats = function(ordered_months, closures_by_month) {
    let y = {'no reason': [],
             'checkin-test': [],
             'checkin-compilation': [],
             'infra': [],
             'other': [],
             'planned': [],
             'backlog': [],
             'total': []};
    for (var i = 0; i < ordered_months.length; i++) {
        let year_month = ordered_months[i];
        for (let reason in y) {
            if (reason in closures_by_month[year_month]) {
                y[reason].push(toHours(closures_by_month[year_month][reason]));
            } else {
                y[reason].push(0);
            }
        }
    }
    return y;
}

var getUptimeStats = function(ordered_months, closures_by_month) {
    let uptimeStats = [];
    for (var i = 0; i < ordered_months.length; i++ ){
        let year_month = ordered_months[i];
        let [year, month] = year_month.split('-');
        let days_in_month = daysInMonth(year, month);
        let total_hours_in_month = days_in_month * 24;
        let closed_hours = toHours(closures_by_month[year_month]["total"]);
        let uptime = Math.round(100 - (closed_hours / total_hours_in_month * 100));
        uptimeStats.push(uptime);
    }
    return uptimeStats;
}

var updateDates = function(opened, closed, reason, dates) {
    // Since closures can span day boundaries, try to parcel that closure time into the correct day buckets.
    let fmt_opened = formatDate(opened);
    let fmt_closed = formatDate(closed);
    var delta = 0;
    // Did we close and open again on the same day? That math is easy.
    if (fmt_opened == fmt_closed) {
        delta = opened - closed;
        _updateDateStruct(fmt_opened, reason, delta, dates);
    } else {
        // Chances are we only spanned one day boundary, but it *could* be more.
        // Calculate from the open time to midnight for each day until we reach the original closing time.
        // Subtract one second, i.e. 1000msecs,from the midnight time to get to the previous day.
        let current_date = Object.assign({}, opened);
        while (current_date >= closed) {
            fmt_current = formatDate(current_date)
            let midnight = new Date(fmt_current);
            if (midnight < closed) {
                delta = current_date - closed;
            } else {
                delta = current_date - midnight;
            }
            _updateDateStruct(fmt_current, reason, delta, dates);
            current_date = midnight - 1000;
        }
    }
    return dates;
}

var _updateDateStruct = function(fmt_date, reason, delta, dates) {
    if (!(fmt_date in dates)) {
        dates[fmt_date] = {'total': delta}
        dates[fmt_date][reason] = delta;
    } else {
        dates[fmt_date]['total'] += delta;
        if (!(reason in dates[fmt_date])) {
            dates[fmt_date][reason] = delta;
        } else {
            dates[fmt_date][reason] += delta;
        }
    }
    return dates;
}

var handleBackouts = function(pushes) {
    var backouts_by_hour = new Array(24).fill(0);
    var pushes_by_hour = new Array(24).fill(0);
    var backouts_by_day = new Array(7).fill(0);
    var pushes_by_day = new Array(7).fill(0);
    var today = new Date();
    var ordered_hours = {};
    var ordered_day_indices = new Array(7).fill(0);
    for (var i = 23; i >= 0; i--) {
        let current_date_hour = getDateHour(today);
        ordered_hours[current_date_hour] = i;
        today = new Date(today.getTime() - (1000*60*60));
    }
    var today = new Date();
    for (var i = 6; i >= 0; i--) {
        let current_day = days[today.getDay()];
        ordered_day_indices[i] = today.getDay();
        today = new Date(today.getTime() - (1000*60*60*24));
    }
    for (let push in pushes) {
        let push_date = new Date(pushes[push]["date"]*1000);
        let push_date_hour = getDateHour(push_date);
        if (push_date_hour in ordered_hours) {
            pushes_by_hour[ordered_hours[push_date_hour]] += 1;
        }
        pushes_by_day[push_date.getDay()] += 1;
        for (let cset in pushes[push]["changesets"]) {
            let this_cset = pushes[push].changesets[cset];
            if(this_cset.desc.toLowerCase().startsWith("backed out")) {
                if (push_date_hour in ordered_hours) {
                    pushes_by_hour[ordered_hours[push_date_hour]] -= 1;
                    backouts_by_hour[ordered_hours[push_date_hour]] += 1;
                }
                pushes_by_day[push_date.getDay()] -= 1;
                backouts_by_day[push_date.getDay()] += 1;
                break;
            }
        }
    }
    var ordered_days = ordered_day_indices.map(getDayOfWeek);
    displayBackoutsToday(Object.keys(ordered_hours).sort(), pushes_by_hour, backouts_by_hour, tree);
    displayBackoutsThisWeek(ordered_days, pushes_by_day, backouts_by_day, tree);
}

var displayUptimeChart = function(ordered_months, uptime_data, tree) {
    var myChart = Highcharts.chart('uptime', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Tree Uptime for ' + tree
        },
        xAxis: {
            categories: ordered_months,
        },
        yAxis: {
            title: {
                text: "Percentage Uptime",
            },
        },
        series: [
            {
                name: "Uptime (Higher is better)",
                data: uptime_data,
            },
        ],
        plotOptions: {
            area: {
                stacking: 'normal',
            },
        }
    });
}

var displayClosuresChart = function(ordered_months, closure_data, tree) {
    var data_series = [];
    for (let reason in closure_data) {
        if (reason == "total") {
            continue;
        } else {
            let data_point = {};
            data_point["name"] = reason;
            data_point["data"] = closure_data[reason];
            data_series.push(data_point);
        }
    }
    var myChart = Highcharts.chart('closures', {
        chart: {
            type: 'area'
        },
        title: {
            text: 'closures for ' + tree
        },
        xAxis: {
            categories: ordered_months
        },
        yAxis: {
            title: {
                text: "Closure in hours",
            },
        },
        series: data_series,
        plotOptions: {
            area: {
                stacking: 'normal',
            },
        }
    });
}

var displayBackoutsToday = function(ordered_hours, pushes_hours, backouts_hours, tree) {
    var myChart = Highcharts.chart('backouts_today', {
        chart: {
            defaultSeriesType: 'column',
        },
        title: {
            text: 'Backouts and Landings per hour for today for ' + tree
        },
        xAxis: {
          title: {
            text: "Hours (UTC)",
          },
          categories: ordered_hours
        },
        yAxis: {
          title: {
            text: "pushes per hour",
          },
        },
        series: [{
            name: "Pushes",
            data: pushes_hours,
            color: "#7CB5EC"
        },
        {
          name: "Backouts",
          data: backouts_hours,
          color: '#434348'
          }],
        plotOptions: {
          series: {
                stacking: 'normal'
            }
        },
        legend: {
          layout: 'horizontal',
          floating: true,
          backgroundColor: '#FFFFFF',
          align: 'right',
          verticalAlign: 'top',
          y: 60,
          x: -60
        },
    });
}

var displayBackoutsThisWeek = function(ordered_days, pushes_by_day, backouts_by_day, tree) {
    var myChart = Highcharts.chart('backouts_this_week', {
        chart: {
            defaultSeriesType: 'column',
        },
        title: {
            text: 'Backouts and Landings by day for the last week for ' + tree
        },
        xAxis: {
            title: {
                text: "Hours (UTC)",
            },
            categories: ordered_days
        },
        yAxis: {
            title: {
                text: "pushes per day",
            },
        },
        series: [{
            name: "Pushes",
            data: pushes_by_day,
            color: '#7CB5EC'
            },
            {
            name: "Backouts",
            data: backouts_by_day,
            color: "#434348"
        }],
        plotOptions: {
            series: {
                stacking: 'normal'
            }
        },
        legend: {
            layout: 'horizontal',
            floating: true,
            backgroundColor: '#FFFFFF',
            align: 'right',
            verticalAlign: 'top',
            y: 60,
            x: -60
        },
    });
}

var makeTableHeader = function() {
    let headerRow = document.createElement("tr");
    let td1 = document.createElement("td");
    td1.textContent = "Time (UTC)";
    let td2 = document.createElement("td");
    td2.textContent = "Sheriff";
    let td3 = document.createElement("td");
    td3.textContent = "Changeset";
    headerRow.appendChild(td1);
    headerRow.appendChild(td2);
    headerRow.appendChild(td3);
    return headerRow;
}
