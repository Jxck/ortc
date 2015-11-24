// Example of forking when RTP and RTCP are not multiplexed,
// so that both RTP and RTCP IceGatherer and IceTransport objects
// are needed.
// Assume that we have a way to signaling by signaller.

// Create ICE gather options
let rtcIceGatherOptions = new RTCIceGatherOptions({
  gatherPolicy: "relay",
  iceservers: [
    { urls: "stun:stun.example.net" },
    { urls: "turn:turn.example.net", username: "myName", credential: "myPassword" }
  ],
});

// Create ICE gatherer
let rtcIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);
let rtcpIceGatherer = rtpIceGatherer.createAssociatedGatherer();

// Get Local Parameters
let rtcpIceParametersLocal = rtcpIceGatherer.getLocalParameters();
let userNameFragment = rtcIceParametersLocal.userNameFragment;

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

// Handle local candidate
rtcpIceGatherer.onlocalcandidate = (event) => {
  // Handle RTCIceCandidateComplete
  if (event.complete) {
    console.log("all candidates are gathered");
  }

  // Sending gathered candidate to remote via signaling.
  // with component and user name fragment
  signaller.send("candidate", {
    component: "RTCP",
    candidate: event.candidate,
    userNameFragment: userNameFragment,
  });
};

// Initialize the ICE transport arrays
let transports = {
  RTP: [],
  RTCP: [],
};

// Receive remote parameter from singaling
signaler.onparameters = (params) => {
  // May get multiple params

  // Create the ICE RTP and RTCP transports
  let rtcIceTransport = new RTCIceTransport(rtcIceGatherer);
  let rtcpIceTransport = rtcIceTransport.createAssociatedTransport();

  // Start the RTP and RTCP ICE transports so that outgoing ICE connectivity checks can begin.
  rtcIceTransport.start(rtcIceGatherer, params.rtpIceParameters, "controlling");
  rtcpIceTransport.start(rtcpIceGatherer, params.rtcpIceParameters, "controlling");

  // Push transport to transport arrays
  transports.RTP.push(rtcIceTransport);
  transports.RTCP.push(rtcpIceTransport);
});

// Receive remote candidate from signalling
signaller.oncandidate = (remote) => {
  // Locate the ICE transport that the signaled candidate
  // relates to by matching the userNameFragment.
  transports[remote.component].forEach((transport) => {
    if (transport.getRemoteParameters().userNameFragment === remote.userNameFragment) {
      transport.addRemoteCandidate(remote.candidate);
    }
  });
};

// Sending parameter to remote via signaling
signaler.send("parameters", {
  rtpIceParameters: iceRtpGatherer.getLocalParameters(),
  rtcpIceParameters: iceRtcpGatherer.getLocalParameters(),
});


/**
 * - better transport handling
 * - remote candidate event need to include userNameFragment
 */
