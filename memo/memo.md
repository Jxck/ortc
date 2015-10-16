# 1. Overview

Object Real-Time Communications (ORTC) provides a powerful API for the development of WebRTC based applications.
ORTC は WebRTC ベースのアプリをつくる強力な API を提供する。

ORTC does not utilize Session Description Protocol (SDP) in the API,
nor does it mandate support for the Offer/Answer state machine (though an application is free to choose SDP and Offer/Answer as an on-the-wire signaling mechanism).
ORTC は SDP を API に提供しないし、 Offer/Answer の状態管理を必須としない。(シグナリングメカニズムとして、SDP と offer/answer の選択が自由)

Instead, ORTC uses "sender", "receiver" and "transport" objects,
which have "capabilities" describing what they are capable of doing,
as well as "parameters" which define what they are configured to do.

かわりに ORTC は sender/receiver/transport を持つ。
それぞれ capabilities があり、何ができるのか取れる。
parameter もあり、どう設定されたかが取れる。

"Tracks" are encoded by senders and sent over transports,
then decoded by receivers while "data channels" are sent over transports directly.
"Tracks" は、 sender でエンコードされ送信される、 receiver でデコードされる。
data channel は直接やり取りされる。

In a Javascript application utilizing the ORTC API,
the relationship between the application and the objects,
as well as between the objects themselves is shown below.
Horizontal or slanted arrows denote the flow of media or data,
whereas vertical arrows denote interactions via methods and events.

ORTC を JS で使うときの対応は以下。
水平方向がメディアの流れ、垂直方向がイベントとメソッド。


![ORTC の image]


In the figure above, the RTCRtpSender (Section 5) encodes the track provided as input, which is transported over a RTCDtlsTransport (Section 4).
An RTCDataChannel (Section 11) utilizes an RTCSctpTransport (Section 12) which can also be multiplexed over the RTCDtlsTransport.
Sending of Dual Tone Multi Frequency (DTMF) tones is supported via the RTCDtmfSender (Section 10).

RTCRtpSender は入力されたトラックをエンコードし、
RTCDtlsTransport がそれを送信する。
RTCDataChannel は RTCSctpTransport を使い、 RTCSctpTransport は RTCDtlsTransport 上に多重化されている。
Dual Tone Multi Frequency (DTMF) は RTCDtmfSender で送れる。

The RTCDtlsTransport utilizes an RTCIceTransport (Section 3) to select a communication path to reach the receiving peer's RTCIceTransport,
which is in turn associated with an RTCDtlsTransport which de-multiplexes media to the RTCRtpReceiver (Section 6)
and data to the RTCSctpTransport and RTCDataChannel.
The RTCRtpReceiver then decodes media, producing a track which is rendered by an audio or video tag.

RTCDtlsTransport は RTCIceTransport を使い、 peer への経路を選択する。
多重化された media を分解して、 RTCRtpReceiver に RTCDtlsTransport に順々に紐付けられる、
RTCSctpTransport と RTCDataChannel にデータを送る
RTCRtpReceiver はメディアをデコードして track を生成する。


Several other objects also play a role.
The RTCIceGatherer (Section 2) gathers local ICE candidates for use by one or more RTCIceTransport objects, enabling forking scenarios.
The RTCIceTransportController (Section 7) manages freezing/unfreezing (defined in [RFC5245]) and bandwidth estimation.
The RTCRtpListener (Section 8) detects whether an RTP stream is received that cannot be delivered to any existing RTCRtpReceiver,
providing an onunhandledrtp event handler that the application can use to correct the situation.

RTCIceGatherer は local ICE candidate を集め RTCIceTransport に送る。fork できるように複数の RTCIceTransport に紐付けられる。
RTCIceTransportController は freezing/unfreezing と帯域推定を管理する。
RTCRtpListener は RTP stream が、どの RTCRtpReceiver へも送信できなかったことを onunhandledrtp イベントで検出する。


Remaining sections of the specification fill in details relating to RTP capabilities and parameters, operational statistics, media authentication via Identity Providers (IdP) and compatibility with the WebRTC 1.0 API.
RTP dictionaries are described in Section 9, the Statistics API is described in Section 13, the Identity API is described in Section 14, an event summary is provided in Section 15, and WebRTC 1.0 compatibility issues are discussed in Section 16.

残りのセクションは、 RTP の capabilities と parameters, stats, IdP, WebRTC との互換などが書かれている。


# 1.1 Terminology

## SVC

- SST: Single-Session Transmission
- MST: Multi-Session Transmission

ORTC は SST だけ。

- SRST: Single Real-time transport protocol stream Single Transport
- SSRC: stream and synchronization source

```

                      +----------------+
                      |  Media Source  |
                      +----------------+
                              |
                              |
                              V
 +---------------------------------------------------------+
 |                      Media Encoder                      |
 +---------------------------------------------------------+
         |                    |                     |
  Encoded Stream       Dependent Stream     Dependent Stream
         |                    |                     |
         V                    V                     V
 +----------------+   +----------------+   +----------------+
 |Media Packetizer|   |Media Packetizer|   |Media Packetizer|
 +----------------+   +----------------+   +----------------+
         |                    |                     |
    RTP Stream           RTP Stream            RTP Stream
         |                    |                     |
         +------+      +------+                     |
                |      |                            |
                V      V                            V
          +-----------------+              +-----------------+
          | Media Transport |              | Media Transport |
          +-----------------+              +-----------------+

Figure 9: Example of Media Source Layered Dependency
https://tools.ietf.org/html/draft-ietf-avtext-rtp-grouping-taxonomy-08#section-3.6
```


## SRST: Single RTP Stream on a Single Media Transport

SVC のレイヤを SSRC で単一 RTP で送る


## MRST: Multiple RTP Streams on a Single Media Transport

SVC のレイヤを、個別に SSRC を使って複数の RTP で送る


## RTP(Real-time Transport Protocol)

VoIP 系でよくつかわれる。
UDP 上でリアルタイム通信すると以下が起こる

- Jitter (ゆらぎ)
- Out Of Oder (順序逆転)
- Loss (消失)

Timestamp で jitter を
Sequence Number で OoO を対策する
映像などなので Loss しても再送はしない


## RTCP(Real-time Transport Control Protocol)

RTP はペイロードを転送するだけに対して、
RTCP はそのセッションを制御するプロトコル。(両方あわせて使う)

- RR (receiver report)
- SR (sender report)
- SDES (source description)
- APP (application defined)
- BYE

SR/RR で、パケロスや RTT などの品質がわかる。
マルチキャストを意識して作られている。


## SSRC(Synchronization Source)

RTP セッション参加者(送信元)の識別子


## SRTP(Secure RTP)

WebRTC のメディアストリームで使われる。
DTLS で暗号化した RTP



## DTLS(Datagram TLS)

TLS に TCP のような再送制御(retransmission)などをつけたもの
DLTS = TLS + TCP


## SCTP(Stream Control Transmission Protocol)

WebRTC の DataChannel で使われる
SCTP は TCP と似て、到達順序保証や輻輳制御を行うが、
バイト指向ではなくフレーム・メッセージ指向なので、 HTTP2 にも似てる。
マルチホーミング(複数経路)が可能。


## ICE: Interactive Connectivity Establishment

ice candidate

- ip
- protocol
- port
- etc


候補を収集し、 SDP 形式でシグナリングで交換する。
交換が完了したら、相手の情報とマージして Hole Punching を開始する。
候補が決まったら flag 付き STUD で教える。


----

# 2. The RTCIceGatherer Object

ICE に必要な local host, server reflexive, relay の candidate を収集
RTCIceTransport に紐づけるが、これをマルチ(parallel forking) でできるようにもなっている。


2.1 Overview

複数の RTCIceTransport に紐づけられる
最低一つの RTCIceTransport が紐づけられ、紐づけられた全てが completed か failed になるまでは、 local candidate を捨てない。

TODO: incoming connectivity check について

## 2.2-3 Operation

