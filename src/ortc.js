/* eslint no-console:0, prefer-const:0, no-shadow:0, no-undef:0 */
class Util {
  static caps2params(senderCaps, receiverCaps) {
    let muxId = '';
    let codecs = Util.filterCodecParams(senderCaps.codecs, receiverCaps.codecs);
    let headerExtensions = Util.filterHdrExtParams(senderCaps.headerExtensions, receiverCaps.headerExtensions);
    let encodings = [];

    // RTCRtcpParameters
    let rtcp = {
      ssrc: 0,
      cname: '',
      reducedSize: false,
      mux: true,
    };

    // RTCRtpParameters
    return { muxId, codecs, headerExtensions, encodings, rtcp };
  }

  static filterCodecParams(left, right) {
    let codecPrms = [];

    if (left && right) {
      left.forEach((leftItem) => {
        for (let i = 0; i < right.length; i++) {
          let codec = right[i];
          let equality = leftItem.name === codec.name
           && leftItem.kind === codec.kind
           && leftItem.preferredPayloadType === codec.preferredPayloadType
           && leftItem.numChannels === codec.numChannels;

          if (equality) {
            let codecParams = {
              name: codec.name,
              payloadType: codec.preferredPayloadType,
              clockRate: codec.clockRate,
              numChannels: codec.numChannels,
              rtcpFeedback: codec.rtcpFeedback,
              parameters: codec.parameters,
            };
            codecPrms.push(codecParams);

            break;
          }
        }
      });
    }

    return codecPrms;
  }

  static filterHdrExtParams(left, right) {
    let hdrExtPrms = [];
    return hdrExtPrms;
  }

  static rtcRtpEncodingParameters(ssrc, codecPayloadType, fec, rtx, priority, maxBitrate, minQuality, framerateBias, resolutionScale, framerateScale, active, encodingId, dependencyEncodingId) {
    codecPayloadType = codecPayloadType || 0;
    fec = fec || 0;
    rtx = rtx || 0;
    priority = priority || 1.0;
    maxBitrate = maxBitrate || 2000000.0;
    minQuality = minQuality || 0;
    framerateBias = framerateBias || 0.5;
    resolutionScale = resolutionScale || 1.0;
    framerateScale = framerateScale || 1.0;
    active = active || true;

    return {
      ssrc,
      codecPayloadType,
      fec,
      rtx,
      priority,
      maxBitrate,
      minQuality,
      framerateBias,
      resolutionScale,
      framerateScale,
      active,
      encodingId,
      dependencyEncodingId,
    };
  }
}

function caps2params(ssrc, senderCaps, receiverCaps, muxId) {
  let encodingParams = Util.rtcRtpEncodingParameters(ssrc);
  let params = Util.caps2params(senderCaps, receiverCaps);
  if (muxId !== undefined) params.muxId = muxId;
  params.encodings.push(encodingParams);
  return params;
}

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(name, callback) {
    let callbacks = this.events[name] || [];
    callbacks.push(callback);
    this.events[name] = callbacks;
  }

  emit(name, ...params) {
    setTimeout(() => {
      let callbacks = this.events[name] || [];
      callbacks.forEach((callback) => {
        callback.apply(null, params);
      });
    }, 0);
  }
}

class Transport extends EventEmitter {
  constructor(transport) {
    super();
    this.transport = transport;
  }

  createSender(track, ssrc) {
    console.log('createSender', track.kind, track.label);
    let kind = track.kind;
    this.ssrc = ssrc;
    this.sender = new RTCRtpSender(track, this.transport);

    this.sender.onerror = (e) => cosnole.log(e);

    this.senderCaps = RTCRtpSender.getCapabilities(kind);
    return {
      ssrc: this.ssrc,
      transport: 'sender',
      kind: kind,
      caps: this.senderCaps,
      muxId: null,
    };
  }

