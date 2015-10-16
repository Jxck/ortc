let $ = document.querySelector.bind(document);

let iceGatherer = null;
let iceTransport = null;
let dtlsTransport = null;
let localCandidates = [];
let recvVideoCaps = RTCRtpReceiver.getCapabilities('video');
let localCapsView = document.getElementById('local_caps');
let remoteCapsView = document.getElementById('remote_caps');
let remoteVideo = document.getElementById('remote_video');
let remoteSenderCaps = null;

function prepare() {
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

  // IceTranport
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

  iceTransport.start(iceGatherer, remoteCaps.ice, 'controlled');
  dtlsTransport.start(remoteCaps.dtls);

  remoteCaps.localCandidates.forEach((candidate) => {
    iceTransport.addRemoteCandidate(candidate);
  });

  // for Receiver
  remoteSenderCaps = remoteCaps.sendVideoCaps;

  localCapsView.focus();
  localCapsView.select();
}

function Receiver() {
  console.info('receiver');
  let videoRecvParams = caps2params(1001, remoteSenderCaps, recvVideoCaps, null);
  let videoRecver = new RTCRtpReceiver(dtlsTransport, 'video');

  videoRecver.onerror = (e) => console.error(e);
  videoRecver.receive(videoRecvParams);

  let remoteStream = new MediaStream();
  remoteStream.addTrack(videoRecver.track);
  remoteVideo.srcObject = remoteStream;
}

window.onload = () => {
  prepare();

  let socket = new Socket();

  socket.on('open', () => {
    socket.on('fromSender', (e) => {
      remoteCapsView.value = e;
    });

    $('#accept').onclick = () => {
      acceptRemoteCaps();
      let localCaps = {
        localCandidates: localCandidates,
        ice: iceGatherer.getLocalParameters(),
        dtls: dtlsTransport.getLocalParameters(),
        recvVideoCaps: recvVideoCaps,
      };

      let str = JSON.stringify(localCaps, ' ', ' ');
      localCapsView.value = str;
      localCapsView.focus();
      localCapsView.select();

      socket.emit('fromRecver', str);
    }

    $('#receive').onclick = () => {
      Receiver();
    }
  });
}