```js
let rtcIceGatherOptions = new RTCIceGatherOptions();
let rtcIceGatherer = new RTCIceGatherer(rtcIceGatherOptions);

let rtcIceComponent = rtcIceGatherer.component;
// "RTP", "RTCP"

let rtcIceGathererState = rtcIceGatherer.state;
// "new", "gathering", "complete", "closed"

// 全ての候補を上げてポートを閉じる
// 紐づいた transport は "disconnected" になる
rtcIceGatherer.close();

// RTCP のために紐づいた gatherer を返す
// 一回以上呼ぶとエラー
let rtcIceGatherer = rtcIceGatherer.createAssociatedGatherer();

// まだ上げられてない候補を集めて返す
let rtcIceCandidates = rtcIceGatherer.getLocalCandidates();

// ICE パラメータを返す(2.4)
let rtcIceParameters = rtcIceGatherer.getLocalParameters();
// { usernameFragment: 'xxx', password: 'yyy' }

rtcIceGatherer.ongathererstatechange = (event) => {
  console.log(event.state); // RTCIceGathererState
  // "new", "gathering", "complete", "closed"
}

// ICE 候補が発生するたびに発火
// オブジェクトができた瞬間に候補収集が始まるので、
// このハンドラが登録されるまでは内部に蓄積される
// 最後の候補が発火するときは complete も true になる
rtcIceGatherer.onlocalcandidate = (event) => {
  if (event.complete === true) {
    console.log('complete');
  }
  console.log(event.candidate); // 2.5
  // {
  //   foundation: "abcd1234",
  //   priority: 1694498815,
  //   ip: "192.0.2.33",
  //   protocol: "udp", // "tcp", "udp"
  //   port: 10000,
  //   type: "host" // "host", "srflx", "prflx", "relay" (2.5.4)
  //   tcpType: "active", // "active", "passive", "so" (2.5.3)
  //   relatedAddress: "";
  //   relatedPort: 999;
  // }
}

rtcIceGatherer.onerror = console.error.bind(console);
```

### 2.5.3 The RTCIceTcpCandidateType

- active: outboud は試みるが、incomming は受け付けない
- passive: outboud は試みないが、incomming は受け付ける
- so: 両方やってコネクションを開く



# 3. The RTCIceTransport Object

- ice に関する情報を持つ
- transport に紐づく (RTCDtlsTransport など)
- RTC に関するメソッドを提供
- RTCIceGatherer から生成
- state: closed か component: RTCP だと例外


## 3.3

```js
let rtcIceTransport =  new RTCIceTransport(rtcIceGatherer);

let rtcIceComponent = rtcIceTransport.component;
// "RTP", "RTCP"

// コンストラクタか start() に渡された gatherer
let iceGatherer = rtcIceTransport.iceGatherer;

let role = rtcIceTransport.role;
// "controlling", "controlled"

let state = rtcIceTransport.state;
// RTCIceTransportState

rtcIceTransport.oncandidatepairchange = (event) => {
  console.log(event.pair);
  // {
  //   "local": "xxxx",
  //   "remote": "yyyy"
  // }
}

rtcIceTransport.onicestatechange = (event) => {
  console.log(event.state);
  // "new",
  // "checking",
  // "connected",
  // "completed",
  // "disconnected",
  // "failed",
  // "closed"
}

// remote の RTCIceTransport に紐づいた候補をセット
rtcIceTransport.addRemoteCandidate(rtcIceGatherCandidateRemote);

// remote の RTCIceTransport に紐づいた候補を配列でセット
rtcIceTransport.setRemoteCandidates(rtcIceCandidatesRemotes);

// add/setRemoteCandidate した結果を配列で返す
let rtcIceCandidates = rtcIceTransport.getRemoteCandidates();

// RTCP 用の transport を作る
// component が RTP であることが前提
let rtcIceTransport = rtcIceTransport.createAssociatedTransport();

// ノミネートされた候補を返す
// ノミネートできてなかったり、失敗してたら null
let rtcIceCandidatePair = rtcIceTransport.getNominatedCandidatePair();

// remote の transport の ICE パラメータを返す
let rtcIceParameters = rtcIceTransport.getRemoteParameters();

// close して、 RTCIceTransportController を remove
rtcIceTransport.stop();


rtcIceTransport.start(rtcIceGatherer, rtcIceParametersRemote, rtcIceRole);
```

## 3.3.2 Methods#start

最初の start() で、候補の接続確認を行い、 ICE Transport がリモートの RTCIceTransport に接続しにいく。
gatherer.component と iceTransport.component が違うと InvalidParameters Exception
gatherer.state が "closed" だと InvalidStateError Exception

再度 start() すると、 RTCIceTransportState が "connected" になり、 remote candidate が flush されるので、 addRemoteCandidate() or setRemoteCandidates() で remote candidate を再設定する必要がある。

新しい RTCIceGatherer で start() し直すと、 ICE restart が発生する。

start() は gatherer の username fragment と password を変更しないので、 start() が同じ値の gatherer で呼ばれると、既存の local candidate が再利用され、 ICE の username fragment と password が 保存される。それ以外の場合の挙動は未定。

接続チェックの受信は、 local/remote username fragment と local password を使い、一方送信は local/remote username fragment と remote password を使う。

remote username fragment と password 同様、 start() はロール情報を提供するため、 start() が呼ばれたら RTCIceTransport が、接続チェックを開始するのと同様に、設定されたロールをもとに、接続チェックに応答できる。


## 3.6 enum RTCIceTransportState

```js
rtpIceTransport.onicestatechange = function(event) {
  console.log(event.state);
  // "new",
  // "checking",
  // "connected",
  // "completed",
  // "disconnected",
  // "failed",
  // "closed"
}
```

```
                  +-------+
                  |  new  | (from any)
                  +---+---+
                      |
                      |
                      v
+----------+    +-----+-----+    +-----------+    +------------+
|  feiled  +<-->+ checking  +<-->+ connected +<-->+ compeleted |
+----+-----+    +-----+-----+    +-----+-----+    +-----+------+
     ^                ^                ^                ^
     |                |                |                |
     v                v                v                v
     +----------------+-------+--------+----------------+
                              ^                                        
                              |
                              v
                      +-------+-------+   +--------+
                      | disconnected  |   | closed | (from any)
                      +----------------   +--------+
```


## 3.9 The RTCIceServer Object

STUN/TURN server の設定

```js
[
  { urls: "stun:stun1.example.net" },
  { urls: "turn:turn.example.org", username: "user", credential: "myPassword" }
]
```



## 3.11


```js
let gatherOptions = {
  gatherPolicy: 'relay',
  iceservers: [
    { urls: 'stun:stun1.example.net' },
    { urls: 'turn:turn.example.org', username: 'user', credential: 'myPassword' }
  ]
};

let rtpIceGatherer = new RTCIceGatherer(gatherOptions);
let rtcIceParameters = rtpIceGatherer.getLocalParameters();

rtpIceGatherer.onlocalcandidate = (event) => {
  socket.send('candidate', {
    candidate: event.candidate,
    userNameFragment: rtcIceParameters.userNameFragment,
  });
};

let rtcIceTransport = new RTCIceTransport(rtpIceGatherer);

socket.on('candidate', (candidateRemote) => {
  let rtcIceParametersRemote = rtcIceTransport.getRemoteParameters();
  if (rtcIceParametersRemote.userNameFragment !== candidateRemote.userNameFragment) return;

  rtcIceTransport.addRemoteCandidate(candidateRemote.candidate);
});

socket.on('parameters', (rtcIceParametersRemote) => {
  if (rtcIceTransport.component !== rtcIceGatherer.component) return
  if (rtcIceGatherer.state === 'closed') return

  rtcIceTransport.start(rtcIceGatherer, rtcIceParametersRemote, 'controlling');
});

socket.send('parameters', rtcIceParameters);
```


# 4.The RTCDtlsTransport Object

DTLS の情報を持つ。

- 以下どれかに紐づける
 - RTCRtpSender
 - RTCRtpReceiver
 - RTCSctpTransport


## 4.2 Operation

RTCDtlsTransport は RTCIceTransport から作る。

RTP RTCDtlsTransport は、紐づけられた RTCP RTCDtlsTransport と certificate と fingerprints を共有する必要がある。

Therefore when an RTCDtlsTransport is constructed from an RTCIceTransport,
the implementation must check whether an associated RTCDtlsTransport has already been constructed and if so,
must reuse the certificate and fingerprint(s) of the associated RTCDtlsTransport.

RTCDtlsTransport は RTCIceTransport から作るので、実装者は紐づいた RTCDtlsTransport がすでに生成されているかを確認し
あるなら、その RTCDtlsTransport の certificate と fingerprints を使いまわす必要がある。