  createReceiver(kind) {
    console.info('createReceiver', kind);
    this.receiver = new RTCRtpReceiver(this.transport, kind);

    this.receiver.onerror = (e) => console.log(e);

    this.receiverCaps = RTCRtpReceiver.getCapabilities(kind);
    return {
      transport: 'receiver',
      kind: kind,
      caps: this.receiverCaps,
    };
  }

  send(receiverCaps) {
    let params = caps2params(this.ssrc, this.senderCaps, receiverCaps);
    this.sender.send(params);
  }

  receive(ssrc, senderCaps, muxId) {
    let params = caps2params(ssrc, senderCaps, this.receiverCaps, muxId);
    this.receiver.receive(params);
  }
}


class ORTC extends EventEmitter {

  constructor(role) {
    super();

    // controlling/controlled
    this.role = role;
  }

  addRemoteCandidate(candidate) {
    this.iceTransport.addRemoteCandidate(candidate);
  }

  start(params) {
    this.iceTransport.start(this.iceGatherer, params.iceParams, this.role);
    this.dtlsTransport.start(params.dtlsParams);
  }

  connect(iceGatherOptions) {
    iceGatherOptions = iceGatherOptions || { gatherPolicy: 'all', iceServers: []};

    this.on('candidate:complete', () => {
      let iceParams = this.iceGatherer.getLocalParameters();
      let dtlsParams = this.dtlsTransport.getLocalParameters();

      this.emit('params', { iceParams, dtlsParams });
    });

    // RTCIceGatherer
    this.iceGatherer = new RTCIceGatherer(iceGatherOptions);
    this.iceGatherer.onlocalcandidate = (e) => {
      let candidate = e.candidate;
      console.log(JSON.stringify(candidate));

      // complete が実装されてなく {} が上がってくるので
      // 絶対ありそうなプロパティの有無でそっちを調べている
      if (e.complete || candidate.foundation === undefined) {
        return this.emit('candidate:complete', { complete: true });
      }

      this.emit('candidate', candidate);
    };

    this.iceGatherer.ongatherstatechange = (e) => console.error(e);
    this.iceGatherer.onerror = (e) => console.error(e);

    // RTCIceTransport
    this.iceTransport = new RTCIceTransport();
    this.iceTransport.onicestatechange = (e) => {
      console.log('ICE State Change', this.iceTransport.state, e.state);
    };

    this.iceTransport.oncandidatepairchange = (e) => console.error(e);

    // RTCDtlsTransport
    this.dtlsTransport = new RTCDtlsTransport(this.iceTransport);
    this.dtlsTransport.ondtlsstatechange = (e) => {
      console.log('DTLS State Change', this.dtlsTransport.state, e.state);
    };

    this.dtlsTransport.onerror = (e) => console.error(e);
  }
}

