# unified plan (https://tools.ietf.org/html/draft-roach-mmusic-unified-plan-00)

# 1.  Introduction

A recurrent theme in new RTC technologies has been the need to
cleanly handle very large numbers of media flows.  For instance, a
videoconferencing application might have a main display plus
thumbnails for 10 or more other speakers all displayed at the same
time.  If each video source is encoded in multiple resolutions (e.g.,
simulcast or layered coding) and also has FEC or RTX, this could
easily add up to 30 or more independent RTP flows.

昨今の RTC は複数メディアを綺麗に扱う必要がある。
例えばビデオ会議も、メイン1+サムネイル10とかある。
加えてそれぞれのビデオが別の解像度(simulcast や layered coding のように)で
かつ FEC や RTX まであったら、 30 以上の別 RTP が必要になる。


This document focuses on the WebRTC use cases, and uses its
terminology to discuss key concepts.  The approach described herein,
however, is not intended to be WebRTC specific, and should be
generalize to other SDP-using applications.

このドキュメントは WebRTC ユースケースにフォーカスし、
キーコンセプトのターミノロジーを議論する。
しかし、他でも使えるようにしたい。


The standard way of encoding this information in SDP is to have each
RTP flow (i.e., SSRC) appear on its own m-line.  For instance, the
SDP for two cameras with audio from a device with a public IP address
could look something like:

標準的な情報形式としての SDP は、 RTP flow (ssrc など)がここの m-line に現れる。
例えば、パブリック IP から取れる 2 つのカメラと音の SDP はこんな感じ。

```
v=0
o=- 20518 0 IN IP4 203.0.113.1
s=
t=0 0
c=IN IP4 203.0.113.1
a=ice-ufrag:F7gI
a=ice-pwd:x9cml/YzichV2+XlhiMu8g
a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7

m=audio 54400 RTP/SAVPF 0 96
a=msid:ma ta
a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 52595
a=rtpmap:0 PCMU/8000
a=rtpmap:96 opus/48000
a=ptime:20
a=sendrecv
a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
a=candidate:1 2 UDP 2113667326 203.0.113.1 54401 typ host

m=video 55400 RTP/SAVPF 96 97
a=msid:ma tb
a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 56036
a=rtpmap:96 H264/90000
a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
a=rtpmap:97 VP8/90000
a=sendrecv
a=candidate:0 1 UDP 2113667327 203.0.113.1 55400 typ host
a=candidate:1 2 UDP 2113667326 203.0.113.1 55401 typ host

m=video 56400 RTP/SAVPF 96 97
a=msid:ma tc
a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 21909
a=rtpmap:96 H264/90000
a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
a=rtpmap:97 VP8/90000
a=sendrecv
a=candidate:0 1 UDP 2113667327 203.0.113.1 56400 typ host
a=candidate:1 2 UDP 2113667326 203.0.113.1 56401 typ host
```

Unfortunately, as the number of independent media sources starts to
increase, the scaling properties of this approach become problematic.
In particular, SDP currently requires that each m-line have its own
transport parameters (port, ICE candidates, etc.), which can get
expensive.

残念なことに、独立メディアが増えると、この増やしていく方式は問題になる。
特に、今の SDP はここの m-line に独自の transport parameter (port, ICE etc)
を必要とし、コストが高い。

For instance, the [RFC5245] pacing algorithm requires
that new STUN transactions be started no more frequently than 20 ms;
with 30 RTP flows, which would add 600 ms of latency for candidate
gathering alone.  Moreover, having 30 persistent flows might lead to
excessive consumption of NAT binding resources.
例えば、 RFC5254 のペーシングアルゴリズムは、新しい STUN のトランザクションは、
20ms 以上待つように言っている。
30RTP あると、それだけで 600ms が candidate gathering だけでかかる。
それ以上に、 30 の接続は NAT のバインディグリソースについても高コスト。


This document specifies a small number of modest extensions to SDP
which are intended to reduce the transport impact of using a large
number of flows.  The general design philosophy is to maintain the
existing SDP negotiation model (inventing as few new mechanisms as
possible) while simply reducing the consumption of network resources.

この仕様では、flow 数が増えてもトランスポートの負荷が減られるようにする。
基本的には SDP のネゴシエーションモデルを見直し、ネットワークリソースコストを減らす。



