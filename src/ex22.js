// Create ICE gather options
let rtcIceGatherOptions = new RTCIceGatherOptions({
  gatherPolicy: "relay",
  iceservers: [
    { urls: "stun:stun.example.net" },
    { urls: "turn:turn.example.org", username: "myName", credential: "myPassword" }
  ],
});

let rtcIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);
rtcIceGatherer.onlocalcandidate = (event) => {
  signaler.send("ice", {
    candidate: event.candidate
  });
};

// Create ICE, DTLS and SCTP transports
let rtcIceTransport = new RTCIceTransport(rtcIceGatherer);
let rtcDtlsTransport = new RTCDtlsTransport(rtcIceTransport);
let rtcSctpTransport = new RTCSctpTransport(rtcDtlsTransport);

// Construct RTCDataChannelParameters object
let rtcDataChannelParameters = new RTCDataChannelParameters();
let channel = new RTCDataChannel(rtcSctpTransport, rtcDataChannelParameters);

// Prepare to handle remote ICE candidates
signaler.oncandidate = (candidate) => {
  rtcIceTransport.addRemoteCandidate(candidate);
};

signaler.oncapabilities = (remote) => {
  rtcSctpTransport.start(remote.rtcSctpCapabilities);
};

signaler.send("capabilities", {
  // ... include ICE/DTLS info from other example.
  "rtcSctpCapabilities": RTCSctpTransport.getCapabilities()
});

rtcSctpTransport.ondatachannel = (channel) => {
  channel.onmessage = (message) => {
    console.log(message);
  };
  channel.send("bar");
};
