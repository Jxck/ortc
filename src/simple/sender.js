let $ = document.querySelector.bind(document);

let iceGatherer = null;
let iceTransport = null;
let dtlsTransport = null;
let localCandidates = [];
let sendVideoCaps = RTCRtpSender.getCapabilities('video');
let localCapsView = document.getElementById('local_caps');
let remoteCapsView = document.getElementById('remote_caps');

let remoteRecverCaps = null;

function prepare() {
  // Gatherer
  iceGatherer = new RTCIceGatherer({
    gatherPolicy: 'all',
    iceServers: [],
  });

  iceGatherer.addEventListener('localcandidate', (e) => {
    let candidate = e.candidate;
    console.log('localcandidate:', JSON.stringify(candidate));

    localCandidates.push(candidate);
    if (candidate.foundation === undefined) {
      console.log('--- end of local candidate ----');
    }
  });

  iceGatherer.addEventListener('gathererstatechange', (e) => {
    console.log('gathererstatechange:', JSON.stringify(e));
  });

  iceGatherer.addEventListener('error', (e) => {
    console.error('error:', err);
  });

  // IceTransport
  iceTransport = new RTCIceTransport(iceGatherer);
  iceTransport.addEventListener('icestatechange', () => {
    console.log('ICE transport state change', iceTransport.state);
  });

  // DtlsTransport
  dtlsTransport = new RTCDtlsTransport(iceTransport);
  dtlsTransport.addEventListener('dtlsstatechange', () => {
    console.log('DTLS transport state change', dtlsTransport.state);
  });
}

function acceptRemoteCaps() {
  let remoteCaps = JSON.parse(remoteCapsView.value);

  iceTransport.start(iceGatherer, remoteCaps.ice, 'controlling');
  dtlsTransport.start(remoteCaps.dtls);

  remoteCaps.localCandidates.forEach((candidate) => {
    iceTransport.addRemoteCandidate(candidate);
  });

  // for Sender
  remoteRecverCaps = remoteCaps.recvVideoCaps;

  localCapsView.focus();
  localCapsView.select();
}

function Sender() {
  console.info('sender');
  let videoSendParams = caps2params(1001, sendVideoCaps, remoteRecverCaps, null);

  navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': true,
  }).then((stream) => {
    let track = stream.getVideoTracks()[0];
    let videoSender = new RTCRtpSender(track, dtlsTransport);

    videoSender.onerror = (e) => console.error(e);

    videoSender.send(videoSendParams);
  }).catch(console.error.bind(console));
}

window.onload = () => {
  prepare();

  let socket = new Socket();

  socket.on('open', () => {
    $('#start').onclick = () => {
      let localCaps = {
        localCandidates: localCandidates,
        ice: iceGatherer.getLocalParameters(),
        dtls: dtlsTransport.getLocalParameters(),
        sendVideoCaps: sendVideoCaps,
      };

      let str = JSON.stringify(localCaps, ' ', ' ');
      localCapsView.value = str
      localCapsView.select();
      localCapsView.focus();

      socket.emit('fromSender', str);
    }

    socket.on('fromRecver', (e) => {
      remoteCapsView.value = e;
    });

    $('#accept').onclick = () => {
      acceptRemoteCaps();
    }

    $('#send').onclick = () => {
      Sender();
    }
  });
}
