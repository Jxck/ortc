var util = {};
util.Caps2Params = function(sendCaps, remoteRecvCaps) {
  let muxId = '';
  let codecs = util.filterCodecParams(sendCaps.codecs, remoteRecvCaps.codecs);
  let headerExtensions = util.filterHdrExtParams(sendCaps.headerExtensions, remoteRecvCaps.headerExtensions);
  let encodings = [];

  // RTCRtcpParameters
  let rtcp = {
    ssrc: 0,
    cname: '',
    reducedSize: false,
    mux: true,
  };

  // RTCRtpParameters
  return {
    muxId,
    codecs,
    headerExtensions,
    encodings,
    rtcp
  };
};

util.filterCodecParams = function(left, right) {
  let codecPrms = [];

  if (left && right) {
    left.forEach(function(leftItem) {
      for (let i = 0; i < right.length; i++) {
        let codec = right[i];
        let equality = (leftItem.name == codec.name &&
          leftItem.kind === codec.kind &&
          leftItem.preferredPayloadType === codec.preferredPayloadType &&
          leftItem.numChannels === codec.numChannels);

        if (equality) {
          let codecParams = {
            name: codec.name,
            payloadType: codec.preferredPayloadType,
            clockRate: codec.clockRate,
            numChannels: codec.numChannels,
            rtcpFeedback: codec.rtcpFeedback,
            parameters: codec.parameters,
          };
          codecPrms.push(codecParams);

          break;
        }
      }
    });
  }

  return codecPrms;
};

util.filterHdrExtParams = function(left, right) {
  let hdrExtPrms = [];
  return hdrExtPrms;
};

util.RTCRtpEncodingParameters = function(ssrc, codecPayloadType, fec, rtx, priority, maxBitrate, minQuality, framerateBias, resolutionScale, framerateScale, active, encodingId, dependencyEncodingId) {
  codecPayloadType = codecPayloadType || 0;
  fec = fec || 0;
  rtx = rtx || 0;
  priority = priority || 1.0;
  maxBitrate = maxBitrate || 2000000.0;
  minQuality = minQuality || 0;
  framerateBias = framerateBias || 0.5;
  resolutionScale = resolutionScale || 1.0;
  framerateScale = framerateScale || 1.0;
  active = active || true;

  return {
    ssrc,
    codecPayloadType,
    fec,
    rtx,
    priority,
    maxBitrate,
    minQuality,
    framerateBias,
    resolutionScale,
    framerateScale,
    active,
    encodingId,
    dependencyEncodingId,
  };
};

function caps2params(ssrc, senderCaps, receiverCaps, muxId) {
  let encodingParams = util.RTCRtpEncodingParameters(ssrc);
  let params = util.Caps2Params(senderCaps, receiverCaps);
  if (muxId !== undefined) {
    params.muxId = muxId;
  }
  params.encodings.push(encodingParams);
  return params;
}
