var msecs = Date.now();
var one_week_ago = new Date();
one_week_ago.setDate(one_week_ago.getDate() - 7);
var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var bug_re = /(bug\#*\ *)(\d+)/ig;

var Requests = {
    QueryString : function(item){
        var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
        return svalue ? svalue[1] : svalue;
    }
}

function pad(number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

function formatDate(in_date) {
    return in_date.getUTCFullYear() +
        '-' + pad(in_date.getUTCMonth() + 1) +
        '-' + pad(in_date.getUTCDate());
}

function getDateHour(in_date) {
    let my_hour = pad(in_date.getUTCHours());
    let my_date = formatDate(in_date);
    return my_date + " " + my_hour + ":00";
}

function calculateTimeDelta(in_date) {
    // hg dates are measured to the second vs milliseconds in js
    var hours = Math.abs(msecs/1000 - in_date) / (60*60);
    return Math.round(hours) + " hours ago";
}

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function getDayOfWeek(i) {
    return days[i];
}

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function toHours(msecs) {
    return round(msecs / 1000 / 60 / 60, 1);
}

function createLink(href, text_content, target) {
    var new_link = document.createElement("a");
    new_link.href = href;
    new_link.textContent = text_content;
    new_link.target = target;
    return new_link;
}

var monthForOutput = function(m) {
    return m+1;
}

var secondsDelta = function(d1, d2) {
    return Math.abs((d1.getTime() - d2.getTime())/1000);
}

function markupBugs(notes) {
    let marked_up = notes.replace(/(https\:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi\?id\=)(\d+)/, "<a target='_target' href='https://bugzil.la/$2'>$1$2</a>");
    marked_up = marked_up.replace(bug_re, "<a target='_target' href='https://bugzil.la/$2'>$1$2</a>");
    return marked_up;
}
