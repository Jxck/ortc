let sender = new RTCDtmfSender(rtcRtpSender);
sender.ontonechange = function(e) {
  if (e.tone === "2") {
    // empty the buffer to not play any tone after "2"
    sender.insertDTMF("");
  }
};
sender.insertDTMF("123");