## 1.1.  Design Goals

### 1.1.1.  Support for a large number of arbitrary sources


   In cases such as a video conference, there may be dozens or hundreds
   of participants, each with their own audio and video sources.  A
   participant may even want to browse conferences before joining one,
   meaning that there may be cases where there are many such conferences
   displayed simultaneously.

ビデオ会議でたくさんの参加者がいた時、参加者は先にたくさんあるカンファレンスの中を見たい場合がある。


   In these conferences, participants may have varying capabilities and
   therefore video resolutions.  In addition, depending on conference
   policy, user preference, and the desired UI, participants may be
   displayed in various layouts, including:

会議の仕様とか制限で色々な参加の仕方がある。

   o  A single large main speaker with thumbnails for other participants

   o  Multiple medium-sized main speakers, with or without thumbnails

   o  Large slides + medium speaker, without thumbnails

   - メインが一人いて周りがサムネイル
   - 全員同じサイズでずらっと並ぶ
   - 一つがスライドで、小さくスピーカーが並ぶ

   These layouts can change dynamically, depending on the conference
   content and the preferences of the receiver.  As such, there are not
   well-defined 'roles', that could be used to group sources into
   specific 'large' or 'thumbnail' categories.  As such, the requirement
   we attempt to satisfy is support for sending and receiving up to
   hundreds of simultaneous, heterogeneous sources.

レイアウトは動的に、コンテンツやパフォーマンスで変わる。
多くの異なる動画を同時に扱う必要がある。

### 1.1.2.  Support for fine-grained receiver control of sources

   Since there may be large numbers of sources, which can be displayed
   in different layouts, it is imperative that the receiver can easily
   control which sources are received, and what resolution or quality is
   desired for each (for both audio and video).

たくさんの映像を、色々なレイアウトで表示したいので、
受信は、解像度や品質を細かく指定したい。

   The receiver should
   also be able to prioritize the source it requests, so that if system
   limits or bandwidth force a reduction in quality, the sources chosen
   by the receiver as important will receive the best quality.  These
   details must be exposed to the application via the API.

限りある帯域をうまく分配できるよう、優先順位も指定したい。できれば API で。


### 1.1.3.  Glareless addition and removal of sources

   Sources may come and go frequently, as is the case in a conference
   where various participants are presenting, or an interaction between
   multiple distributed conference servers.  Because of this, it is
   desirable that sources can be added to SDP in a way that avoids
   signaling glare.

多くの参加者が同時に操作するので、 SDP へのソースの追加は、
シグナリングの glare を回避して行えると望ましい。


### 1.1.4.  Interworking with other devices

   When interacting with devices that do not apply all of the techniques
   described in this document, it must be possible to degrade gracefully
   to a usable basic experience.

対応してないものには、うまくデグレードしたい。


   At a minimum, this basic experience
   should support setting up one audio stream and more than one video
   stream with existing videoconferencing equipment designed to
   establish a small number of simultaneous audio and video flows.
   For
   the remainder of this document, we will call these devices "legacy
   devices," although it should be understood that statements about
   legacy devices apply equally to future devices that elect not to use
   the techniques described in this document.

基本は、audio 一つ、 video 一つ以上のパターン
それをレガシーとして、そこでもうまく動かしたい？

### 1.1.5.  Avoidance of excessive port allocation

   When there are dozens or hundreds of streams, it is desirable to
   avoid creating dozens or hundreds of transports, as empirical data
   shows a clear inverse relationship between number of transports (NAT
   bindings) and call success rate.  While BUNDLE helps avoid creating
   large numbers of transports, it is also desirable to avoid creating
   large numbers of ports during call setup.

確率も下がるし、コストも高いので、
ストリームの数が多いとき、それぞれに接続を作るのはさけたい。


### 1.1.6.  Simple binding of MediaStreamTrack to SDP

   In WebRTC, each media source is identified by a MediaStreamTrack
   object.  In order to ensure that the MSTs created by the sender show
   up at the receiver, each MST's id attribute needs to be reflected in
   SDP.


WebRTC では、ここメディアソースは MediaStreamTrack から独立している。
sender が作った MST が receiver で認識できるように、 id が SDP に必須。


