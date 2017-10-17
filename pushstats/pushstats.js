var centralPushes,inboundPushes,autolandPushes;

document.addEventListener('DOMContentLoaded', function () {
  // Get mozilla-central's stats...
  fetch("https://hg.mozilla.org/mozilla-central/json-pushes/?full&version=2&startdate=36%20hours%20ago&tipsonly=1").then(function(response) {
      return response.json();
  }).then(function(json) {
      centralPushes = json.pushes;
      handlePushes(centralPushes,"central");
  });


  // Get inbound's stats...
  fetch("https://hg.mozilla.org/integration/mozilla-inbound/json-pushes/?full&version=2&startdate=36%20hours%20ago&tipsonly=1").then(function(response) {
      return response.json();
  }).then(function(json) {
      inboundPushes = json.pushes;
      handlePushes(inboundPushes,"inbound");
  });


  // Get autoland's stats...
  fetch("https://hg.mozilla.org/integration/autoland/json-pushes/?full&version=2&startdate=36%20hours%20ago&tipsonly=1").then(function(response) {
      return response.json();
  }).then(function(json) {
      autolandPushes = json.pushes;
      handlePushes(autolandPushes,"autoland");
  });
});

function pad(value) {
    if(value < 10) {
        return '0' + value;
    } else {
        return value;
    }
}

var handlePushes = function(pushes,tree) {
    for(let aPush in pushes) {
        let thisCSet = pushes[aPush].changesets[0];
        let date = pushes[aPush].date;
        if(thisCSet.desc.toLowerCase().startsWith("backed out")) {
            let csetEl = createCSet(thisCSet, "backout", date, tree);
            document.getElementById(tree).getElementsByClassName("backouts")[0].nextElementSibling.appendChild(csetEl);
        }
        if(thisCSet.desc.toLowerCase().startsWith("merge")) {
            let csetEl = createCSet(thisCSet, "merge", date, tree);
            document.getElementById(tree).getElementsByClassName("merges")[0].nextElementSibling.appendChild(csetEl);
        }
    }
}

var createCSet = function(cset, type, date, tree) {
    var dateObj = new Date(0);
    dateObj.setUTCSeconds(date);
    let csetEl = document.createElement("div");
    let author = document.createElement("span");
    let hash = document.createElement("span");
    let hashLink = document.createElement("a");
    let dateEl = document.createElement("span");

    let url = "https://hg.mozilla.org/<tree>/pushloghtml?changeset=" + cset.node;
    switch(tree) {
        case "central":
            url = url.replace("<tree>", "mozilla-central");
            break;
        case "inbound":
            url = url.replace("<tree>", "integration/mozilla-inbound");
            break;
        case "autoland":
            url = url.replace("<tree>", "integration/autoland");
            break;
    }


    author.textContent = cset.author.split("<")[0].trim();
    dateEl.textContent = dateObj.getFullYear() + "/" + pad(dateObj.getMonth()) + "/" + pad(dateObj.getDate()) + " " +
           pad(dateObj.getHours()) + ":" + pad(dateObj.getMinutes());

    hashLink.textContent = cset.node;
    hashLink.href = url;

    hash.appendChild(hashLink);

    csetEl.appendChild(dateEl);
    csetEl.appendChild(author);
    csetEl.appendChild(hash);

    return csetEl;
}
