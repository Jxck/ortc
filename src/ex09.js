// Example of exchange RTPCapability for sending/receiving
// MediaStreamTrack ("video", "audio", etc) over RTCDtlsTransport.
// Assume that we have a way to signaling by signaller.

let kind = "video"; // or "audio" etc

// Create Sender from MediaStreamTrack and RTCDtlsTransport
let rtcRtpSender = new RTCRtpSender(mediaStreamTrack, rtcDtlsTransport);

// Create Receiver from RTCDtlsTransport
let rtcRtpReceiver = new RTCRtpReceiver(rtcDtlsTransport);

// Retrieve Capabilities from sender/receiver
let rtcRtpCapabilitiesSend = RTCRtpSender.getCapabilities(kind);
let rtcRtpCapabilitiesRecv = RTCRtpReceiver.getCapabilities(kind);

// Receive remote capabilities from signaling
signaller.oncapability = (remote) => {
  // Conver capability to parameter
  let rtcRtpParametersSend = cap2param(rtcRtpCapabilitiesSend, remote.send);
  let rtcRtpParametersRecv = cap2param(rtcRtpCapabilitiesRecv, remote.recv);

  // send and receive a parameter
  rtcRtpSender.send(rtcRtpParametersSend);
  rtcRtpReceiver.receive(rtcRtpParametersRecv);

  // Now we can render/play
};

// Sending capabilities to remote via signaling
signaller.send("capability", {
  "send": rtcRtpCapabilitiesSend,
  "recv": rtcRtpCapabilitiesRecv,
});

/**
 * - simplify example
 * - fix javascript bug
 * - video/audio are only a copy/pasted
 * - signaling usually event driven
 */