### 1.1.7.  Support for RTX, FEC, simulcast, layered coding

   For robust applications, techniques like RTX and FEC are used to
   protect media, and simulcast/layered coding can be used to provide
   support to heterogeneous receivers.  It needs to be possible to
   support these techniques, allow the recipient to optionally use or
   not use them on a source-by-source basis; and for simulcast/layered
   scenarios, to control which simulcast streams or layers are received.


Forward Error Correction (FEC) and Retransmission (RTX) が
メディアの保護や、 simul/layered coding が異種の receivers で受けられるように
source-by-source と、 simul/layered のシナリオではこれらをサポートする必要がある。


## 1.2.  Terminology

   5-tuple: A collection of the following values: source IP address,
   source transport port, destination IP address, destination transport
   port and transport protocol.

   Transport-Flow: An transport 5 Tuple representing the UDP source and
   destination IP address and port over which RTP is flowing.

   m-line: An SDP [RFC4566] media description identifier that starts
   with an "m=" field and conveys the following values: media type,
   transport port, transport protocol and media format descriptions.

   Offer: An [RFC3264] SDP message generated by the participant who
   wishes to initiate a multimedia communication session.  An Offer
   describes the participant's capabilities for engaging in a multimedia
   session.

   Answer: An [RFC3264] SDP message generated by the participant in
   response to an Offer.  An Answer describes the participant's
   capabilities in continuing with the multimedia session with in the
   constraints of the Offer.


   - 5-tuple: source-IP, source-Port, dest-IP, dest-port, protocol の組
   - Transport-Flow: RTP が流れる UDP の 5-tuple
   - m-line: SDP の 'm=' で始まるやつ。(type, port, protocol, format)

## 1.3.  Syntax Conventions

# 2.  Solution Overview

   At a high level, the solution described in this document can be
   summarized as follows:

   要約

   1.  Each media stream track is represented by its own unique m-line.
       This is a strict one-to-one mapping; a single media stream track
       cannot be spread across several m-lines, nor may a single m-line
       represent multiple media stream tracks.  Note that this requires
       a modification to the way simulcast is currently defined by the
       individual draft [I-D.westerlund-avtcore-rtp-simulcast].  This
       does not preclude "application level" simulcasting; i.e., the
       creation of multiple media stream tracks from a single source.

   1.  個々の media stream track は一つ一つが独自の m-line を持つ。
       厳密に一つで、 1 track が複数 m-line に分かれたり、
       1 m-line が複数 track になったりしない。
       これは、別ドラフトにある simulcast の方法をを変える必要がある。
       これは "application level" の simulcasting を邪魔しない。
       たとえば、一つのソースから複数の track を生成する場合など。

   2.  Each m-line is marked with an a=ssrc attribute to correlate it
       with its RTP packets.  Absent any other signaled extension,
       multiple SSRCs in a single m-line are interpreted as alternate
       sources for the same media stream track: although senders can
       switch between the SSRCs as frequently as desired, only one
       should be sent at any given time.

   2.  個々の m-line は a=ssrc 属性で、 RTP パケットと紐づく。
       
       TODO:

   3.  Each m-line contains an MSID value to correlate it with a Media
       Stream ID and the Media Stream Track ID.

   3.  m-line はそれぞれ、 Media Stream ID と Media Stream Track ID を紐づける
       MSID を持つ。

   4.  To minimize port allocation during a call, we rely on the BUNDLE
       [I-D.ietf-mmusic-sdp-bundle-negotiation] mechanism.

   4.  call 時の port の割当を最小にするため、 BUNDLE mechanism を使う。

   5.  To reduce port allocation during call set-up, applications can
       mark less-critical media stream tracks in such a way that they
       will not require any port allocation, with the resulting property
       that such streams only work in the presence of the BUNDLE
       mechanism.

   5.  call 時の port の割当を最小にするため、アプリは優先度の低い Media Stream Track に,
       ポートを割り当てる必要がないとマークをつけることができる。
       
       TODO:


   6.  To address glare, we define a procedure via which partial offer/
       answer exchanges may take place.  These exchanges operate on a
       single m-line at a time, rather than an entire SDP body.  These
       operations are defined in a way that can completely avoid glare
       for stream additions and removals, and which reduces the chance
       of glare for changes to active streams.  This approach requires
       all m-lines to contain an a=mid attribute.

   6.  glare に対処するため、部分的 offer/answer が発生するかを知る方法を定義する。
       SPD の body ではなく、一つの m-line で交換


   7.  All sources in a single bundle are required to contain identical
       attributes except for those that apply directly to a media stream
       track (such as label, msid, and resolution).  See those
       attributes marked "IDENTICAL" in
       [I-D.nandakumar-mmusic-sdp-mux-attributes] for details.

   7.  一つに bundle された 全 source は、media stream に直接つく値(label, msid, resolution など)とは別に 一意な属性を持つ必要がある。
       詳細は "IDENTICAL" で。


   8.  RTP and RTCP streams are demultiplexed strictly based on their
       SSRC.  However, to handle legacy cases and signaling/media races,
       correlation of streams to m-sections can use other mechanisms, as
       described in Section 3.2.

   8.  RTP と RTCP の stream を、 SSRC を元に多重化する。
       しかし、レガシーな singaling/media の競合に対応するため、
       stream と m-section の関連づけは、他のメカニズムを使うことができる。




