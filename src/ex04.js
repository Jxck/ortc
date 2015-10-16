// Helper functions used in all the examples (helper.js)
function trace(text) {
  // This function is used for logging.
  text = text.trimRight();
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ": " + text);
  } else {
    console.log(text);
  }
}

function errorHandler(error) {
  trace("Error encountered: " + error.name);
}

function mySendLocalCandidate(candidate, component, kind, parameters) {
  // Set default values
  kind = kind || "all";
  component = component || RTCIceComponent.RTP;
  parameters = parameters || null;

  // Signal the local candidate
  mySignaller.mySendLocalCandidate({
    "candidate": candidate,
    "component": component,
    "kind": kind,
    "parameters": parameters
  });
}

function myIceGathererStateChange(name, state) {
  switch (state) {
    case RTCIceGathererState.new:
      trace("IceGatherer: " + name + " Has been created");
      break;
    case RTCIceGathererState.gathering:
      trace("IceGatherer: " + name + " Is gathering candidates");
      break;
    case RTCIceGathererState.complete:
      trace("IceGatherer: " + name + " Has finished gathering (for now)");
      break;
    case RTCIceGathererState.closed:
      trace("IceGatherer: " + name + " Is closed");
      break;
    default:
      trace("IceGatherer: " + name + " Invalid state");
  }
}

function myIceTransportStateChange(name, state) {
  switch (state) {
    case RTCIceTransportState.new:
      trace("IceTransport: " + name + " Has been created");
      break;
    case RTCIceTransportState.checking:
      trace("IceTransport: " + name + " Is checking");
      break;
    case RTCIceTransportState.connected:
      trace("IceTransport: " + name + " Is connected");
      break;
    case RTCIceTransportState.disconnected:
      trace("IceTransport: " + name + " Is disconnected");
      break;
    case RTCIceTransportState.completed:
      trace("IceTransport: " + name + " Has finished checking (for now)");
      break;
    case RTCIceTransportState.failed:
      trace("IceTransport: " + name + " Has failed");
      break;
    case RTCIceTransportState.closed:
      trace("IceTransport: " + name + " Is closed");
      break;
    default:
      trace("IceTransport: " + name + " Invalid state");
  }
}

function myDtlsTransportStateChange(name, state){
  switch(state){
  case RTCDtlsTransportState.new:
     trace("DtlsTransport: " + name + " Has been created");
     break;
  case RTCDtlsTransportState.connecting:
     trace("DtlsTransport: " + name + " Is connecting");
     break;
  case RTCDtlsTransportState.connected:
     trace("DtlsTransport: " + name + " Is connected");
     break;
  case RTCDtlsTransportState.failed:
     trace("DtlsTransport: " + name + " Has failed");
     break;
  case RTCDtlsTransportState.closed:
     trace("DtlsTransport: " + name + " Is closed");
     break;
  default:
     trace("DtlsTransport: " + name + " Invalid state");
  }
}

/**
 * totally use less in Example
 */