A newly constructed RTCDtlsTransport must listen and respond to incoming DTLS packets before start() is called.
あたらしく作られた RTCDtlsTransport は start() する前に、受信した DTLS パケットを listen/respond しないといけない。


However, to complete the negotiation it is necessary to verify the remote fingerprint, which is dependent on remoteParameters, passed to start().
しかし、 start() に渡された remoteParameters に依存するものの、ネゴシエーションが完了するために remote の fingerprint を verify する必要がある


After the DTLS handshake exchange completes (but before the remote fingerprint is verified) incoming media packets may be received.
A modest buffer must be provided to avoid loss of media prior to remote fingerprint validation (which can begin after start() is called).

DTLS ハンドシェイクの交換が完了し、まだ remote fingerprint を verified してない時点では、メディアパケットを受信するかもしれない。
remote fingerprint validation (start() の後に始まる) の前に受信するメディアのパケットロスすのを防ぐため、多少バッファが提供されるべき。

If an attempt is made to construct a RTCDtlsTransport instance from an RTCIceTransport in the "closed" state, an InvalidStateError exception is thrown.
RTCIceTransport の "closed" ステートから RTCDtlsTransport を生成しようとしたら InvalidStateError


Since the Datagram Transport Layer Security (DTLS) negotiation occurs between transport endpoints determined via ICE,
implementations of this specification must support multiplexing of STUN, TURN, DTLS and RTP and/or RTCP.
This multiplexing, originally described in [RFC5764] Section 5.1.2, is being revised in [MUX-FIXES].

DTLS ネゴシエーションは、ICE で決定されたエンドポイント間で発生するため
この仕様の実装では、 STUN, TURN, DTLS and RTP and/or RTCP を多重化する必要がある。


## 4.3 Interface Definition


```js
let rtcDtlsTransport = new RTCDtlsTransport(rtcIceTransport);

let rtcIceTransport       = rtcDtlsTransport.transport;
// RTCIceTransport

let rtcDtlsTransportState = rtcDtlsTransport.state;
// DTLSTransportState

let rtcDtlsParametersLocal  = rtcDtlsTransport.getLocalParameters();
let rtcDtlsParametersRemote = rtcDtlsTransport.getRemoteParameters();
let remoteCerfiticates      = rtcDtlsTransport.getRemoteCertificates();

rtcDtlsTransport.ondtlsstatechange = (event) => {
  console.log(event.state);
  // "new", "connecting", "connected", "closed"
};

rtcDtlsTransport.onerror = console.error.bind(error);

rtcDtlsTransport.stop();

let rtcDtlsParameters = {
  role: "auto", // "auto", "client", "server"
  fingerprints: [{ algorithm: "xxx", value: "yyy" }],
}

rtcDtlsTransport.start(rtcDtlsParameters);
```


## 4.3.2 Methods#start()

Start DTLS transport negotiation with the parameters of the remote DTLS transport,
including verification of the remote fingerprint, then once the DTLS transport session is established,
negotiate a DTLS-SRTP [RFC5764] session to establish keys so as protect media using SRTP [RFC3711].

リモートの DLTS transport のパラメータでネゴシエーションを始める
ここにリモート fingerprint の検証も含む
DTLS transport セッションが一旦確立すれば
メディアを保護する SRTP のために DTLS-SRTP のネゴシエーションをする。



Since symmetric RTP [RFC4961] is utilized, the DTLS-SRTP session is bi-directional.
シンメトリック RTP が使われているため、 DTLS-SRTP セッションは双方向

If remoteParameters is invalid, throw an InvalidParameters exception.
リモートパラメータが invalid だったら、 InvalidParameters Exception を投げる

If start() is called after a previous start() call, or if state is "closed",
throw an InvalidStateError exception.
start() が二階呼ばれたか、 state が closed だったら
InvalidStateError を上げる

Only a single DTLS transport can be multiplexed over an ICE transport.
一本の DTLS transport だけが ICE transport の上に多重化できる

Therefore if a RTCDtlsTransport object dtlsTransportB is constructed with an RTCIceTransport object
iceTransport previously used to construct another RTCDtlsTransport object dtlsTransportA,

したがって、もし RTCDtlsTransport オブジェクト B を作るのに使った RTCIceTransport が RTCDtlsTransport A ですでに使われていた場合、

then if dtlsTransportB.start() is called prior to having called dtlsTransportA.stop(), then throw an InvalidStateError exception.
A.stop() より先に B.start() 呼ぶと InvalidStateError exception.



### 4.6 RTCDtlsRole

auto:
  The DTLS role is determined based on the resolved ICE role: the "controlled" role acts as the DTLS client,
  the "controlling" role acts as the DTLS server.

  DTLS のロールは、解決した ICE のロールを元に決まる。 "controlled" は DTLS クライアント、 "controlling" がサーバ

  Since RTCDtlsRole is initialized to "auto" on construction of an RTCDtlsTransport object,
  transport.getLocalParameters().RTCDtlsRole will have an initial value of "auto".

  RTCDtlsTransport の生成時 RTCDtlsRole が "auto" で初期化されるので、
  transport.getLocalParameters().RTCDtlsRole の初期値も "auto" になる。


client:
  The DTLS client role.
  A transition to "client" will occur if start(remoteParameters) is called with remoteParameters.RTCDtlsRole having a value of "server".
  remoteParameters.RTCDtlsRole が "server" で start(remoteParameters) された場合 "client" への移行が発生する

  If RTCDtlsRole had previously had a value of "server" (e.g. due to the RTCDtlsTransport having previously received packets from a DTLS client),
  then the DTLS session is reset prior to transitioning to the "client" role.

  もし RTCDtlsRole がすでに "server" だったら(e.g. RTCDtlsTransport がすでに DTLS クライアントからパケットを受けているなど)
  DLTS セッションは "client" に移行する前にリセットされる


server:
  The DTLS server role.
  If RTCDtlsRole has a value of "auto" and the RTCDtlsTransport receives a DTLS client_helo packet,
  RTCDtlsRole will transition to "server", even before start() is called.

  RTCDtlsRole が "auto" で、 RTCDtlsTransport が DTLS の client_helo パケットを受信した場合、
  satrt() が呼ばれる前でも、 RTCDtlsRole は "server" になる。

  A transition from "auto" to "server" will also occur if start(remoteParameters) is called with remoteParameters.RTCDtlsRole having a value of "client".
  "auto" から "server" への変更は、start(remoteParameters) が remoteParameters.RTCDtlsRole が "client" で呼ばれた時におこる。


## 4.9 Examples


```js
// DTLS

let gatherOptions = {
  gatherPolicy: 'relay',
  iceservers: [
    { urls: 'stun:stun1.example.net' },
    { urls: 'turn:turn.example.org', username: 'user', credential: 'myPassword' },
  ],
};

let rtcIceGatherer = new RTCIceGatherer(gatherOptions);

rtcIceGatherer.onlocalcandidate = function(event) {
  socket.send('candidate', {
    candidate: event.candidate,
    userNameFragment: rtcIceParametersLocal.userNameFragment,
  });
};

let rtcIceTransport = new RTCIceTransport(rtcIceGatherer);
let rtcDtlsTransport = new RTCDtlsTransport(rtcIceTransport);

socket.on('candidate', (candidateRemote) => {
  if (rtcpIceParametersRemote.userNameFragment !== candidateRemote.userNameFragment) return;
  rtcpIceTransport.addRemoteCandidate(candidateRemote.candidate);
};

socket.on('parameters', (remote) => {
  rtcIceTransport.start(rtcIceGatherer, remote.ice, RTCIceRole.controlling);

  rtcDtlsTransport.start(remote.dtls);
});

socket.send('parameters', {
  ice: rtcIceGatherer.getLocalParameters(),
  dtls: rtcDtlsTransport.getLocalParameters(),
});
```

# 5. The RTCRtpSender Object

RTCRtpSender は紐付いた RTP Sender に関係する情報を持つ

RTCRtpSender は、 MediaStreamTrack の送信にひも付き、メソッドを提供する。

RTCRtpSender は RTCDtlsTransport に紐付いた MediaStreamTrack から作られる。
transport.state か rtcpTransport.state が closed だとエラー