# 3.  Detailed Description

## 3.1.  Bundle-Only M-Lines

   Even with the use of BUNDLE, it is expensive to allocate ICE
   candidates for a large number of m-lines.  An offer can contain
   "bundle-only" m-lines which will be negotiated only by endpoints
   which implement this specification and ignored by other endpoints.

BUNDLE を用いても、 m-line が多いと ICE candidate の取得が高コストになる。
offer は "bundle-only" の m-line を入れることで、この仕様を満たすエンドポイントとだけやり取りできる。
実装されてなければ無視される。


      OPEN ISSUE: While it's probably pretty clear that this behavior
      will be controlled, in WebRTC, via a constraint, the "default"
      behavior -- that is, whether a line is "bundle-only" when there is
      no constraint present -- needs to be settled.  This is a balancing
      act between maximizing interoperation with legacy equipment by
      default or minimizing port use during call setup by default.

   In order to offer such an m-line, the offerer does two things:

そんな m-line を offer するには、二つのことが必要。

   o  Sets the port in the m-line to 0.  This indicates to old endpoints
      that the m-line is not to be negotiated.

   o  Adds an a=bundle-only line.  This indicates to new endpoints that
      the m-line is to be negotiated if (and only if) bundling is used.

   -  m-line の port を 0 にする。これで古い実装が m-line でネゴしない。
   -  a=bundle-only を追加し、bundle が使われてれば m-line をネゴする。

   An example offer that uses this feature looks like this:

   結果こうなる。

```
   v=0
   o=- 20518 0 IN IP4 203.0.113.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=group:BUNDLE S1 S2 S3
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7

   m=audio 54400 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 20970
   a=mid:1
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=ssrc:53280
   a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 203.0.113.1 54401 typ host

   m=video 0 RTP/SAVPF 96 97
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 1714
   a=mid:2
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=ssrc:49152
   a=bundle-only
   m=video 0 RTP/SAVPF 96 97
   a=msid:ma tc
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 57067
   a=mid:3
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=ssrc:32768
   a=bundle-only
```

   An old endpoint simply rejects the bundle-only m-lines by responding
   with a 0 port.  (This isn't a normative statement, just a description
   of the way the older endpoints are expected to act.)

古い実装は、bundle-only の m-line を port 0 で却下する。(はず)

```
   v=0
   o=- 20518 0 IN IP4 203.0.113.1
   s=
   t=0 0
   c=IN IP4 203.0.113.2
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7

   m=audio 55400 RTP/SAVPF 0 96
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=candidate:0 1 UDP 2113667327 203.0.113.2 55400 typ host
   a=candidate:1 2 UDP 2113667326 203.0.113.2 55401 typ host

   m=video 0 RTP/SAVPF 96 97  # 0=失敗
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv

   m=video 0 RTP/SAVPF 96 97  # 0=失敗
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv
```

   A new endpoint accepts the m-lines (both bundle-only and regular) by
   offering m-lines with a valid port, though this port may be
   duplicated as specified in Section 6 of
   [I-D.ietf-mmusic-sdp-bundle-negotiation].  For instance:

bundle-only と regular で m-line を accept したエンドポイントは、
ポートが被ってくる。


