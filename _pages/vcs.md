---
permalink: /vcs/
---
<h1>VCS</h1>

<h2 id="hgmo">hg.mozilla.org</h2>
<h3 id="tools">version-control-tools</h3>
<h2 id="Try">Try server</h2>
A collection of useful links for people looking to maximize their use of the Try server:
<ul>
<li><a href="https://firefox-source-docs.mozilla.org/taskcluster/taskcluster/try.html">Using the Try Server effectively in a TaskCluster world</a> - <a href="https://docs.taskcluster.net/">TaskCluster</a> allows developers even more control over task submission and job choice. This is currently the best way to influence your Try submission via the command-line.</li>
<li><a href="https://ahal.ca/blog/2017/mach-try-fuzzy/">Try Fuzzy: A Try Syntax Alternative</a> - an easy-to-use, alternative method for scheduling tasks on Try. UPDATE: there are a bunch of new features described in the <a href="https://groups.google.com/d/msg/mozilla.dev.platform/pdnFu21O2iI/urWqajcoAgAJ">newsgroup thread</a>.
<li><a href="http://mozilla-version-control-tools.readthedocs.io/en/latest/mozreview/autoland.html#sending-commits-to-try">Reviewboard and Try</a> - did you know you can trigger Try runs automatically from your review request in reviewboard? Pretty neat, huh?</li>
<li><a href="https://wiki.mozilla.org/ReleaseEngineering/TryServer#Scheduling_jobs_with_Treeherder">Choosing Try coverage via Treeherder</a> - AKA <code>mach try empty</code>. Using this method will give you a bare minimum of builds/tests for your push, and you can then use the Treeherder interface to choose what else to run.</li>
<li><a href="https://wiki.mozilla.org/Sheriffing/How_To/Recommended_Try_Practices">Best practices for using Try, as recommended by the code sheriffs</a> - following these simple guidelines will help you get meaningful results faster, and will also make best use of limited, shared resources</li>
<li><a href="https://wiki.mozilla.org/ReleaseEngineering/TryChooser">TryChooser</a> - AKA Old School. This is what most developers who have been here a while probably associate with running jobs on Try. While this syntax and associated tools will still work, you are <em><b>STRONGLY ENCOURAGED</b></em> to "try" one of the other methods above. 😊</li>