```js
let rtcRtpSender = new RTCRtpSender(mediaStreamTrack, rtcDtlsTransport, RTCDtlsTransport)

// MesiaStreamTrack
let mediaStreamTrack = rtcRtpSender.track;

// RTP RtcDtlsTransport
let rtcDtlsTransport = rtcRtpSender.transport;

// RTCP RtcDtlsTransport
let rtcpDtlsTransport = rtcRtpSender.rtcpTransport;

// RTP/RTCP をセットする
rtcRtpSender.setTransport(rtcDtlsTransport, rtcDtlsTransport);

// トラックの入れ替え
rtcRtpSender.setTrack(mediaStreamTrack).then(() => {
});

// sender の capabilities を kind を元に取得
// kind がなしか "" なら全部返す
// Capabilities such as retransmission [RFC4588], redundancy [RFC2198],
// and Forward Error Correction that do not have an associated value of kind are always included,
// regardless of the value of kind passed to getCapabilities().
let rtcRtpCapabilities = RTCRtpSender.getCapabilities(kind);

// parameter でコントロールしつつ Media を送る
rtcRtpSender.send(rtcRtpParameters);

// RTCP BYE を送り MediaStreamTrack.stop()
rtcRtpSender.stop();


// SSRC のコンフリクトで発生
// RTCRtpSender からは BYE が飛ぶ
rtcRtpSender.onssrcconflict = (event) => {
  console.log(event.ssrc);
};

rtcRtpSender.onerror = console.error.bind(console);
```


# 6. The RTCRtpReceiver Object

## 6.1

RTCRtpReceiver は RTP receiver の情報を含む

MediaStreamTrack を受け取る

RTCDtlsTransport から生成

```js
let rtcRtpReceiver = new RTCRtpReceiver(rtcDtlsTransport, rtcDtlsTransport);

// MediaStreamTrack
let mediaStreamTrack = rtcRtpReceiver.track;

// 紐付いてる RTP の RTCDtlsTransport
let rtcDtlsTransport = rtcRtpReceiver.transport;

// 紐付いてる RTCP の RTCDtlsTransport
let rtcDtlsTransport = rtcRtpReceiver.rtcpTransport;

// RTP/RTCP の transport を設定
rtcRtpReceiver.setTransport(rtcDtlsTransport, rtcDtlsTransport);

// receiver の capabilities を kind を元に取得
// kind がなしか "" なら全部返す
let rtcRtpCapabilities = rtcRtpReceiver.getCapabilities(kind);

// Capabilities such as retransmission [RFC4588], redundancy [RFC2198],
// and Forward Error Correction that do not have an associated value of kind are always included,
// regardless of the value of kind passed to getCapabilities(). To avoid confusion,
// getCapabilities(kind) should return codecs with a matching intrinsic kind value,
// as well as codecs with no intrinsic kind (such as redundancy [RFC2198]). For codecs with no intrinsic kind,
// RTCRtpCapabilities.RTCRtpCodecCapability[i].kind returned by getCapabilities(kind) should be set to the value of kind if kind is equal to "audio" or "video". If the kind argument was omitted or set to "",
// then the value of RTCRtpCapabilities.RTCRtpCodecCapability[i].kind is set to "".
rtcRtpReceiver.receive(rtcRtpParameters);

// 受信の停止
rtcRtpReceiver.stop();

rtcRtpReceiver.onerror = console.error.bind(error);
```



## 6.4 Examples


```js
// Offer
// - signaling
// - RTCDtlsTransport
// - video track
// - RTP と RTCP は多重化
// が前提
function myInitiate(socket, transport, video) {
  var sender = new RTCRtpSender(video, transport);
  var receiver = new RTCRtpReceiver(transport);

  var recvCaps = RTCRtpReceiver.getCapabilities('video');
  var sendCaps = RTCRtpSender.getCapabilities('video');

  socket.send('offer', {
    'recvCaps': recvCaps,
    'sendCaps': sendCaps,
  });

  socket.on('answer', (answer) => {
    var sendParams = caps2params(sendCaps, answer.recvCaps);
    var recvParams = caps2params(recvCaps, answer.sendCaps);
    sender.send(sendParams);
    receiver.receive(recvParams);

    // receiver.track -> MediaStream -> video
  });
}
```

```js
// Answer
// - signaling
// - RTCDtlsTransport
// - video track
// - RTP と RTCP は多重化
// が前提
let sender = new RTCRtpSender(video, transport);
let receiver = new RTCRtpReceiver(transport);

// Retrieve the send and receive capabilities
let recvCaps = RTCRtpReceiver.getCapabilities('video');
let sendCaps = RTCRtpSender.getCapabilities('video');

socket.on('offer', function(remote) {
  let sendParams = myCapsToSendParams(sendCaps, remote.recvCaps);
  let recvParams = myCapsToRecvParams(recvCaps, remote.sendCaps);
  videoSender.send(videoSendParams);
  videoReceiver.receive(videoRecvParams);

  socket.send('answer', {
    'recvCaps': recvCaps,
    'sendCaps': sendCaps
  });

  // receiver.track -> MediaStream -> video
});
```


# 7. The RTCIceTransportController Object


RTCIceTransportController は ICE freezing と帯域推定の管理をアシストする

RTCIceTransportController は component が "RTP" の RTCIceTransport を add/retrive する。
("RTCP" は暗黙的に含まれる)


RTCIceTransportController は自動で作られる


## 7.3

```js
let rtcIceTransportController = new RTCIceTransportController();


// ICE freezing と 帯域推定のシェアのため RTCIceTransportController に transport を追加する。
//
// addTransport が ICE の freezing を管理するため、
// freez してない状態の候補ペアはその管理を  addTransport() が呼ばれた時にしないといけない。
// rtcIceTransport は index にしたがって unfreez される。
//
// transport は index の場所に差し込まれるか、指定されてなければ末尾に追加される。
rtcIceTransportController.addTransport(rtcIceTransport, index);

// component が "RTP" な RTCIceTransport を返す
let rtcIceTransports = rtcIceTransportController.getTransports();
```



## 7.4

```js
// TODO
```

### bundle

同じ RTP 上に audio/video を多重化する。 WebRTC 1.0 はそうだった。
これは RTCRtpReceiver/Sender を同じ RTCDtlsTransport から複数作ればいい。

### mux

RTP と RTCP を多重化する。


### 実現方法

- bundle したい
 - bundle するなら mux もするので ICE と DTLS は一つでいい
 - controller も必要ない
 - audio/video 両方の sender/receiver の transport を全部同じにする

- bundle しないけど mux したい
 - audio/vide の rtcIceTransport を controller に追加
 - RTCP がいらない?

- bundle も mux もしない
 - audio/video RTP/RTCP 全部揃える
 - controller に transport を追加



# 8. The RTCRtpListener Object


TCRtpListener listens to RTP packets received from the RTCDtlsTransport,
TCRtpListener は RTCDtlsTransport からの RTP パケットを受け取る


determining whether an incoming RTP stream is configured to be processed by an existing RTCRtpReceiver object.
受信した RTP ストリームが、既存の RTCRtpReceiver で処理されるように設定されているかを特定する。

If no match is found, the unhandledrtp event is fired.
もし一致しなかったら、 unhandledrtp イベントが上がる

This can be due to packets having an unknown SSRC,
payload type or any other error that makes it impossible to attribute an RTP packet to a specific RTCRtpReceiver object.
これは、パケットが不明な SSRC か、不明なペイロードタイプか、何らかのエラーを持っていることで
RTP パケットを特定の RTCRtpReceiver に紐付けることができないことにに起因する。


The event is not fired once for each arriving packet; multiple discarded packets for the same SSRC should result in a single event.
イベントの発生は、パケットが到着するごとではない。
単一の SSRC に対する複数の破棄されたパケットは、ひとつのイベントにまとめるべき。

Note that application handling of the unhandledrtp event may not be sufficient to enable the unhandled RTP stream to be rendered.
unhandledrtp のアプリケーションでの処理は、
unhandled RTP stream を render するには十分ではないかもしれない。

// The amount of buffering to be provided for unhandled RTP streams is not mandated by this specification and is recommended to be strictly limited to protect against denial of service attacks.
// 
// Therefore an application attempting to create additional RTCRtpReceiver objects to handle the incoming RTP stream may find that portions of the incoming RTP stream were lost due to insufficient buffers,
// and therefore could not be rendered.


## 8.3

When the RTCRtpListener object receives an RTP packet over an RTCDtlsTransport,
the RTCRtpListener attempts to determine which RTCRtpReceiver object to deliver the packet to,
based on the values of the SSRC and payload type fields in the RTP header,
as well as the value of the MID RTP header extension, if present.