window.onload = () => {
  // init
  let $id = document.getElementById('id');
  let $peer = document.getElementById('peer');

  let $connect = document.getElementById('connect');
  let $start = document.getElementById('start');

  let $local = document.getElementById('local');
  let $remote = document.getElementById('remote');

  let $text = document.getElementById('text');
  let $send = document.getElementById('send');
  let $view = document.getElementById('view');

  let id = location.hash.replace('#', '');
  console.log(id);
  let peer = id === 'desk' ? 'note' : 'desk';


  $id.innerHTML = id;
  $peer.value = peer;
  $view.value = '';

  // socket
  let socket = new Socket();
  socket.on('close', console.log.bind(console));
  socket.on('error', console.log.bind(console));

  socket.on('open', () => {
    console.log('open');

    // chat
    socket.on('message', (e) => {
      $view.value = JSON.stringify(JSON.parse(e), ' ', ' ');
      $view.value += '\n';
    });

    $send.onclick = () => {
      let message = $text.value;
      socket.emit('message', message);
      $text.value = '';
    };

    main(socket);
  });

  function main(socket) {
    $connect.addEventListener('click', () => {
      socket.emit('request', {
        from: id,
        to: peer,
      });
    });

    socket.on('request', (e) => {
      if (e.to !== id) return;
      console.info('--- ::request ---');
      console.log(JSON.stringify(e));

      let peer = e.from;
      socket.emit('response', {
        from: id,
        to: peer,
      });
    });

    socket.on('response', (e) => {
      if (e.to !== id) return;
      console.info('--- ::response---');
      console.log(JSON.stringify(e));

      let peer = e.from;
      socket.emit('start', {
        from: id,
        to: peer,
        role: {
          [id]: 'controlling',
          [peer]: 'controlled',
        },
      });
    });

    socket.on('start', (e) => {
      console.info('--- ::start ---');
      console.log(JSON.stringify(e));

      let role = e.role[id];
      let ortc = new ORTC(role);

      socket.on('candidate', (e) => {
        if (e.to !== id) return;
        console.info('--- remote candidate', e);

        ortc.addRemoteCandidate(e.candidate);
      });

      socket.on('candidate:complete', (e) => {
        if (e.to !== id) return;
        console.info('--- remote candidate:complete');
        ortc.addRemoteCandidate(e);
      });

      ortc.on('candidate', (candidate) => {
        console.info('local candidate ---');

        socket.emit('candidate', {
          from: id,
          to: peer,
          candidate: candidate,
        });
      });

      ortc.on('candidate:complete', (e) => {
        console.info('local candiate:complete ---');
        socket.emit('candidate:complete', {
          from: id,
          to: peer,
          candidate: e,
        });
      });

      ortc.on('params', (params) => {
        console.info('local params ---');
        socket.emit('params', {
          from: id,
          to: peer,
          params: params,
        });
      });


      // リモートの params を受け取ったら
      let remoteParams = new Promise((resolve, reject) => {
        socket.on('params', (e) => {
          if (e.to !== id) return;
          console.info('--- remote params');

          resolve(e.params);
        });
      });

      // ローカルの candidate 生成が終わったら
      let localCandidateComplete = new Promise((resolve, reject) => {
        ortc.on('candidate:complete', () => {
          console.info('local candiate:complete ---(promise)');
          resolve();
        });
      });

      // 両方が終わったら start() できる。
      Promise.all([remoteParams, localCandidateComplete]).then((e) => {
        // console.clear();
        console.info('------------ start now ------------');
        let params = e[0];
        ortc.start(params);

        camera(ortc, socket);
      });

      // 開始
      ortc.connect();
    });

    function camera(ortc, socket) {
      let transport = {
        video: new Transport(ortc.dtlsTransport),
      };

      socket.on('caps:send', (e) => {
        if (e.to !== id) return;
        console.info('--- remote caps:send', JSON.stringify(e.params));

        let remoteParams = e.params;
        let localVideoParams = transport.video.createReceiver(remoteParams.video.kind);

        socket.emit('caps:recv', {
          from: id,
          to: peer,
          params: {
            video: localVideoParams,
          },
        });

        transport.video.receive(remoteParams.video.ssrc, remoteParams.video.caps, remoteParams.video.muxId);

        let renderStream = new MediaStream();

        renderStream.onactive = () => {
          console.log('renderStream.active', renderStream.active);
          $remote.srcObject = renderStream;
        };

        renderStream.oninactive = console.log.bind(console);
        renderStream.onaddtrack = console.log.bind(console);
        renderStream.onremovetrack = console.log.bind(console);

        console.log(transport.video.receiver.track);

        renderStream.addTrack(transport.video.receiver.track);
      });

      socket.on('caps:recv', (e) => {
        if (e.to !== id) return;
        console.info('--- remote caps:recv', JSON.stringify(e.params));

        let params = e.params;
        transport.video.send(params.video.caps);
      });

      function send(stream) {
        let videoTrack = stream.getVideoTracks()[0];

        let params = {
          video: transport.video.createSender(videoTrack, 1001),
        };

        socket.emit('caps:send', {
          from: id,
          to: peer,
          params: params,
        });
      }

      $start.onclick = () => {
        navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        }).then((stream) => {
          console.info('---- getUserMedia ----');
          $local.srcObject = stream;
          return stream;
        }).then((stream) => {
          send(stream);
        }).catch(console.error.bind(console));
      };
    }
  }
};
