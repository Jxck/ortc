// Set ICE gather options and construct the RTCIceGatherer object, assuming that
// we are using RTP/RTCP mux and A/V mux so that only one RTCIceTransport is needed.
// Include some helper functions
let rtcIceGatherOptions = new RTCIceGatherOptions({
  gatherPolicy: "relay",
  iceservers: [
    { urls: "stun:stun.example.net" },
    { urls: "turn:turn.example.org", username: "myName", credential: "myPassword" }
  ],
});

rtcIceGatherer.onlocalcandidate = function(event) {
  mySendLocalCandidate(event.candidate);
};
let rtcIceTransport = new RTCIceTransport(rtcIceGatherer);

// Create the RTCDtlsTransport object.
let RTCDtlsTransport = new RTCDtlsTransport(rtcIceTransport);
let rtcIdentity = new RTCIdentity(RTCDtlsTransport);

socket.on("assertion", (response) => {
  rtcIceTransport.start(rtcIceGatherer, response.ice, RTCIceRole.controlling);
  // Need to call RTCDtlsTransport.start() before setIdentityAssertion
  // so the peer assertion can be validated.
  RTCDtlsTransport.start(response.dtls);

  rtcIdentity
    .setIdentityAssertion(response.myAssertion)
    .then((peerAssertion) => {
      console.log(`Peer identity assertion validated. idp: ${peerAssertion.idp} name: ${peerAssertion.name}`);
    }).catch((e) => {
      console.log(`Could not validate peer assertion. idp: ${e.idp} Protocol: ${e.protocol}`);
    });
});

rtcIdentity
  .getIdentityAssertion("example.com", "default", "alice@example.com")
  .then((assertion) => {
    socket.send("assertion", {
      "myAssertion": assertion,
      "ice": rtcIceGatherer.getLocalParameters(),
      "dtls": RTCDtlsTransport.getLocalParameters()
    });
  }).catch((e) => {
    console.log(`Could not obtain an Identity Assertion. idp: ${e.idp} Protocol: ${e.protocol} loginUrl: ${e.loginUrl}`);
  });