```
   v=0
   o=- 20518 0 IN IP4 203.0.113.2
   s=
   t=0 0
   c=IN IP4 203.0.113.2
   a=group:BUNDLE B1 B2 B3
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7

   m=audio 55400 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 24860
   a=mid:1
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=ssrc:35987
   a=candidate:0 1 UDP 2113667327 203.0.113.2 55400 typ host

   m=video 55400 RTP/SAVPF 96 97  # 同じ
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 49811
   a=mid:B2
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=ssrc:9587
   a=bundle-only

   m=video 55400 RTP/SAVPF 96 97  # 同じ
   a=msid:ma tc
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 9307
   a=mid:3
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:97 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=ssrc:21389
   a=bundle-only
```

   Endpoints MUST NOT accept bundle-only m-lines if they are not part of
   an accepted bundle group.

エンドポイントは許可された bundle group じゃ無い bundle-only の m-line を許可してはいけない。

# 3.2.  Correlation

TODO: こっから 4 まで全部

# 4.  Examples

   In all of these examples, there are many lines that are wrapped due
   to column width limitation.  It should be understood these lines are
   not wrapped in the real SDP.

サンプルの SDP 実際は改行されないよ。

   The convention used for IP addresses in this drafts is that private
   IP behind a NAT come from 192.0.2.0/24, the public side of a NAT
   comes from 198.51.100.0/24 and the TURN servers have addresses from
   203.0.113.0/24.  Typically the offer has an IP ending in .1 and the
   answer has an IP ending in .2.

IP は NAT 192.0.2.0/24 の裏で、表は 198.51.100.0/24
TURN は 203.0.113.0/24
offer 側は 1 で終わる IP、 answer 側は 2 で終わる。


   The examples do not include all the parts of SDP that are used in
   RTCWeb (See [I-D.ietf-rtcweb-rtp-usage]) as that makes the example
   unwieldy to read but instead focuses on showing the parts that are
   key for the multiplexing.

全部ではなく多重化に関わる部分に間引いてる。


## 4.1.  Simple example with one audio and one video

   The following SDP shows an offer that offers one audio stream and one
   video steam with both a STUN and TURN address.  It also shows unique
   payload across the audio and video m=lines for the Answerer that does
   not support BUNDLE semantics.

1-audio, 1-video を STUN, TURN で offer する例。
BUNDLE をサポートしないので m-line が別

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:074c6550
   a=ice-pwd:a28a397a4c3f31747d1ee3474af08a068
   a=fingerprint:sha-1 99:41:49:83:4a:97:0e:1f:ef:6d:f7:c9:c7:70:9d:1f:66:79:a8:07
   a=group:BUNDLE m1 m2

   m=audio 56600 RTP/SAVPF 0 109  # 別
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 33424
   a=mid:m1
   a=ssrc:53280
   a=rtpmap:0 PCMU/8000
   a=rtpmap:109 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 56602 RTP/SAVPF 99 120  # 別
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 35969
   a=mid:m2
   a=ssrc:49843
   a=rtpmap:99 H264/90000
   a=fmtp:99 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:120 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=candidate:3 1 UDP 2113667327 192.0.2.1 54402 typ host
   a=candidate:4 2 UDP 2113667326 192.0.2.1 54403 typ host
   a=candidate:3 1 UDP 694302207 198.51.100.1 55502 typ srflx raddr 192.0.2.1 rport 54402
   a=candidate:4 2 UDP 169430220 198.51.100.1 55503 typ srflx raddr 192.0.2.1 rport 54403
   a=candidate:3 1 UDP 73545215 203.0.113.1 56602 typ relay raddr 192.0.2.1 rport 54402
   a=candidate:4 2 UDP 51989708 203.0.113.1 56603 typ relay raddr 192.0.2.1 rport 54403