RTCRtpListener が RTP パケットを RTCDtlsTransport から受け取ったら、
RTCRtpListener はどの RTCRtpReceiver にパケットを送るかを、
SSRC と RTP の Payload Type フィールド、
もしくは MID RTP ヘッダ拡張の値があればそこから決める。


The RTCRtpListener maintains three tables in order to facilitate matching:
the ssrc_table which maps SSRC values to RTCRtpReceiver objects;
the muxId_table which maps values of the MID header extension to RTCRtpReceiver objects
and the pt_table which maps payload type values to RTCRtpReceiver objects.

RTCRtpListener はマッチングを簡単にするために三つのテーブルを管理する。

- ssrc_table: SSRC と RTCRtpReceiver の紐付け
- muxId_table: MID と RTCRtpReceiver の紐付け
- pt_table: payload type と RTCRtpReceiver の紐付け


For an RTCRtpReceiver object receiver, table entries are added when receiver.receive() is called,
and are removed when receiver.stop() is called.
reseive() が呼ばれれば table に追加、 stop() 呼ばれたら削除


If receiver.receive() is called again,
all entries referencing receiver are removed prior to adding new entries.
receive() が複数回呼ばれたら、全ての参照が一回消えて、新しく追加し直す


### SSRC table:
ssrc_table[parameters.encodings[i].ssrc]
is set to receiver for each entry where parameters.encodings[i].ssrc is set,
for values of i from 0 to the number of encodings.
If ssrc_table[ssrc] is already set to a value other than receiver,
then receiver.receive() will throw an InvalidParameters exception.

### muxId table:
If parameters.muxId is set,
muxId_table[parameters.muxId] is set to receiver.
If muxId_table[muxId] is already set to a value other than receiver,
then receiver.receive() will throw an InvalidParameters exception.

### payload type table:
If parameters.muxId is unset and parameters.encodings[i].ssrc is unset for all values of i from 0 to the number of encodings,
then add entries to pt_table by setting pt_table[parameters.codecs[j].payloadType] to receiver,
for values of j from 0 to the number of codecs.
If pt_table[pt] is already set to a value other than receiver,
or parameters.codecs[j].payloadType is unset for any value of j from 0 to the number of codecs,
then receiver.receive() will throw an InvalidParameters exception.


When an RTP packet arrives, if ssrc_table[packet.ssrc] is set:
set packet_receiver to ssrc_table[packet.ssrc]
and check whether the value of packet.pt is equal to one of the values of parameters.codecs[j].payloadtype for packet_receiver,
where j varies from 0 to the number of codecs.
If so, route the packet to packet_receiver. If packet.pt does not match, fire the unhandledrtp event.

```js
socket.on('packet', (packet) => {
  if (ssrc_table[packet.ssrc]) {
    let packet_receiver = ssrc_table[packet.ssrc]

    let match = packet_receiver.parameters.codecs.some((codec) => {
      return codec.payloadtype === packet.pt;
    });

    if (!metch) {
      emit('unhandledrtp');
    }

    packet_receiver(packet);
  }
}
```


Else if packet.muxId is set:
If muxId_table[packet.muxId] is unset, fire the unhandledrtp event,
else set packet_receiver to muxId_table[packet.muxId]
and check whether the value of packet.pt is equal to one of the values of parameters.codecs[j].payloadtype for packet_receiver,
where j varies from 0 to the number of codecs.
If so, set ssrc_table[packet.ssrc] to packet_receiver and route the packet to packet_receiver.
If packet.pt does not match, fire the unhandledrtp event.

Else if pt_table[packet.pt] is set: set packet_receiver to pt_table[packet.pt],
set ssrc_table[packet.ssrc] to packet_receiver,
set pt_table[packet.pt] to null and route the packet to packet_receiver.
Question: Do we remove all pt_table[packet.pt] entries set to packet_receiver?

Else if no matches are found in the ssrc_table,
muxId_table or pt_table, fire the unhandledrtp event.

TODO: Revise this paragraph based on the outcome of the discussion on FEC/RTX/RED.



## 8.4 Interface Definition

```js
let rtcRtpListener = new RTCRtpListener(rtcDtlsTransport);

let rtcDtlsTransport = rtcRtpListener.transport;

rtcDtlsTransport.onunhandledrtp = (event) => {
  // MID RTP header extension
  console.log(event.muxId);

  // payload type in RTP
  console.log(event.payloadType);

  // ssrc in RTP
  console.log(event.ssrc);
}
```


# 9. Dictionaries related to Rtp

## 9.1 dictionary RTCRtpCapabilities

The RTCRtpCapabilities object expresses the capabilities of RTCRtpSender and RTCRtpReceiver objects.
Sender/Receiver の Capabilities を表現する

Features which are mandatory to implement in [RTP-USAGE], such as RTP/RTCP multiplexing [RFC5761],
実装が必須なのは [RTP-USAGE], RTP/RTCP の多重化のように。

audio/video multiplexing [RTP-MULTI-STREAM] and reduced size RTCP [RFC5506] are assumed to be available
and are therefore not included in RTCRtpCapabilities,
although these features can be set via RTCRtpParameters.

audio/video の多重化と RTCP のサイズの縮小はあると仮定されているため、RTCRtpCapabilities には含んでいない。
しかし、これらの機能は RTCRtpParameters で設定できる。


```js
dictionary RTCRtpCapabilities {
  // supported codecs
  sequence<RTCRtpCodecCapability> codecs;

  // supported RTP header extension
  sequence<RTCRtpHeaderExtension> headerExtensions;

  // Forward Error Correction mechanism
  sequence<DOMString>             fecMechanisms;
};
```


## 9.2 dictionary RTCRtcpFeedback

parameter of type DOMString,
type of type DOMString,
Valid values for type are the "RTCP Feedback" Attribute Values enumerated in [IANA-SDP-14] ("ack", "ccm", "nack", etc.).


```js
dictionary RTCRtcpFeedback {

  // For a type of "ack" or "nack", valid values for parameters are the "ack"
  // and "nack" Attribute Values enumerated in [IANA-SDP-15] ("sli", "rpsi", etc.).
  // For a type of "ccm", valid values for parameters are the "Codec Control Messages"
  // enumerated in [IANA-SDP-19] ("fir", "tmmbr" (includes "tmmbn"), etc.).
  DOMString type;


  // Valid values for type are the "RTCP Feedback" Attribute Values enumerated in
  // [IANA-SDP-14] ("ack", "ccm", "nack", etc.).
  DOMString parameter;
};
```

## 9.3 dictionary RTCRtpCodecCapability
## 9.4 dictionary RTCRtpParameters
## 9.5 dictionary RTCRtcpParameters
## 9.6 dictionary RTCRtpCodecParameters
TODO:


## 9.7 dictionary RTCRtpEncodingParameters


```js
dictionary RTCRtpEncodingParameters {
  // sender/receiver が active かどうか
  // off にしておくと何も送らないが
  // true に戻せばすぐ送れるので
  // 再度 add するより速い
  boolean             active = true;

  // エンコーディングごとのコーデックを指定
  // デフォルトはブラウザが設定する
  payloadtype         codecPayloadType;

  // 依存するレイヤの id
  // この仕様では RTCRtpEncodingParameters の中の値だけだが
  // MST が実装されれば、そこではマッチせず global 検索が走る
  sequence<DOMString> dependencyEncodingIds;

  DOMString           encodingId;

  RTCRtpFecParameters fec;
  RTCRtpRtxParameters rtx;


  // base レイヤからの相対値で帯域で使えるリソース
  // SVC でデフォルト 1.0
  double              priority = 1.0;


  unsigned long long  maxBitrate;
  double              minQuality = 0;
  double              framerateBias = 0.5;
  double              resolutionScale;
  double              framerateScale;

  // layering/encoding の SSRC
  // ssrc がなければ RTCRtpEncodingParameters が RTCRtpReceiver.receive()
  // に渡される。

  // The SSRC for this layering/encoding.
  // If ssrc is unset in a RTCRtpEncodingParameters object
  // passed to the RTCRtpReceiver.receive method,
  // the next unhandled SSRC will match,
  // and an RTCRtpUnhandledEvent will not be fired.
  // If ssrc is unset in a RTCRtpEncodingParameters object
  // passed to the RTCRtpSender.send method,
  // the browser will choose, and the chosen value is not reflected in
  // RTCRtpEncodingParameters.ssrc.
  // If the browser chooses the ssrc,
  // it may change it due to a collision without firing an RTCSsrcConflictEvent.
  // If ssrc is set in a RTCRtpEncodingParameters object
  // passed to the RTCRtpSender.send method and an SSRC conflict is detected,
  // then an RTCSsrcConflictEvent is fired (see Section 6.4).
  unsigned long       ssrc;
};
```


