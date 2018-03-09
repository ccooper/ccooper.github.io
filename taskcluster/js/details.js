var current_time = new Date();
var current_year = current_time.getFullYear();
var current_month = current_time.getUTCMonth();
var branches = ["autoland", "mozilla-central", "mozilla-inbound", "try"]
var branch = "";
var month = "";
var bug_products = {};

var verifyInputs = function() {
    branch = Requests.QueryString("branch");
    if (!(branches.indexOf(branch) > -1)) {
        return false;
    }
    month = Requests.QueryString("month");
    let month_re = /\d\d\d\d-\d\d/;
    if (!(month.match(month_re))) {
        return false;
    }
    return true;
}

var updateSectionHeader = function() {
    let h2 = document.getElementById("section_header")
    h2.textContent = "Details for " + month;
}

var makeKeyFromDate = function(dt) {
    let utc_month = dt.getUTCMonth();
    return dt.getFullYear() + "-" + pad(monthForOutput(utc_month));
}

var getBugFromReason = function(reason) {
    bug_re.lastIndex = 0;
    let matches = bug_re.exec(reason);
    if (matches) {
        let id = matches[2];
        if (!(id in bug_products)) {
            bug_products[id] = "";
        }
        return id;
    }
    matches = /https\:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi\?id=(\d+)/.exec(reason);
    if (matches) {
        let id = matches[1];
        if (!(id in bug_products)) {
            bug_products[id] = "";
        }
        return id;
    }
    return "";
}

var handleResponse = function(response) {
    var output = "";
    var json = JSON.parse(response);
    var bugs = json.bugs;

    if (bugs && bugs[0]) {
        let id = bugs[0]["id"];

        let elements = document.getElementsByClassName(id);
        for (var i=0; i < elements.length; i++) {
            elements[i].textContent = bugs[0]["product"] + ":" + bugs[0]["component"];
        }
    }
}

var progressListener = function() {
    if (this.readyState === 4 && (this.status === 200 || this.status === 400)) {
        handleResponse(this.responseText);
    }
}

var getBugById = function(id) {
    var apiURL = "https://bugzilla.mozilla.org/rest/bug/" + id;

    var client = new XMLHttpRequest();
    client.onreadystatechange = progressListener;
    client.id = id;
    client.open("GET", apiURL);
    client.setRequestHeader('Accept',       'application/json');
    client.setRequestHeader('Content-Type', 'application/json');
    client.send();
}

var calculateDowntimeMinutes = function(start, end) {
    let seconds = secondsDelta(end, start);
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return hours + ":" + pad(minutes) + ":" + pad(seconds.toFixed(0));
}

var utcDateForOutput = function(dt) {
    return dt.getFullYear() + "-" + pad(monthForOutput(dt.getUTCMonth()))+ "-" + pad(dt.getUTCDate()) + " " + pad(dt.getUTCHours()) + ":" + pad(dt.getUTCMinutes()) + ":" + pad(dt.getUTCSeconds());
}

var updateTreeClosuresTable = function(tree_closures) {
    let closures_table = document.getElementById("tree-closures");
    for (var i in tree_closures) {
        let tr = document.createElement("tr");
        tr.classList.add("closure");
        let td1 = document.createElement("td");
        td1.classList.add("nowrap");
        td1.textContent = utcDateForOutput(tree_closures[i]["start"]);
        let td2 = document.createElement("td");
        td2.classList.add("nowrap");
        td2.textContent = utcDateForOutput(tree_closures[i]["end"]);
        let td3 = document.createElement("td");
        td3.classList.add("centered");
        td3.textContent = calculateDowntimeMinutes(tree_closures[i]["start"], tree_closures[i]["end"]);
        let td4 = document.createElement("td");
        td4.classList.add("centered");
        td4.classList.add("nowrap");

        if (tree_closures[i]["bug_id"] == "") {
            td4.textContent = "Unknown";
        } else {
            let id = tree_closures[i]["bug_id"];
            td4.classList.add(id);
            td4.innerHTML = '<img class="spinner small" src="./images/ajax-loader.gif" />';
        }
        let td5 = document.createElement("td");
        td5.textContent = tree_closures[i]["who"].replace("mozilla-ldap/", "").replace("mozilla-auth0/ad|Mozilla-LDAP|","").split("@")[0];
        let td6 = document.createElement("td");
        td6.innerHTML = markupBugs(tree_closures[i]["reason"]);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);
        tr.appendChild(td6);
        closures_table.appendChild(tr);
    }
    updateBugProducts();
}

var updateBugProducts = function() {
    for (var id in bug_products) {
        getBugById(id);
    }
}

var parseBranchData = function(result) {
    var current_state = "open";
    var current_time = new Date();
    var tree_closures = [];
    for (var entry in result) {
        var dt = new Date(result[entry]["when"]);
        if (result[entry]["status"] == "closed") {
            if (current_state == "open" || current_state == "approval required") {
                // If either the start date or end date are in the month we care about, add that entry to the output stream
                if (makeKeyFromDate(current_time) == month ||
                    makeKeyFromDate(dt) == month) {
                    let tree_closure = {};
                    tree_closure["start"] = dt;
                    tree_closure["end"] = current_time;
                    tree_closure["who"] = result[entry]["who"];
                    tree_closure["reason"] = result[entry]["reason"];
                    tree_closure["bug_id"] = getBugFromReason(result[entry]["reason"]);
                    tree_closures.push(tree_closure);
                }
            }
        }
        current_state = result[entry]["status"];
        current_time = dt;
    }
    updateTreeClosuresTable(tree_closures);
}

document.addEventListener('DOMContentLoaded', function () {
    if (verifyInputs()) {
        updateSectionHeader();
        var branch_url = "https://treestatus.mozilla-releng.net/trees/" + branch + "/logs?all=1";
        fetch(branch_url).then(function(response) {
            return response.json();
        }).then(function(data) {
            parseBranchData(data.result);
        });
    }
});