```

   The following shows an answer to the above offer from a device that
   does not support bundle or rtcp-mux.

上への anwer , bundle も rtcp-mux もサポートしてない

```
   v=0
   o=- 16833 0 IN IP4 198.51.100.2
   s=
   t=0 0
   c=IN IP4 203.0.113.2
   a=ice-ufrag:c300d85b
   a=ice-pwd:de4e99bd291c325921d5d47efbabd9a2
   a=fingerprint:sha-1 91:41:49:83:4a:97:0e:1f:ef:6d:f7:c9:c7:70:9d:1f:66:79:a8:03

   m=audio 60600 RTP/SAVPF 109  # 別
   a=msid:ma ta
   a=rtpmap:109 opus/48000
   a=ptime:20
   a=sendrecv
   a=candidate:0 1 UDP 2113667327 192.0.2.2 60400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.2 60401 typ host
   a=candidate:0 1 UDP 1694302207 198.51.100.2 60500 typ srflx raddr 192.0.2.2 rport 60400
   a=candidate:1 2 UDP 1694302206 198.51.100.2 60501 typ srflx raddr 192.0.2.2 rport 60401
   a=candidate:0 1 UDP 73545215 203.0.113.2 60600 typ relay raddr 192.0.2.1 rport 60400
   a=candidate:1 2 UDP 51989708 203.0.113.2 60601 typ relay raddr 192.0.2.1 rport 60401

   m=video 60602 RTP/SAVPF 99  # 別
   a=msid:ma tb
   a=rtpmap:99 H264/90000
   a=fmtp:99 profile-level-id=4d0028;packetization-mode=1
   a=sendrecv
   a=candidate:2 1 UDP 2113667327 192.0.2.2 60402 typ host
   a=candidate:3 2 UDP 2113667326 192.0.2.2 60403 typ host
   a=candidate:2 1 UDP 694302207 198.51.100.2 60502 typ srflx raddr 192.0.2.2 rport 60402
   a=candidate:3 2 UDP 169430220 198.51.100.2 60503 typ srflx raddr 192.0.2.2 rport 60403
   a=candidate:2 1 UDP 73545215 203.0.113.2 60602 typ relay raddr 192.0.2.2 rport 60402
   a=candidate:3 2 UDP 51989708 203.0.113.2 60603 typ relay raddr 192.0.2.2 rport 60403
```

   The following shows answer to the above offer from a device that does
   support bundle.

bundle をサポートしてる answer

```
   v=0
   o=- 16833 0 IN IP4 198.51.100.2
   s=
   t=0 0
   c=IN IP4 203.0.113.2
   a=ice-ufrag:c300d85b
   a=ice-pwd:de4e99bd291c325921d5d47efbabd9a2
   a=fingerprint:sha-1 91:41:49:83:4a:97:0e:1f:ef:6d:f7:c9:c7:70:9d:1f:66:79:a8:03
   a=group:BUNDLE m1 m2  # bundle サポート

   m=audio 60600 RTP/SAVPF 109  # port が一緒になる
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 39829
   a=mid:m1
   a=ssrc:35856
   a=rtpmap:109 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.2 60400 typ host
   a=candidate:0 1 UDP 1694302207 198.51.100.2 60500 typ srflx raddr 192.0.2.2 rport 60400
   a=candidate:0 1 UDP 73545215 203.0.113.2  60600 typ relay raddr 192.0.2.1 rport 60400

   m=video 60600 RTP/SAVPF 99  # port が一緒になる
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 45163
   a=mid:m2
   a=ssrc:2638
   a=rtpmap:99 H264/90000
   a=fmtp:99 profile-level-id=4d0028;packetization-mode=1
   a=sendrecv
   a=rtcp-mux
   a=candidate:3 1 UDP 2113667327 192.0.2.2 60400 typ host
   a=candidate:3 1 UDP 694302207 198.51.100.2 60500 typ srflx raddr 192.0.2.2 rport 60400
   a=candidate:3 1 UDP 73545215 203.0.113.2  60600 typ relay raddr 192.0.2.2 rport 60400
