RTCRtpParameters function myCapsToSendParams(RTCRtpCapabilities sendCaps, RTCRtpCapabilities remoteRecvCaps) {
  // Function returning the sender RTCRtpParameters, based on the local sender and remote receiver capabilities.
  // The goal is to enable a single stream audio and video call with minimum fuss.
  //
  // Steps to be followed:
  // 1. Determine the RTP features that the receiver and sender have in common.
  // 2. Determine the codecs that the sender and receiver have in common.
  // 3. Within each common codec, determine the common formats, header extensions and rtcpFeedback mechanisms.
  // 4. Determine the payloadType to be used, based on the receiver preferredPayloadType.
  // 5. Set RTCRtcpParameters such as mux to their default values.
  // 6. Return RTCRtpParameters enablig the jointly supported features and codecs.
  //
  // 1. sender/receiver の共通する RTP feature を決定
  // 2. sender/receiver の共通する codec を決定
  // 3. 共通する codec から、共通 formats、ヘッダ拡張、rtcpFeedback メカニズムを決定
  // 4. receiver の preferredPayloadType から使用する payloadType を決める
  // 5. Set RTCRtcpParameters such as mux to their default values.
  // 6. 共通する featrue/codecs を有効にする RTCRtpParameters を返す
}

RTCRtpParameters function myCapsToRecvParams(RTCRtpCapabilities recvCaps, RTCRtpCapabilities remoteSendCaps) {
  // Function returning the receiver RTCRtpParameters, based on the local receiver and remote sender capabilities.
  return myCapsToSendParams(remoteSendCaps, recvCaps);
}
