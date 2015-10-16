// This is an example of how to utilize distinct ICE transports for Audio and Video
// as well as for RTP and RTCP.  If both sides can multiplex audio/video
// and RTP/RTCP then the multiplexing will occur.
//
// Assume we have an audioTrack and a videoTrack to send.

// Create ICE gather options
let rtcIceGatherOptions = new RTCIceGatherOptions({
  gatherPolicy: "relay",
  iceservers: [
    { urls: "stun:stun.example.net" },
    { urls: "turn:turn.example.org", username: "myName", credential: "myPassword" }
  ],
});

// Create the RTP and RTCP ICE gatherers for audio and video
var audioRtpIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);
var audioRtcpIceGatherer = audioRtpIceGatherer.createAssociatedGatherer();
var videoRtpIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);
var videoRtcpIceGatherer = videoRtpIceGatherer.createAssociatedGatherer();

// Create the RTP and RTCP ICE transports for audio and video
var audioRtpIceTransport = new RTCIceTransport(audioRtpIceGatherer);
var audioRtcpIceTransport = audioRtpIceTransport.createAssociatedTransport();
var videoRtpIceTransport = new RTCIceTransport(videoRtpIceGatherer);
var videoRtcpIceTransport = audioRtpIceTransport.createAssociatedTransport();

// Enable local ICE candidates to be signaled to the remote peer.
audioRtpIceGatherer.onlocalcandidate = function(event) {
  mySendLocalCandidate(event.candidate, RTCIceComponent.RTP, "audio");
};
audioRtcpIceGatherer.onlocalcandidate = function(event) {
  mySendLocalCandidate(event.candidate, RTCIceComponent.RTCP, "audio");
};
videoRtpIceGatherer.onlocalcandidate = function(event) {
  mySendLocalCandidate(event.candidate, RTCIceComponent.RTP, "video");
};
videoRtcpIceGatherer.onlocalcandidate = function(event) {
  mySendLocalCandidate(event.candidate, RTCIceComponent.RTCP, "video");
};

// Set up the ICE state change event handlers
audioRtpIceTransport.onicestatechange = function(event) {
  myIceTransportStateChange("audioRtpIceTransport", event.state);
};
audioRtcpIceTransport.onicestatechange = function(event) {
  myIceTransportStateChange("audioRtcpIceTransport", event.state);
};
videoRtpIceTransport.onicestatechange = function(event) {
  myIceTransportStateChange("videoRtpIceTransport", event.state);
};
videoRtcpIceTransport.onicestatechange = function(event) {
  myIceTransportStateChange("videoRtcpIceTransport", event.state);
};

// Prepare to add ICE candidates signaled by the remote peer on any of the ICE transports
mySignaller.onRemoteCandidate = function(remote) {
  switch (remote.kind) {
    case "audio":
      if (remote.component === RTCIceComponent.RTP) {
        audioRtpIceTransport.addRemoteCandidate(remote.candidate);
      } else {
        audioRtcpIceTransport.addRemoteCandidate(remote.candidate);
      }
      break;
    case "video":
      if (remote.component === RTCIceComponent.RTP) {
        videoRtpIceTransport.addRemoteCandidate(remote.candidate);
      } else {
        videoRtcpIceTransport.addRemoteCandidate(remote.candidate);
      }
      break;
    default:
      trace("Invalid media type received: " + remote.kind);
  }
};

// Create the DTLS transports
var audioRtpDtlsTransport = new RTCDtlsTransport(audioRtpIceTransport);
var audioRtcpDtlsTransport = new RTCDtlsTransport(audioRtcpIceTransport);
var videoRtpDtlsTransport = new RTCDtlsTransport(videoRtpIceTransport);
var videoRtcpDtlsTransport = new RTCDtlsTransport(videoRtcpIceTransport);

// Create the sender and receiver objects
var audioSender = new RtpSender(audioTrack, audioRtpDtlsTransport, audioRtcpDtlsTransport);
var videoSender = new RtpSender(videoTrack, videoRtpDtlsTransport, videoRtcpDtlsTransport);
var audioReceiver = new RtpReceiver(audioRtpDtlsTransport, audioRtcpDtlsTransport);
var videoReceiver = new RtpReceiver(videoRtpDtlsTransport, videoRtcpDtlsTransport);

// Retrieve the receiver and sender capabilities
var recvAudioCaps = RTCRtpReceiver.getCapabilities("audio");
var recvVideoCaps = RTCRtpReceiver.getCapabilities("video");
var sendAudioCaps = RTCRtpSender.getCapabilities("audio");
var sendVideoCaps = RTCRtpSender.getCapabilities("video");

// Exchange ICE/DTLS parameters and Send/Receive capabilities