```


## 4.2.  Multiple Videos

   Simple example showing an offer with one audio stream and two video
   streams.

1-audio, 2-video

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m1 m2 m3  # bundle サポート

   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 47434
   a=mid:m1
   a=ssrc:32385
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 56602 RTP/SAVPF 96 98
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 22705
   a=mid:m2
   a=ssrc:43985
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:98 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=candidate:2 1 UDP 2113667327 192.0.2.1 54402 typ host
   a=candidate:3 2 UDP 2113667326 192.0.2.1 54403 typ host
   a=candidate:2 1 UDP 694302207 198.51.100.1 55502 typ srflx raddr 192.0.2.1 rport 54402
   a=candidate:3 2 UDP 169430220 198.51.100.1 55503 typ srflx raddr 192.0.2.1 rport 54403
   a=candidate:2 1 UDP 73545215 203.0.113.1 56602 typ relay raddr 192.0.2.1 rport 54402
   a=candidate:3 2 UDP 51989708 203.0.113.1 56603 typ relay raddr 192.0.2.1 rport 54403
   a=ssrc:11111 cname:45:5f:fe:cb:81:e9

   m=video 56604 RTP/SAVPF 96 98
   a=msid:ma tc
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 64870
   a=mid:m3
   a=ssrc:54269
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:98 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=candidate:4 1 UDP 2113667327 192.0.2.1 54404 typ host
   a=candidate:5 2 UDP 2113667326 192.0.2.1 54405 typ host
   a=candidate:4 1 UDP 694302207 198.51.100.1 55504 typ srflx raddr 192.0.2.1 rport 54404
   a=candidate:5 2 UDP 169430220 198.51.100.1 55505 typ srflx raddr 192.0.2.1 rport 54405
   a=candidate:4 1 UDP 73545215 203.0.113.1 56604 typ relay raddr 192.0.2.1 rport 54404
   a=candidate:5 2 UDP 51989708 203.0.113.1 56605 typ relay raddr 192.0.2.1 rport 54405
   a=ssrc:22222 cname:45:5f:fe:cb:81:e9
```

## 4.3.  Many Videos

   This section adds three video streams and one audio.  The video
   streams are sent in such a way that they they are only accepted if
   the far side supports bundle using the "bundle only" approach
   described in Section 3.1.  The video streams also use the same
   payload types so it will not be possible to demux the video streams
   from each other without using the SSRC values.

   1-audio, 3-video.
   "bundel only" を使う
   SSRC 無いと demux できない。

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m0 m1 m2 m3

   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 6614
   a=mid:m0
   a=ssrc:12359
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=ssrc:12359 cname:45:5f:fe:cb:81:e9
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 0 RTP/SAVPF 96 98
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 24147
   a=mid:m1
   a=ssrc:26989
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:98 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=bundle-only  # これ
   a=ssrc:26989 cname:45:5f:fe:cb:81:e9

   m=video 0 RTP/SAVPF 96 98
   a=msid:ma tc
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 33989
   a=mid:m2
   a=ssrc:32986
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:98 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=bundle-only  # これ
   a=ssrc:32986 cname:45:5f:fe:cb:81:e9

   m=video 0 RTP/SAVPF 96 98
   a=msid:ma td
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 61408
   a=mid:m3
   a=ssrc:46986
   a=rtpmap:96 H264/90000
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1
   a=rtpmap:98 VP8/90000
   a=sendrecv
   a=rtcp-mux
   a=bundle-only  # これ
   a=ssrc:46986 cname:45:5f:fe:cb:81:e9
```


## 4.4.  Multiple Videos with Simulcast

   This section shows an offer with with audio and two video each of
   which can send it two resolutions as described in Section 3.3.  One
   video stream supports VP8, while the other supports H.264.  All the
   video is bundle-only.  Note that the use of different codec-specific
   parameters causes two different payload types to be used.

audio-1, video-2(vp8, h.264, 別解像度), bundle-only
codec-specific parameter が別になる。

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m0 m1 m2

   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 31727
   a=mid:m0
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 0 RTP/SAVPF 96 100
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 41664
   b=AS:1756
   a=mid:m1
   a=rtpmap:96 VP8/90000  # VP8
   a=ssrc-group:SIMULCAST 58949 28506
   a=ssrc:58949 imageattr:96 [x=1280,y=720]
   a=ssrc:28506 imageattr:96 [x=640,y=480]
   a=sendrecv
   a=rtcp-mux
   a=bundle-only

   m=video 0 RTP/SAVPF 96 100
   a=msid:ma tc
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 14460
   b=AS:1756
   a=mid:m2
   a=rtpmap:96 H264/90000  # H.264
   a=fmtp:96 profile-level-id=4d0028;packetization-mode=1;max-fr=30
   a=rtpmap:100 H264/90000
   a=fmtp:100 profile-level-id=4d0028;packetization-mode=1;max-fr=15
   a=ssrc-group:SIMULCAST 18875 54986
   a=ssrc:18875
   a=ssrc:54986
   a=sendrecv
   a=rtcp-mux
   a=bundle-only
```

## 4.5.  Video with Simulcast and RTX

   This section shows an SDP offer that has an audio and a single video
   stream.  The video stream that is simulcast at two resolutions and
   has [RFC4588] style re-transmission flows.

