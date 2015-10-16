let sender = new RTCDtmfSender(rtcRtpSender);
sender.ontonechange = function(e) {
  if (e.tone === "1") {
    sender.insertDTMF("2", 2000);
  }
};
sender.insertDTMF("1", 1000);