### 9.8.1 Basic Example

```js
// サムネイル(2)をオリジナルと送る。 2 の優先度を上げる。
var encodings = [{ ssrc: 1, priority: 1.0 }];
var encodings = [{ ssrc: 2, priority: 10.0 }];

// 手話(フレームレートは高く、しかしクオリティは悪すぎない)
var encodings = [{ minQuality: 0.2, framerateBias: 1.0 }];

// スクリーンキャスト(クオリティは高く、フレームレートは低くてもいい)
var encodings = [{ framerateBias: 0.0 }];

// リモートデスクトップ (フレームレートを高く、ダウンスケールしない)
var encodings = [{ framerateBias: 1.0 }];

// オーディオ優先
var audioEncodings = [{ priority: 10.0 }];
var videoEncodings = [{ priority: 0.1 }];

// ビデオ優先
var audioEncodings = [{ priority: 0.1 }];
var videoEncodings = [{ priority: 10.0 }];

// クオリティを上げる
var encodings = [{ maxBitrate: 10000000 }];

// 帯域を低く抑える
var encodings = [{ maxBitrate: 100000 }];
```


### 9.8.2 Temporal Scalability

```js
// 3 レイヤ temporal scalability encoding
// I0: base-layer I-frames.
// P0: base-layer P-frames.
// P1: first temporal enhancement layer,
// P2: represents the second temporal enhancement layer.
//
//       +----+     +----+     +----+     +----+
//       |P2  |     |P2  |     |P2  |     |P2  |
//       |    |     |    |     |    |     |    |
//       +--+-+     +--+-+     +--+-+     +--+-+
//          ^          ^          ^          ^
//          |       +--+-+        |       +--+-+
//          +------->P1  |        +------->P1  |
//          |       |    |        |       |    |
// +----+   |       +----+     +--+-+     +----+   +----+
// |IO  |   |                  |P0  |              |P0  |
// |    +---+----------------->+    +------------->+    |
// +----+                      +----+              +----+   
var encodings = [
  {
    // ベースフレームは入力の 1/4 フレームレート
    encodingId: "0",
    framerateScale: 4.0
  },
  {
    // Temporal enhancement (ベースレイヤと結合時フレームレート半分)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    framerateScale: 2.0
  },
  {
    // 他の temporal enhancement layer (全レイヤ結合時、入力時のフルレームレート)
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    framerateScale: 1.0
  }
];

// 3 レイヤ temporal scalability encoding
// all but the base layer disabled
var encodings = [
  {
    encodingId: "0",
    framerateScale: 4.0
  },
  {
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    framerateScale: 2.0,
    active: false
  },
  {
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    framerateScale: 1.0,
    active: false
  }
];
```

### 9.8.3 Spatial Simulcast

```
// 3-layer spatial simulcast
var encodings = [
  {
    // Simulcast layer: 1/4 scale
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    // Simulcast layer: 1/2 scale
    encodingId: "1",
    resolutionScale: 2.0
  },
  {
    // Simulcast layer: 1/1 scale
    encodingId: "2",
    resolutionScale: 1.0
  }
];

// 3-layer spatial simulcast with all but the lowest resolution layer disabled
var encodings = [
  {
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    encodingId: "1",
    resolutionScale: 2.0,
    active: false
  },
  {
    encodingId: "2",
    resolutionScale: 1.0,
    active: false
  }
];

// 2-layer spatial simulcast combined with 2-layer temporal scalability
// Solid arrows represent temporal prediction.
// 矢印がテンポラルな予測を表す
//
// I0:  base-layer I-frame
// P0:  base-layer P-frames
// EI0: enhanced resolution base-layer I-frame
// EP0: P-frames within the enhanced resolution base layer.
// P1:  first temporal enhancement layer,
// EP1: temporal enhancement to the enhanced resolution simulcast base-layer.
//
//          +----+                +----+
//          |EP1 |                |EP1 |
//          |    |                |    |
//          ++---+                ++---+
//           ^ +----+              ^ +----+
//           | |P1  |              | |P1  |
//           | |    |              | |    |
//           | ++---+              | ++---+
// +----+    |  ^        +----+    |  ^        +----+
// |EI0 +----+  |        |EP0 +----+  |        |EP0 |
// |    +--------------->+    +--------------->+    |
// +----+       |        +----+       |        +----+
//              |                     |
// +----+       |        +----+       |        +----+
// |I0  +-------+        |P0  +-------+        |P0  |
// |    +--------------->+    +--------------->+    |
// +----+                +----+                +----+
//
var encodings = [
  {
    // 低解像度ベースレイヤ(1/2 フレームレート 1/2 解像度)
    encodingId: "0",
    resolutionScale: 2.0,
    framerateScale: 2.0
  },
  {
    // 拡張解像度ベースレイヤ(1/2 フレームレート 1/1 解像度)
    encodingId: "E0",
    resolutionScale: 1.0,
    framerateScale: 2.0
  },
  {
    // 低解像度ベースへの拡張レイヤ (1/1 レート, 1/2 解像度)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0,
    framerateScale: 1.0
  },
  {
    // 拡張解像度ベースへの拡張レイヤ (1/1 レート, 1/1 解像度)
    encodingId: "E1",
    dependencyEncodingIds: ["E0"],
    resolutionScale: 1.0,
    framerateScale: 1.0
  }
];
```

### 9.8.4 Spatial Scalability

```

Below is a representation of 2-layer temporal scalability combined with 2-layer spatial scalability. Solid arrows represent temporal prediction and dashed arrows represent inter-layer prediction. In the diagram, I0 is the base-layer I-frame, and EI0 is an intra spatial enhancement. P0 represents base-layer P-frames, and P1 represents the first temporal enhancement layer. EP0 represents a resolution enhancement to the base-layer P frames, and EP1 represents a resolution enhancement to the second temporal layer P-frames.

//          +----+                +----+
//          |EP1 |                |EP1 |
//          |    |                |    |
//          ++--++                ++--++
//           ^  ^                  ^  ^
//           |  |                  |  |
//           | ++---+              | ++---+
//           | |P1  |              | |P1  |
//           | |    |              | |    |
//           | ++---+              | ++---+
// +----+    |  ^        +----+    |  ^        +----+
// |EI0 +----+  |        |EP0 +----+  |        |EP0 |
// |    +---------------^+    +---------------^+    |
// +--+-+       |        +--+-+       |        +--+-+
//    ^         |           ^         |           ^
//    |         |           |         |           |
// +--+-+       |        +--+-+       |        +--+-+
// |I0  +-------+        |P0  +-------+        |P0  |
// |    +---------------^+    +---------------^+    |
// +----+                +----+                +----+
//
// Example of 3-layer spatial scalability encoding

var encodings = [
  {
    // Base layer: 1/4 解像度(入力)
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    // Spatial enhancement layer
    // ベース結合時 1/2 解像度
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0
  },
  {
    // Additional spatial enhancement layer
    // 前レイヤと結合時 1/1 解像度(入力)
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    resolutionScale: 1.0
  }
];

// 3-layer spatial scalability with all but the base layer disabled
var encodings = [
  {
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0,
    active: false
  },
  {
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    resolutionScale: 1.0,
    active: false
  }
];

// 2-layer spatial scalability combined with 2-layer temporal scalability
var encodings = [
  {
    // Base layer (1/2 レート, 1/2 解像度)
    encodingId: "0",
    resolutionScale: 2.0,
    framerateScale: 2.0
  },
  {
    // Temporal enhancement to the base layer (1/1 入力レート, 1/2 解像度)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0,
    framerateScale: 1.0
  },
  {
    // Spatial enhancement to the base layer (1/2 入力レート, 1/1 解像度)
    encodingId: "E0",
    dependencyEncodingIds: ["0"],
    resolutionScale: 1.0,
    framerateScale: 2.0
  },
  {
    // Temporal enhancement to the spatial enhancement layer (1/1 入力レート, 1/1 解像度)
    encodingId: "E1",
    dependencyEncodingIds: ["E0", "1"],
    resolutionScale: 1.0,
    framerateScale: 1.0
  }
];
```


