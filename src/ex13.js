// Send a thumbnail along with regular size, prioritizing the thumbnail (ssrc: 2)
let encodings = [{ ssrc: 1, priority: 1.0 }];
let encodings = [{ ssrc: 2, priority: 10.0 }];

// Sign Language (need high framerate, but don't get too bad quality)
let encodings = [{ minQuality: 0.2, framerateBias: 1.0 }];

// Screencast (High quality, framerate can be low)
let encodings = [{ framerateBias: 0.0 }];

// Remote Desktop (High framerate, must not downscale)
let encodings = [{ framerateBias: 1.0 }];

// Audio more important than video
let audioEncodings = [{ priority: 10.0 }];
let videoEncodings = [{ priority: 0.1 }];

// Video more important than audio
let audioEncodings = [{ priority: 0.1 }];
let videoEncodings = [{ priority: 10.0 }];

// Crank up the quality
let encodings = [{ maxBitrate: 10000000 }];

// Keep the bandwidth low
let encodings = [{ maxBitrate: 100000 }];
