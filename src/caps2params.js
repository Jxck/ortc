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
function Caps2Params(kind, sendCaps, recvCaps) {

  // 1. Determine the RTP features that the receiver and sender have in common.
  let muxId = null;
  let encodings = [{
    codecPayloadType: 0,
    ssrc: (kind === 'video') ? 1001: 3003,
  }];

  // 2. Determine the codecs that the sender and receiver have in common.
  let codecs = filterCodecParams(sendCaps.codecs, recvCaps.codecs);

  // 3. Within each common codec, determine the common formats, header extensions and rtcpFeedback mechanisms.
  let headerExtensions = [];// filterHeaderExtensions(sendCaps.headerExtensions, recvCaps.headerExtensions);

  // 5. Set RTCRtcpParameters such as mux to their default values.
  let rtcp = { ssrc: 0, cname: '', reducedSize: false, mux: true };

  // 6. Return RTCRtpParameters enablig the jointly supported features and codecs.
  return { muxId, headerExtensions, encodings, rtcp, codecs };
}

function filterHeaderExtensions(sendHeaderEx, recvHeaderEx) {
  return sendHeaderEx.filter((elem) => {
    return recvHeaderEx.includes(elem);
  });
}

function filterCodecParams(sendCodecs, recvCodecs) {
  let codecPrms = [];

  for (let i = 0; i < sendCodecs.length; i++) {
    let send = sendCodecs[i];
    for (let j = 0; j < recvCodecs.length; j++) {
      let recv = recvCodecs[j];

      // 2. Determine the codecs that the sender and receiver have in common.
      let equality = send.name === recv.name
        && send.kind === recv.kind
        && send.preferredPayloadType === recv.preferredPayloadType
        && send.numChannels === recv.numChannels;

      if (equality) {

        // 3. Within each common codec, determine the common formats, header extensions and rtcpFeedback mechanisms.
        let rtcpFeedback = recv.rtcpFeedback;

        // 4. Determine the payloadType to be used, based on the receiver preferredPayloadType.
        let payloadType = recv.preferredPayloadType;

        let name = recv.name;
        let clockRate = recv.clockRate;
        let maxptime = recv.maxptime;
        let numChannels = recv.numChannels;
        let parameters = recv.parameters;

        codecPrms.push({ name, payloadType, clockRate, maxptime, numChannels, rtcpFeedback, parameters });

        break;
      }
    }
  }

  return codecPrms;
}