## 9.9 dictionary RTCRtpFecParameters
## 9.10 dictionary RTCRtpRtxParameters
## 9.11 dictionary RTCRtpHeaderExtension
## 9.12 dictionary RTCRtpHeaderExtensionParameters
## 9.13 RTP header extensions


# 10. The RTCDtmfSender Object

いらない



# 11. The RTCDataChannel Object

RTCDataChannel は RTCDataTransport と RTCDataChannelParameters から生成

The RTCDataChannel interface represents a bi-directional data channel between two peers.
ピア間の双方向データ通信インタフェース。

There are two ways to establish a connection with RTCDataChannel.
RTCDataChannel を確立する方法は二つある

The first way is to construct an RTCDataChannel at one of the peers with the RTCDataChannelParameters.negotiated attribute unset or set to its default value false.
RTCDataChannelParameters.negotiated を false にして、 RTCDataChannel をピアの一つから生成する。

This will announce the new channel in-band and trigger an ondatachannel event with the corresponding RTCDataChannel object at the other peer.
これでチャネルの in-band での生成が ondatachannel で対象の RTCDataChannel に通知される

The second way is to let the application negotiate the RTCDataChannel.
二つ目は、 RTCDataChannel のネゴシエーションをアプリケーションでする

To do this, create an RTCDataChannel object with the RTCDataChannelParameters.negotiated dictionary member set to true,
このためには、 RTCDataChannelParameters.negotiated = true の RTCDataChannel で作るり、

and signal out-of-band (e.g. via a web server) to the other side that it should create a corresponding RTCDataChannel
out-of-band (web サーバ経由など) でシグナルがもう一方に通知され、対象となる RTCDataChannel が、

with the RTCDataChannelParameters.negotiated dictionary member set to true and the same id.
RTCDataChannelParameters.negotiated = true かつ同じ id で作られる

This will connect the two separately created RTCDataChannel objects.
これは二つの別の RTCDataChannel を作る。


The second way makes it possible to create channels with asymmetric properties and to create channels in a declarative way by specifying matching ids.
ふたつ目の方法は、非対称なプロパティのチャネルが作れ、マッチする id を宣言的に指定できる。

Each RTCDataChannel has an associated underlying data transport that is used to transport actual data to the other peer.
それぞれの RTCDataChannel は、実際にデータを送るためのトランスポートが紐付けられている。

The transport properties of the underlying data transport, such as in order delivery settings and reliability mode, are configured by the peer as the channel is created.
トランスポートのプロパティの送信セッティングや信頼性モードは、チャネルを作ったピアにより設定される。

The properties of a channel cannot change after the channel has been created.
チャネルができたら、以降プロパティは変更できない。


```javascript
let rtcDataChannelParameters = {
  // The id attribute returns the id for this RTCDataChannel, or null if unset.
  // The id was either assigned by the user agent at channel creation time or was selected by the script.
  // For SCTP, the id represents a stream identifier, as discussed in [DATA] Section 6.5.
  // The attribute must return the value to which it was set when the RTCDataChannel was constructed.
  id                : 1000,

  // The label attribute represents a label that can be used to distinguish this RTCDataChannel object from other RTCDataChannel objects.
  // The attribute must return the value to which it was set when the RTCDataChannel object was constructed.
  // For an SCTP data channel, the label is carried in the DATA_CHANNEL_OPEN message defined in [DATA-PROT] Section 5.1.
  label             : "",

  // The maxPacketLifetime attribute represents the length of the time window (in milliseconds) during which retransmissions may occur in unreliable mode, or null if unset.
  // The attribute must return the value to which it was set when the RTCDataChannel was constructed.
  maxPacketLifetime : 100,

  // The maxRetransmits attribute returns the maximum number of retransmissions that are attempted in unreliable mode, or null if unset.
  // The attribute must be initialized to null by default and must return the value to which it was set when the RTCDataChannel was constructed.
  maxRetransmits    : 100,

  // The negotiated attribute returns true if this RTCDataChannel was negotiated by the application, or false otherwise.
  // The attribute must be initialized to false by default and must return the value to which it was set when the RTCDataChannel was constructed.
  // If set to true, the application developer must signal to the remote peer to construct an RTCDataChannel object with the same id for the data channel to be open.
  // If set to false, the remote party will receive an ondatachannel event with a system constructed RTCDataChannel object.
  negotiated        : false,

  // The ordered attribute returns true if the RTCDataChannel is ordered, and false if out of order delivery is allowed.
  // Default is true.
  // The attribute must return the value to which it was set when the RTCDataChannel was constructed.
  ordered           : true,

  // The name of the sub-protocol used with this RTCDataChannel if any, or the empty string otherwise (in which case the protocol is unspecified).
  // The attribute must return the value to which it was set when the RTCDataChannel was constucted.
  // Sub-protocols are registered in the 'Websocket Subprotocol Name Registry' created in [RFC6455] Section 11.5.
  protocol          : "",
};

let rtcDataChannel = new RTCDataChannel(rtcDataTransport, rtcDataChannelParameters);

// 紐付いたトランスポートに関する設定
let rtcDataTransport         = rtcDataChannel.transport;

// チャネルのパラメータ
let rtcDataChannelParameters = rtcDataChannel.parameters;

// datachannel のステート
// It must return the value to which the user agent last set it (as defined by the processing model algorithms).
let rtcDataChannelState      = rtcDataChannel.readyState;
// "connecting", "open", "closing", "closed"

// application data (UTF-8, binary) のバイト数
// send() でキューに入っているがイベントループの途中でまだネットワークに書かれていないもの
// This includes any text sent during the execution of the current task,
// regardless of whether the user agent is able to transmit text asynchronously with script execution.
// 現在のタスクでの任意のテキストの送信の実行を含み、
// 非同意の送信については考慮しない？
// frame のオーバーヘッドや、 OS/ネットワーク機器のバッファリングを含まない
// チャネルが close されていたら、send() を呼ぶたびに増えていくだけ(zero にリセットされない)
let bufferedAmount = rtcDataChannel.bufferedAmount;

// The binaryType attribute must, on getting, return the value to which it was last set.
// 最後にセットした値を返す、設定時は IDL の値を使う
// 初期値は 'blob' で、この値がバイナリデータがどう JS に渡されるかを決める。
// See the [WEBSOCKETS-API] for more information.
let binaryType = rtcDataChannel.binaryType;

rtcDataChannel.close();
rtcDataChannel.onopen;
rtcDataChannel.onerror;
rtcDataChannel.onclose;
rtcDataChannel.onmessage;
rtcDataChannel.send(DOMString data);
rtcDataChannel.send(Blob data);
rtcDataChannel.send(ArrayBuffer data);
rtcDataChannel.send(ArrayBufferView data);
```


# 12. The RTCSctpTransport Object

SCTP に紐づく情報を持つ。

RTCSctpTransport は RTCDataTransport を継承し、 RTCDataChannel に紐づく。

RTCSctpTransport は RTCDtlsTransport から生成される。


```js
let rtcSctpTransport = new RTCSctpTransport(rtcDtlsTransport);
let rtcDtlsTransport = rtcSctpTransport.rtcDtlsTransport;
let rtcSctpCapabilities = rtcSctpTransport.getCapabilities();
// { maxMessageSize: unsigned short }

rtcSctpTransport.start(rtcSctpCapabilities);
rtcSctpTransport.stop();
rtcSctpTransport.ondatachannel = (event) => {
  let rtcDataChannel = event.channel;
};
```


```js
// Example 22
```

# 13. Statistics API

:TODO


# 14. Identity

## 14.1 Overview

An RTCIdentity instance enables authentication of a DTLS transport using a web-based identity provider (IdP).
RTCIdentity インスタンスは、 DTLS 通信の Web Base の IdP を用いた認証を可能にする。

The idea is that the initiator acts as the Authenticating Party (AP) and obtains an identity assertion from the IdP which is then conveyed in signaling.
アイデアとしては、開始側が Authenticating Party(AP) としてふるまい、シグナリングに含めていた IdP から identity assertion を取得する。

The responder acts as the Relying Party (RP) and verifies the assertion.
受信側は Relying Party (RP) として振る舞い、 assertion を検証する。

