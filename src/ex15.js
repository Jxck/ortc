// Example of 3-layer spatial simulcast
let encodings = [
  {
    // Simulcast layer at one quarter scale
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    // Simulcast layer at one half scale
    encodingId: "1",
    resolutionScale: 2.0
  },
  {
    // Simulcast layer at full scale
    encodingId: "2",
    resolutionScale: 1.0
  }
];

// Example of 3-layer spatial simulcast with all but the lowest resolution layer disabled
let encodings = [
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

// Example of 2-layer spatial simulcast combined with 2-layer temporal scalability
let encodings = [
  {
    // Low resolution base layer (half the input framerate, half the input resolution)
    encodingId: "0",
    resolutionScale: 2.0,
    framerateScale: 2.0
  },
  {
    // Enhanced resolution Base layer (half the input framerate, full input resolution)
    encodingId: "E0",
    resolutionScale: 1.0,
    framerateScale: 2.0
  },
  {
    // Temporal enhancement to the low resolution base layer (full input framerate, half resolution)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0,
    framerateScale: 1.0
  },
  {
    // Temporal enhancement to the enhanced resolution base layer (full input framerate and resolution)
    encodingId: "E1",
    dependencyEncodingIds: ["E0"],
    resolutionScale: 1.0,
    framerateScale: 1.0
  }
];
