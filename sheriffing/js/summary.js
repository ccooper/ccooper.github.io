var msecs = Date.now();

var bz_api_base_url = "https://bugzilla.mozilla.org/rest/bug?keywords=intermittent-failure&keywords_type=allwords&chfieldto=Now";
var bz_search_base_url = "https://bugzilla.mozilla.org/buglist.cgi?keywords=intermittent-failure&keywords_type=allwords&chfieldto=Now&query_format=advanced";
var bz_created_today = "&chfield=[Bug creation]&chfieldfrom=-1d";
var bz_created_this_week = "&chfield=[Bug creation]&chfieldfrom=-7d";
var bz_closed_today = "&chfield=bug_status&chfieldfrom=-1d&chfieldvalue=RESOLVED&bug_status=RESOLVED";
var bz_closed_this_week = "&chfield=bug_status&chfieldfrom=-7d&chfieldvalue=RESOLVED&bug_status=RESOLVED";

document.addEventListener('DOMContentLoaded', function () {
    // Get tree status info
    fetch("https://treestatus.mozilla-releng.net/trees/autoland/logs?all=0").then(function(response) {
         return response.json();
    }).then(function(data) {
        handleStatus(data.result,"autoland");
    });
    fetch("https://treestatus.mozilla-releng.net/trees/mozilla-inbound/logs?all=0").then(function(response) {
         return response.json();
    }).then(function(data) {
        handleStatus(data.result,"mozilla-inbound");
    });
    fetch("https://treestatus.mozilla-releng.net/trees/mozilla-central/logs?all=0").then(function(response) {
         return response.json();
    }).then(function(data) {
        handleStatus(data.result,"mozilla-central");
    });
    // Get merge/backout info
    fetch("https://hg.mozilla.org/integration/autoland/json-pushes/?full&version=2&tipsonly=1&startdate=24%20hours%20ago").then(function(response) {
        return response.json();
    }).then(function(data) {
        handlePushes(data.pushes,"autoland");
    });
    fetch("https://hg.mozilla.org/integration/mozilla-inbound/json-pushes/?full&version=2&tipsonly=1&startdate=24%20hours%20ago").then(function(response) {
        return response.json();
    }).then(function(data) {
        handlePushes(data.pushes,"mozilla-inbound");
    });
    fetch("https://hg.mozilla.org/mozilla-central/json-pushes/?full&version=2&tipsonly=1&startdate=24%20hours%20ago").then(function(response) {
       return response.json();
    }).then(function(data) {
        handlePushes(data.pushes,"mozilla-central");
    });
    // Get information about intermitttent bugs
    fetch(bz_api_base_url + bz_created_today).then(function(response) {
        return response.json();
    }).then(function(data) {
        handleIntermittentBugs(data.bugs, "created-today", bz_search_base_url + bz_created_today);
    });
    fetch(bz_api_base_url + bz_closed_today).then(function(response) {
        return response.json();
    }).then(function(data) {
        handleIntermittentBugs(data.bugs, "closed-today", bz_search_base_url + bz_closed_today);
    });
    fetch(bz_api_base_url + bz_created_this_week).then(function(response) {
        return response.json();
    }).then(function(data) {
        handleIntermittentBugs(data.bugs, "created-this-week", bz_search_base_url + bz_created_this_week);
    });
    fetch(bz_api_base_url + bz_closed_this_week).then(function(response) {
        return response.json();
    }).then(function(data) {
        handleIntermittentBugs(data.bugs, "closed-this-week", bz_search_base_url + bz_closed_this_week);
    });
});

var handleStatus = function(status, tree) {
    var tree_status = document.getElementById(tree).getElementsByClassName("status")[0];
    tree_status.innerHTML = "<a target=\"_blank\" href=\"https://mozilla-releng.net/treestatus/show/" + tree + "\">" + status[0]['status'] + "</a>";
    tree_status.setAttribute('title',status[0]['reason']);
    tree_status.classList.add(status[0]['status'].split(" ")[0]);
}

var handlePushes = function(pushes, tree) {
    var merges = [];
    var most_recent_merge = "";
    var num_backouts = 0;
    var backouts_cell = document.getElementById(tree).getElementsByClassName("backouts")[0];
    var merges_cell = document.getElementById(tree).getElementsByClassName("merges")[0];

    for(let aPush in pushes) {
        let thisCSet = pushes[aPush].changesets[0];
        let date = pushes[aPush].date;
        if(thisCSet.desc.toLowerCase().startsWith("backed out") ||
           thisCSet.desc.toLowerCase().startsWith("backout")) {
            num_backouts++;
            continue;
        }
        if(thisCSet.desc.toLowerCase().startsWith("merge")) {
            merges.push(pushes[aPush]);
        }
    }
    let backouts_link = createLink("./details.html?tree=" + tree, num_backouts, "_target");
    backouts_cell.innerHTML = "";
    backouts_cell.appendChild(backouts_link);

    let merges_text = "";
    if (merges.length === 0) {
        merges_text = "No corresponding merges";
    } else {
        rmerges = merges.reverse();
        merges_text = rmerges[0].changesets[0].node + " (" + calculateTimeDelta(rmerges[0].date) + ")"
    }
    let merges_link = createLink("./details.html?tree=" + tree, merges_text, "_target");
    merges_cell.innerHTML = "";
    merges_cell.appendChild(merges_link);
}

var handleIntermittentBugs = function(bugs, cell_id, bz_url) {
    let cell = document.getElementById(cell_id);
    let link = createLink(bz_url, bugs.length, "_target");
    cell.innerHTML = "";
    cell.appendChild(link);
}
