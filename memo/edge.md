# RTCIceGatherOptions

 - gatherPolicy と iceServers を両方必須で登録しないと InvalidAccessError になる。


# RTCIceGatherer

 - onlocalcandidate event の complete が実装されてない
  - candidate.foundation があるはずなので undefined 判定できそう
 - ongatherstatechange event は発生しない
 - state property は undefined
 - close() は実装されてない。呼ぶとエラー。


# RTCIceTransport

 - getSelectedCandidatePair() は実装されてない。呼ぶとエラー。
 - iceGatherer プロパティは null
 - stop() あり
 - onicestatechange => 発火した
 - oncandidatepairchange 発火しない

 - addRemoteCandidate の場合は complete を示すために最後は `{complete: true}` を add する
   - 代わりに上がってくる `{}` でも良い。
   - set の場合はいらない？


# RTCDtlsTransport

 - ondtlsstatechange 発火しない？ => した


# capability

 - トラックの数だけやり取りしてからじゃないと video タグに突っ込んでもダメっぽい。

# RTCSctpTransport

 - そんなものなかった


# other


 - 先に video に突っ込んでから addTrack してもだめ。
 - ssrc は自分のなかで被らなければ良い。(MS は audio: 1001, video: 3003 固定)
 - Receiver.track を MediaStream に addTrack するのは DTLS の state が connected になってから、かつ receive() 呼んだ後が一番正しい模様。



```
dtlsTr.addEventListener('dtlsstatechange', function(e) {
  if(dtlsTr.state === 'connected') {
    var remoteStream = new MediaStream();
    remoteStream.addTrack(videoRecver.track);
    document.getElementById('remote_video').srcObject = remoteStream;
  }
});
```

MS のをベースとしたデモのソース: https://gist.github.com/Jxck/d5e1b8656b1c6b41fff7