audio-1, video-1(simul, reso-2, re-trans)

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m0 m1

   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 42123
   a=mid:m0
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 0 RTP/SAVPF 96 101
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 60725
   b=AS:2500
   a=mid:m1
   a=rtpmap:96 VP8/90000
   a=rtpmap:101 rtx/90000
   a=fmtp:101 apt=96;rtx-time=3000
   a=ssrc-group:SIMULCAST 78909 43567
   a=ssrc-group:FID 78909 56789
   a=ssrc-group:FID 43567 13098
   a=ssrc:78909
   a=ssrc:43567
   a=ssrc:13098
   a=ssrc:56789
   a=sendrecv
   a=rtcp-mux
   a=bundle-only
```


## 4.6.  Video with Simulcast and FEC

   This section shows an SDP offer that has an audio and a single video
   stream.  The video stream that is simulcast at two resolutions and
   has [RFC5956] style FEC flows.

```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m0 m1
   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 42123
   a=mid:m0
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 0 RTP/SAVPF 96 101
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 60725
   b=AS:2500
   a=mid:m1
   a=rtpmap:96 VP8/90000
   a=rtpmap:101 1d-interleaved-parityfec/90000
   a=fmtp:96 max-fr=30;max-fs=8040
   a=fmtp:101 L=5; D=10; repair-window=200000
   a=ssrc-group:SIMULCAST 56780 34511
   a=ssrc-group:FEC-FR 56780 48675
   a=ssrc-group:FEC-FR 34511 21567
   a=ssrc:56780
   a=ssrc:34511
   a=ssrc:21567
   a=ssrc:48675
   a=sendrecv
   a=rtcp-mux
   a=bundle-only
```


## 4.7.  Video with Layered Coding

   This section shows an SDP offer that has an audio and a single video
   stream.  The video stream that is layered coding at 3 different
   resolutions based on [RFC5583].  The video m=lines shows 3 streams
   with last stream (payload 100) dependent on streams with payload 96
   and 97 for decoding.

audio-1, video-1(layer-3)
m=lines が 3 stream で 96, 97 に 100 が依存している。


```
   v=0
   o=- 20518 0 IN IP4 198.51.100.1
   s=
   t=0 0
   c=IN IP4 203.0.113.1
   a=ice-ufrag:F7gI
   a=ice-pwd:x9cml/YzichV2+XlhiMu8g
   a=fingerprint:sha-1 42:89:c5:c6:55:9d:6e:c8:e8:83:55:2a:39:f9:b6:eb:e9:a3:a9:e7
   a=group:BUNDLE m0 m1

   m=audio 56600 RTP/SAVPF 0 96
   a=msid:ma ta
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 42123
   a=mid:m0
   a=rtpmap:0 PCMU/8000
   a=rtpmap:96 opus/48000
   a=ptime:20
   a=sendrecv
   a=rtcp-mux
   a=candidate:0 1 UDP 2113667327 192.0.2.1 54400 typ host
   a=candidate:1 2 UDP 2113667326 192.0.2.1 54401 typ host
   a=candidate:0 1 UDP 694302207 198.51.100.1 55500 typ srflx raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 169430220 198.51.100.1 55501 typ srflx raddr 192.0.2.1 rport 54401
   a=candidate:0 1 UDP 73545215 203.0.113.1 56600 typ relay raddr 192.0.2.1 rport 54400
   a=candidate:1 2 UDP 51989708 203.0.113.1 56601 typ relay raddr 192.0.2.1 rport 54401

   m=video 0 RTP/SAVPF 96 97 100
   a=msid:ma tb
   a=extmap:1 urn:ietf:params:rtp-hdrext:stream-correlator 60725
   b=AS:2500
   a=mid:m1
   a=rtpmap:96 H264/90000
   a=fmtp:96 max-fr=30;max-fs=8040
   a=rtpmap:97 H264/90000
   a=fmtp:97 max-fr=15;max-fs=1200
   a=rtpmap:100 H264-SVC/90000
   a=fmtp:100 max-fr=30;max-fs=8040
   a=depend:100 lay m1:96,97;
   a=ssrc:48970
   a=ssrc:90898
   a=ssrc:66997
   a=sendrecv
   a=rtcp-mux
   a=bundle-only
```
