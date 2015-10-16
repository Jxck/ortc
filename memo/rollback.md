https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-09#section-4.1.4.2

4.1.4.2.  Rollback

  In certain situations it may be desirable to "undo" a change made to
  setLocalDescription or setRemoteDescription.  Consider a case where a
  call is ongoing, and one side wants to change some of the session
  parameters; that side generates an updated offer and then calls
  setLocalDescription.

  setLocal/RemoteDescription の結果を undo したいときがある。
  例えば、一方が offer を更新し、 setLocalDescription を読んだ状態で
  もう一方がセッションパラメータを変更した場合。


  However, the remote side, either before or
  after setRemoteDescription, decides it does not want to accept the
  new parameters, and sends a reject message back to the offerer.  Now,
  the offerer, and possibly the answerer as well, need to return to a
  stable state and the previous local/remote description.  To support
  this, we introduce the concept of "rollback".

  しかし、相手では、 setRemoteDecription をする前でも後でも、
  新しいパラメータを受け入れたく無い。
  offer 側、恐らく answer 側も、 stable state で、以前の local/remote 
  description に戻りたい。
  これをサポートするために、 "rollback" する。


  A rollback discards any proposed changes to the session, returning
  the state machine to the stable state, and setting the modified local
  and/or remote description back to their previous values.  Any
  resources or candidates that were allocated by the abandoned local
  description are discarded; any media that is received will be
  processed according to the previous local and remote descriptions.

  rollback はセッションへの変更を全て破棄し、state を stable に戻す、
  そして更新された local/remote description を戻す。
  途中の resouce や candidate は破棄される。
  受信した全てのメディアは以前の description に従って処理される。


  Rollback can only be used to cancel proposed changes; there is no
  support for rolling back from a stable state to a previous stable
  state.  Note that this implies that once the answerer has performed
  setLocalDescription with his answer, this cannot be rolled back.

  rollback は提案された変更だけキャンセルできる。
  すでに変更が適用された stable state ら、前の state には戻れない。
  一度 answer 側に setLocalDescription された answer はもう rollback できない。

  A rollback is performed by supplying a session description of type
  "rollback" with empty contents to either setLocalDescription or
  setRemoteDescription, depending on which was most recently used (i.e.
  if the new offer was supplied to setLocalDescription, the rollback
  should be done using setLocalDescription as well).

  rollback は SDP の type "rollback" かつ空のコンテンツを setLocal/RemoteDescription
  することで提供される。(もし setLocalDescription で offer を受けたなら、
  setLocalDescription で戻す)
