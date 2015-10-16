let sender = new RTCDtmfSender(rtcRtpSender);
sender.ontonechange = function(e) {
  if (!e.tone) return;

  // light up the key when playout starts
  lightKey(e.tone);

  // turn off the light after tone duration
  setTimeout(lightKey, sender.duration, "");
};
sender.insertDTMF("1234");