The interaction with the IdP is designed to decouple the browser from any particular identity provider,
IdP とのインタラクションは、ブラウザを特定の IdP から分離されるようデザインされている。

so that the browser need only know how to load the IdP's Javascript (which is deterministic from the IdP's identity),
従って、ブラウザは IdP の JS を読む方法と、

and the generic protocol for requesting and verifying assertions.
assertion の取得と検証プロトコルを知るだけで良い。

The IdP provides whatever logic is necessary to bridge the generic protocol to the IdP's specific requirements.
IdP 特有の要件と標準プロトコルとのブリッジのためどんなロジックが必要かを提供する

Thus, a single browser can support any number of identity protocols,
一つのブラウザはいくつの Identity Protocol をサポートしても良い、

including being forward compatible with IdPs which did not exist at the time the Identity Provider API was implemented.
IdP API が実装された時に存在しない IdP との前方互換を含む

The generic protocol details are described in [RTCWEB-SECURITY-ARCH].
標準プロトコルの詳細はこちら

This section specifies the procedures required to instantiate the IdP proxy, request identity assertions, and consume the results.
このセクションは、 IdP Proxy のインスタンス生成の方法、 identity assertion のリクエスト、結果の取得について記述する。


## 14.3 Identity Provider Selection

In order to communicate with the IdP, the browser instantiates an isolated interpreted context, effectively an invisible IFRAME.
IdP とのやり取りのため、ブラウザが分離されたコンテキストを生成する、見えない Iframe が効果的

The initial contents of the context are loaded from a URI derived from the IdP's domain name, as described in [RTCWEB-SECURITY-ARCH].
コンテキストの初期コンテンツは、 IdP ドメインから配布された URI からロードする、詳細はこちら。

For purposes of generating assertions, the IdP shall be chosen as follows:
assertion を生成する目的として、 IdP は以下から選ぶ

- If the getIdentityAssertion() method has been called, the IdP provided shall be used.
- If the getIdentityAssertion() method has not been called, then the browser can use an IdP configured into the browser.

- もし getIdentityAssertion() メソッドが呼ばれると、提供された IdP を使うべき
- もし getIdentityAssertion() メソッドが呼ばれない場合、ブラウザは設定された IdP を使うことができる

In order to verify assertions, the IdP domain name and protocol are taken from the domain and protocol fields of the identity assertion.
assertion を検証するために、 IdP ドメイン名とプロトコルは identity assertion のドメインとプロトコルフィールドから取得される


## 14.4 Instantiating an IdP Proxy

The browser creates an IdP proxy by loading an isolated, invisible IFRAME with HTML content from the IdP URI.
The URI for the IdP is a well-known URI formed from the domain and protocol fields, as specified in [RTCWEB-SECURITY-ARCH].

ブラウザは、 IdP URI から読んだ Iframe で IdP proxy を作り、
IdP の URI は protocol + domain からなる well-known なフォーマット。

When an IdP proxy is required, the browser performs the following steps:
IdP プロキシが必要な場合は、ブラウザは以下の手順で動作する。

- An invisible, sandboxed IFRAME is created within the browser context.
  The IFRAME sandbox attribute is set to "allow-forms allow-scripts allow-same-origin" to limit the capabilities available to the IdP.
  The browser must prevent the IdP proxy from navigating the browsing context to a different location.
  The browser must prevent the IdP proxy from interacting with the user (this includes, in particular, popup windows and user dialogs).


- 不可視、 iframe sandbox をブラウザコンテキストに作成。
  IdP のものに制限するため "allow-forms allow-scripts allow-same-origin" に制限されている。
  ブラウザは IdP proxy をブラウザコンテキストで他の location に遷移させない
  ブラウザは Idp proxy をユーザとインタラクションさせない(popup, dialog etc)

- Once the IdP proxy is created,
  the browser creates a MessageChannel [webmessaging] within the context of the IdP proxy and assigns one port from the channel to a variable named rtcwebIdentityPort on the window.
  This message channel forms the basis of communication between the browser and the IdP proxy.
  Since it is an essential security property of the web sandbox that a page is unable to insert objects into content from another origin,
  this ensures that the IdP proxy can trust that messages originating from window.rtcwebIdentityPort are from RTCIdentity and not some other page.
  This protection ensures that pages from other origins are unable to instantiate IdP proxies and obtain identity assertions.

- The IdP proxy completes loading and informs the RTCIdentity object that it is ready by sending a "READY" message to the message channel port [RTCWEB-SECURITY-ARCH].
  Once this message is received by the RTCIdentity object,
  the IdP is considered ready to receive requests to generate or verify identity assertions.


[TODO: This is not sufficient unless we expect the IdP to protect this information.
Otherwise, the identity information can be copied from a session with "good" properties to any other session with the same fingerprint information.
Since we want to reuse credentials, that would be bad.] The identity mechanism must provide an indication to the remote side of whether it requires the stream contents to be protected.
Implementations must have an user interface that indicates the different cases and identity for these.


### 14.5.1 User Login Procedure

An IdP could respond to a request to generate an identity assertion with a "LOGINNEEDED" error.
This indicates that the site does not have the necessary information available to it (such as cookies) to authorize the creation of an identity assertion.

The "LOGINNEEDED" response includes a URL for a page where the authorization process can be completed.
This URL is exposed to the application through the loginUrl attribute of the RTCIdentityError object.
This URL might be to a page where a user is able to enter their (IdP) username and password, or otherwise provide any information the IdP needs to authorize a assertion request.

An application can load the login URL in an IFRAME or popup; the resulting page then provides the user with an opportunity to provide information necessary to complete the authorization process.

Once the authorization process is complete,
the page loaded in the IFRAME or popup sends a message using postMessage [webmessaging] to the page that loaded it (through the window.opener attribute for popups,
or through window.parent for pages loaded in an IFRAME).
The message must be the DOMString "LOGINDONE".
This message informs the application that another attempt at generating an identity assertion is likely to be successful.

## 14.6 Verifying Identity Assertions

Identity assertion validation happens when setIdentityAssertion() is invoked. The process runs asynchronously.

The identity assertion validation process involves the following steps:

+ The RTCIdentity instantiates an IdP proxy as described in Identity Provider Selection section and waits for the IdP to signal that it is ready.
+ The IdP sends a "VERIFY" message to the IdP proxy. This message includes the assertion which is to be verified.
+ The IdP proxy verifies the identity assertion (depending on the authentication protocol this could involve interacting with the IDP server).
+ Once the assertion is verified, the IdP proxy sends a response containing the verified assertion results to the RTCIdentity object over the message channel.
+ The RTCIdentity object validates that the fingerprint provided by the IdP in the validation response matches the certificate fingerprint that is, or will be, used for communications.
  This is done by waiting for the DTLS connection to be established and checking that the certificate fingerprint on the connection matches the one provided by the IdP.
+ The RTCIdentity validates that the domain portion of the identity matches the domain of the IdP as described in [RTCWEB-SECURITY-ARCH].
+ The RTCIdentity stores the assertion in the peerIdentity, and returns an RTCIdentityAssertion object when the Promise from setIdentityAssertion() is fulfilled.
  The assertion information to be displayed must contain the domain name of the IdP as provided in the assertion.
+ The browser may display identity information to a user in browser UI.
  Any user identity information that is displayed in this fashion must use a mechanism that cannot be spoofed by content.
+ The IdP might fail to validate the identity assertion by providing an "ERROR" response to the validation request.
  Validation can also fail due to the additional checks performed by the browser.
  In both cases, the process terminates and no identity information is exposed to the application or the user.

The browser must cause the Promise of setIdentityAssertion() to be rejected if validation of an identity assertion fails for any reason.

The browser should limit the time that it will allow for this process.
This includes both the loading of the IdP proxy and the identity assertion validation.
Failure to do so potentially causes the corresponding operation to take an indefinite amount of time.
This timer can be cancelled when the IdP produces a response.
The timer running to completion can be treated as equivalent to an error from the IdP.

The format and contents of the messages that are exchanged are described in detail in [RTCWEB-SECURITY-ARCH].

NOTE: Where RTP and RTCP are not multiplexed, it is possible that the assertions for both the RTP and RTCP will be validated, but that the identities will not be equivalent.
For applications requiring backward compatibility with WebRTC 1.0, this must be considered an error.
However, if backward compatibility with WebRTC 1.0 is not required the application may consider an alternative, such as ignoring the RTCP identity assertion.