mySignaller.myOfferTracks({
  // Indicate that the initiator would prefer to multiplex both A/V and RTP/RTCP
  "bundle": true,
  // Indicate that the initiator is willing to multiplex RTP/RTCP without A/V mux
  "rtcpMux": true,
  // Offer the ICE parameters
  "audioRtpIce": audioRtpIceGatherer.getLocalParameters(),
  "audioRtcpIce": audioRtcpIceGatherer.getLocalParameters(),
  "videoRtpIce": videoRtpIceGatherer.getLocalParameters(),
  "videoRtcpIce": videoRtcpIceGatherer.getLocalParameters(),
  // Offer the DTLS parameters
  "audioRtpDtls": audioRtpDtlsTransport.getLocalParameters(),
  "audioRtcpDtls": audioRtcpDtlsTransport.getLocalParameters(),
  "videoRtpDtls": videoRtpDtlsTransport.getLocalParameters(),
  "videoRtcpDtls": videoRtcpDtlsTransport.getLocalParameters(),
  // Offer the receiver and sender audio and video capabilities.
  "recvAudioCaps": recvAudioCaps,
  "recvVideoCaps": recvVideoCaps,
  "sendAudioCaps": sendAudioCaps,
  "sendVideoCaps": sendVideoCaps
}, function(answer) {
  // The responder answers with its preferences, parameters and capabilities
  // Since we didn't create transport arrays, we are assuming that there is no forking (only one response)
  //
  // Derive the send and receive parameters, assuming that RTP/RTCP mux will be enabled.
  var audioSendParams = myCapsToSendParams(sendAudioCaps, answer.recvAudioCaps);
  var videoSendParams = myCapsToSendParams(sendVideoCaps, answer.recvVideoCaps);
  var audioRecvParams = myCapsToRecvParams(recvAudioCaps, answer.sendAudioCaps);
  var videoRecvParams = myCapsToRecvParams(recvVideoCaps, answer.sendVideoCaps);
  //
  // If the responder wishes to enable bundle, we will enable it
  if (answer.bundle) {
    // Since bundle implies RTP/RTCP multiplexing, we only need a single
    // ICE transport and DTLS transport.  No need for the ICE transport controller.
    audioRtpIceTransport.start(audioRtpIceGatherer, answer.audioRtpIce, RTCIceRole.controlling);
    audioRtpDtlsTransport.start(remote.audioRtpDtls);
    //
    // Replace the transport on the Sender and Receiver objects
    //
    audioSender.setTransport(audioRtpDtlsTransport);
    videoSender.setTransport(audioRtpDtlsTransport);
    audioReceiver.setTransport(audioRtpDtlsTransport);
    videoReceiver.setTransport(audioRtpDtlsTransport);
    // If BUNDLE was requested, then also assume RTP/RTCP mux
    answer.rtcpMux = true;
  } else {
    var controller = new RTCIceTransportController();
    if (answer.rtcpMux) {
      // The peer doesn't want BUNDLE, but it does want to multiplex RTP/RTCP
      // Now we need audio and video ICE transports
      // as well as an ICE Transport Controller object
      controller.addTransport(audioRtpIceTransport);
      controller.addTransport(videoRtpIceTransport);
      // Start the audio and video ICE transports
      audioRtpIceTransport.start(audioRtpIceGatherer, answer.audioRtpIce, RTCIceRole.controlling);
      videoRtpIceTransport.start(videoRtpIceGatherer, answer.videoRtpIce, RTCIceRole.controlling);
      // Start the audio and video DTLS transports
      audioRtpDtlsTransport.onerror = errorHandler;
      audioRtpDtlsTransport.start(answer.audioRtpDtls);
      videoRtpDtlsTransport.onerror = errorHandler;
      videoRtpDtlsTransport.start(answer.videoRtpDtls);
      // Replace the transport on the Sender and Receiver objects
      //
      audioSender.setTransport(audioRtpDtlsTransport);
      videoSender.setTransport(videoRtpDtlsTransport);
      audioReceiver.setTransport(audioRtpDtlsTransport);
      videoReceiver.setTransport(videoRtpDtlsTransport);
    } else {
      // We arrive here if the responder does not want BUNDLE
      // or RTP/RTCP multiplexing
      //
      // Now we need all the audio and video RTP and RTCP ICE transports
      // as well as an ICE Transport Controller object
      controller.addTransport(audioRtpIceTransport);
      controller.addTransport(videoRtpIceTransport);
      // Start the ICE transports
      audioRtpIceTransport.start(audioRtpIceGatherer, answer.audioRtpIce, RTCIceRole.controlling);
      audioRtcpIceTransport.start(audioRtcpIceGatherer, answer.audioRtcpIce, RTCIceRole.controlling);
      videoRtpIceTransport.start(videoRtpIceGatherer, answer.videoRtpIce, RTCIceRole.controlling);
      videoRtcpIceTransport.start(videoRtcpIceGatherer, answer.videoRtcpIce, RTCIceRole.controlling);
      // Start the DTLS transports that are needed
      audioRtpDtlsTransport.start(answer.audioRtpDtls);
      audioRtcpDtlsTransport.start(answer.audioRtcpDtls);
      videoRtpDtlsTransport.start(answer.videoRtpDtls);
      videoRtcpDtlsTransport.start(answer.videoRtcpDtls);
      // Disable RTP/RTCP multiplexing
      audioSendParams.rtcp.mux = false;
      videoSendParams.rtcp.mux = false;
      audioRecvParams.rtcp.mux = false;
      videoRecvParams.rtcp.mux = false;
    }
  }
  // Set the audio and video send and receive parameters.
  audioSender.send(audioSendParams);
  videoSender.send(videoSendParams);
  audioReceiver.receive(audioRecvParams);
  videoReceiver.receive(videoRecvParams);
});

// Now we can render/play audioReceiver.track and videoReceiver.track

/**
 * - fix tons of Typo (class, varb name)
 */
