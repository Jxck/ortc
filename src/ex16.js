// Example of 3-layer spatial scalability encoding
let encodings = [
  {
    // Base layer with one quarter input resolution
    encodingId: "0",
    resolutionScale: 4.0
  },
  {
    // Spatial enhancement layer providing half input resolution when combined with the base layer
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0
  },
  {
    // Additional spatial enhancement layer providing full input resolution when combined with all layers 
    encodingId: "2",
    dependencyEncodingIds: ["0", "1"],
    resolutionScale: 1.0
  }
];

// Example of 3-layer spatial scalability with all but the base layer disabled
let encodings = [
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

// Example of 2-layer spatial scalability combined with 2-layer temporal scalability
let encodings = [
  {
    // Base layer (half input framerate, half resolution)
    encodingId: "0",
    resolutionScale: 2.0,
    framerateScale: 2.0
  },
  {
    // Temporal enhancement to the base layer (full input framerate, half resolution)
    encodingId: "1",
    dependencyEncodingIds: ["0"],
    resolutionScale: 2.0,
    framerateScale: 1.0
  },
  {
    // Spatial enhancement to the base layer (half input framerate, full resolution)
    encodingId: "E0",
    dependencyEncodingIds: ["0"],
    resolutionScale: 1.0,
    framerateScale: 2.0
  },
  {
    // Temporal enhancement to the spatial enhancement layer (full input framerate, full resolution)
    encodingId: "E1",
    dependencyEncodingIds: ["E0", "1"],
    resolutionScale: 1.0,
    framerateScale: 1.0
  }
];
