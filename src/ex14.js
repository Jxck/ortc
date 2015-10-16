// Example of 3-layer temporal scalability encoding
let encodings = [
  {
    // Base framerate is one quarter of the input framerate
    encodingId: "0",
    framerateScale: 4.0
  },
  {
    // Temporal enhancement (half the input framerate when combined with the base layer)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    framerateScale: 2.0
  },
  {
    // Another temporal enhancement layer (full input framerate when all layers combined)
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    framerateScale: 1.0
  }
];

// Example of 3-layer temporal scalability with all but the base layer disabled
let encodings = [
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
