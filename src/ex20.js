let sender = new RTCDtmfSender(rtcRtpSender);
sender.insertDTMF("123");

// append more tones to the tone buffer before playout has begun
sender.insertDTMF(sender.toneBuffer + "456");

sender.ontonechange = function(e) {
  if (e.tone === "1") {
    // append more tones when playout has begun
    sender.insertDTMF(sender.toneBuffer + "789");
  }
};
