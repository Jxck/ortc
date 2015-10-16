let sender = new RTCDtmfSender(rtcRtpSender);
if (sender.canInsertDTMF) {
  let duration = 500;
  sender.insertDTMF("1234", duration);
} else {
  console.trace("DTMF function not available");
}
