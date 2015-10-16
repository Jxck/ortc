// Example of how to offer ICE and DTLS parameters and
// ICE candidates and get back ICE and DTLS parameters and ICE candidates,
// and start both ICE and DTLS, when RTP and RTCP are multiplexed.
// Assume that we have a way to signaling by signaller.

// Create ICE gather options
let rtcIceGatherOptions = new RTCIceGatherOptions({
  gatherPolicy: "relay",
  iceservers: [
    { urls: "stun:stun.example.net" },
    { urls: "turn:turn.example.org", username: "myName", credential: "myPassword" }
  ],
});

// Create ICE gatherer
let rtcIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);

// Handle local candidate
rtcIceGatherer.onlocalcandidate = (event) => {
  // Handle RTCIceCandidateComplete
  if (event.complete) {
    console.log("all candidates are gathered");
  }

  // Sending gathered candidate to remote via signaling.
  // with component and user name fragment
  signaler.send("candidate", {
    candidate: event.candidate,
    component: "RTP",
    userNameFragment: userNameFragment,
  });
};

// Create a ICE and DTLS transport
let rtcIceTransport = new RTCIceTransport(rtcIceGatherer);
let rtcDtlsTransport = new RTCDtlsTransport(rtcIceTransport);

// Receive remote candidate from signalling
socket.oncandidate = (candidateRemote) => {
  if (rtcpIceParametersRemote.userNameFragment !== candidateRemote.userNameFragment) return;
  rtcpIceTransport.addRemoteCandidate(candidateRemote.candidate);
};

// Receive remote parameter from singaling
socket.onparameters = (remote) => {
  rtcIceTransport.start(rtcIceGatherer, remote.rtcIceParameters, "controlling");
  rtcDtlsTransport.start(remote.rtcDtlsParameters);
});

// Sending parameter to remote via signaling
socket.send("parameters", {
  rtcIceParameters: rtcIceGatherer.getLocalParameters(),
  rtcDtlsParameters: rtcDtlsTransport.getLocalParameters(),
});

/**
 * - fix javascript layer bug
 * - fixing/format comments
 * - simplify example flow
 * - merge same behavior of initiate/accept
 */
