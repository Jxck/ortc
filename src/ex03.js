// Example of RTCIceCandidate
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

// Handle state changes
rtcIceGatherer.ongathererstatechange = (event) => {
  console.log("RTP ice gatherer state change", event.state);
};

// Handle local candidate
rtcIceGatherer.onlocalcandidate = (event) => {
  // Handle RTCIceCandidateComplete
  if (event.complete) {
    console.log("all candidates are gathered");
  }

  // Sending gathered candidate to remote via signaling.
  signaler.send("candidate", {
    candidate: event.candidate
  });
};

// Receive remote candidate from signaling
signaler.oncandidate = (candidateRemote) => {
  // May get multiple candidates
  // Handling Example are shown in Example 5
};



/**
 * - no handling RTCIceCandidateComplete describe on comment
 * - useless helper
 * - normalize all comments
 * - candidate is not response, just a events
 * - ICE gather options are only a dictionally but too strict style,
 *   even no ather codes are strict like this. so use same style with otheres.
 */
