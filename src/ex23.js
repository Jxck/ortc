var sender = new RTCRtpSender(track);
var lastReport = null;

setTimeout(function() {
  sender.getStats().then((report) => {
    processStats(report);
    lastReport = report;
  });
}, 500);

function processStats(report) {
  Object.keys(report).forEach((key) => {
    let current = report[key];
    if (current.type !== "outbound-rtp") continue;

    let last = lastReport[current.id];
    if (last) {
      let remoteNow = report[current.associateStatsId];
      let remoteBase = lastReport[last.associateStatsId];

      let packetsReceived = remoteNow.packetsReceived - remoteBase.packetsReceived;
      let packetsSent = current.packetsSent - lastReport.packetsSent;
    }
  });
}

function processStats(currentReport) {
  if (myPreviousReport === null) return;

  // currentReport + myPreviousReport are an RTCStatsReport interface
  // compare the elements from the current report with the baseline
  for (var i in currentReport) {
    var now = currentReport[i];
    if (now.type !== "outbound-rtp") continue;

    // get the corresponding stats from the previous report
    let base = myPreviousReport[now.id];

    // base + now will be of RTCRtpStreamStats dictionary type
    if (base) {
      remoteNow = currentReport[now.associateStatsId];
      remoteBase = myPreviousReport[base.associateStatsId];
      var packetsReceived = remoteNow.packetsReceived - remoteBase.packetsReceived;
      var packetsSent = now.packetsSent - base.packetsSent;
      // if fractionLost is &gt; 0.3, we have probably found the culprit
      var fractionLost = (packetsSent - packetsReceived) / packetsSent;
    }
  }
}
