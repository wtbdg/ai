"use strict";

/*
The code of this demonstration may seems complicated but it is not
If you want to play only with the 2D canvas displayed above the head,
Its context is CTX and it matches the canvas element CANVAS2D

If you draw something on the 2D canvas using CTX.drawStuff(...)
You should call update_canvasTexture(); after in order to update the 3D canvas
at the next rendering.
*/


// SETTINGS of this demo:
const SETTINGS = {
  strokeStyle: 'red',
  rotationOffsetX: 0, // negative -> look upper. in radians
  cameraFOV: 40,    // in degrees, 3D camera FOV
  pivotOffsetYZ: [0.0, 0.2], // XYZ of the distance between the center of the cube and the pivot
  detectionThreshold: 0.75, // sensibility, between 0 and 1. Less -> more sensitive
  detectionHysteresis: 0.05,
  scale: [1.0, 1.0], // scale of the 2D canvas along horizontal and vertical 2D axis
  offsetYZ: [-0.1, -0.2], // offset of the 2D canvas along vertical and depth 3D axis
  canvasSizePx: 1280 // resolution of the 2D canvas in pixels
};

// some globalz:
let CV = null, CANVAS2D = null, CTX = null, GL = null, CANVASTEXTURE = null, CANVASTEXTURENEEDSUPDATE = false;
let PROJMATRIX = null, PROJMATRIXNEEDSUPDATE = true;
let VBO_VERTEX = null, VBO_FACES = null, SHADERCANVAS = null;
let SHADERVIDEO = null, VIDEOTEXTURE = null, VIDEOTRANSFORMMAT2 = null;
let MOVMATRIX = create_mat4Identity(), MOVMATRIXINV = create_mat4Identity();

let ZPLANE = 0, YPLANE = 0;
let ISDETECTED = false;


// callback: launched if a face is detected or lost.
function detect_callback(isDetected) {
  if (isDetected) {
    console.log('INFO in detect_callback(): DETECTED');
  } else {
    console.log('INFO in detect_callback(): LOST');
  }
}

//BEGIN MATRIX ALGEBRA FUNCTIONS
function create_mat4Identity() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

// set the position part of a flattened transposed mat4:
function set_mat4Position(m, x, y, z) {
  m[12] = x;
  m[13] = y;
  m[14] = z;
}

// set the rotation part of a flattened transposed mat4 - see https://en.wikipedia.org/wiki/Euler_angles
function set_mat4RotationXYZ(m, rx, ry, rz) {
  const c1 = Math.cos(rx), s1 = Math.sin(rx),
    c2 = Math.cos(ry), s2 = Math.sin(ry),
    c3 = Math.cos(rz), s3 = Math.sin(rz);
  // first line (not transposed)
  m[0] = c2 * c3;
  m[4] = -c2 * s3;
  m[8] = s2;

  // second line (not transposed)
  m[1] = c1 * s3 + c3 * s1 * s2;
  m[5] = c1 * c3 - s1 * s2 * s3;
  m[9] = -c2 * s1;

  // third line (not transposed)
  m[2] = s1 * s3 - c1 * c3 * s2;
  m[6] = c3 * s1 + c1 * s2 * s3;
  m[10] = c1 * c2;
}

// inverse a mat4 move matrix m and put result to mat4 matrix r
function inverse_mat4MoveMatrix(m, r) {
  // rotation part: the inverse = the transpose
  r[0] = m[0];
  r[1] = m[4];
  r[2] = m[8];

  r[4] = m[1];
  r[5] = m[5];
  r[6] = m[9];

  r[8] = m[2];
  r[9] = m[6];
  r[10] = m[10];

  // translation part: = -tR.T where T=[m[12], m[13], m[14]]
  r[12] = -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]);
  r[13] = -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]);
  r[14] = -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]);
}

function multiply_matVec4(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]
  ];
}

function get_mat4Pos(m) {
  return [m[12], m[13], m[14]]
}
//END MATRIX ALGEBRA FUNCTIONS


//BEGIN WEBGL HELPERS
// compile a shader:
function compile_shader(source, glType, typeString) {
  const glShader = GL.createShader(glType);
  GL.shaderSource(glShader, source);
  GL.compileShader(glShader);
  if (!GL.getShaderParameter(glShader, GL.COMPILE_STATUS)) {
    alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(glShader));
    console.log('Buggy shader source: \n', source);
    return null;
  }
  return glShader;
};

// helper function to build the shader program:
function build_shaderProgram(shaderVertexSource, shaderFragmentSource, id) {
  // compile both shader separately:
  const glShaderVertex = compile_shader(shaderVertexSource, GL.VERTEX_SHADER, "VERTEX " + id);
  const glShaderFragment = compile_shader(shaderFragmentSource, GL.FRAGMENT_SHADER, "FRAGMENT " + id);

  const glShaderProgram = GL.createProgram();
  GL.attachShader(glShaderProgram, glShaderVertex);
  GL.attachShader(glShaderProgram, glShaderFragment);

  // start the linking stage:
  GL.linkProgram(glShaderProgram);
  return glShaderProgram;
}

// helper function to create the projection matrix:
function update_projMatrix() {
  const tan = Math.tan(0.5 * SETTINGS.cameraFOV * Math.PI / 180),
    zMax = 100, zMin = 0.1, a = CV.width / CV.height;

  const A = -(zMax + zMin) / (zMax - zMin),
    B = (-2 * zMax * zMin) / (zMax - zMin);

  PROJMATRIX = [
    1.0 / tan, 0, 0, 0,
    0, a / tan, 0, 0,
    0, 0, A, -1,
    0, 0, B, 0
  ];

  GL.uniformMatrix4fv(SHADERCANVAS.projMatrix, false, PROJMATRIX);
  PROJMATRIXNEEDSUPDATE = false;
}

//END WEBGL HELPERS


//build the 3D. called once when Jeeliz Face Filter is OK
function init_scene(spec) {
  // affect some globalz:
  GL = spec.GL;
  CV = spec.canvasElement;
  VIDEOTEXTURE = spec.videoTexture;
  VIDEOTRANSFORMMAT2 = spec.videoTransformMat2;

  // create and size the 2D canvas and its drawing context:
  CANVAS2D = document.createElement('canvas');
  CANVAS2D.width = SETTINGS.canvasSizePx;
  CANVAS2D.height = Math.round(SETTINGS.canvasSizePx * SETTINGS.scale[1] / SETTINGS.scale[0]);
  CTX = CANVAS2D.getContext('2d');
  CTX.strokeStyle = SETTINGS.strokeStyle;
  CTX.lineWidth = 4;
  // const frameImage = new Image()
  // frameImage.src = 'assets/images/aiframe-m.png';
  // frameImage.onload = function () {
  //   CTX.drawImage(frameImage, 0, 0, frameImage.width, frameImage.height, 0, 0, CANVAS2D.width, CANVAS2D.height);
  //   update_canvasTexture();
  // }

  // create the WebGL texture with the canvas:
  CANVASTEXTURE = GL.createTexture();
  GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE);
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, CANVAS2D);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);

  // create the face plane:
  const sx = SETTINGS.scale[0], sy = SETTINGS.scale[1];  // scale
  YPLANE = SETTINGS.offsetYZ[0] + SETTINGS.pivotOffsetYZ[0]; // offset
  ZPLANE = SETTINGS.offsetYZ[1] + SETTINGS.pivotOffsetYZ[1];
  VBO_VERTEX = GL.createBuffer();
  GL.bindBuffer(GL.ARRAY_BUFFER, VBO_VERTEX);
  GL.bufferData(GL.ARRAY_BUFFER,
    new Float32Array([ //format of each vertex: x,y,z,  u,v
      -sx, -sy + YPLANE, ZPLANE, 1, 1,
      sx, -sy + YPLANE, ZPLANE, 0, 1,
      sx, sy + YPLANE, ZPLANE, 0, 0,
      -sx, sy + YPLANE, ZPLANE, 1, 0
    ]), GL.STATIC_DRAW);

  // FACES:
  VBO_FACES = GL.createBuffer();
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, VBO_FACES);
  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([
      0, 1, 2, 0, 2, 3
    ]), GL.STATIC_DRAW);

  // create the shaders:
  const copyCropVertexShaderSource = "attribute vec2 position;\n\
     uniform mat2 videoTransformMat2;\n\
     varying vec2 vUV;\n\
     void main(void){\n\
      gl_Position = vec4(position, 0., 1.);\n\
      vUV = vec2(0.5,0.5) + videoTransformMat2 * position;\n\
     }";

  const copyFragmentShaderSource = "precision lowp float;\n\
     uniform sampler2D samplerImage;\n\
     varying vec2 vUV;\n\
     \n\
     void main(void){\n\
      gl_FragColor = texture2D(samplerImage, vUV);\n\
     }";
  const shpVideo = build_shaderProgram(copyCropVertexShaderSource, copyFragmentShaderSource, 'VIDEO');
  SHADERVIDEO = {
    program: shpVideo,
    videoTransformMat2: GL.getUniformLocation(shpVideo, 'videoTransformMat2')
  };
  let uSampler = GL.getUniformLocation(shpVideo, 'samplerImage');
  GL.useProgram(shpVideo);
  GL.uniform1i(uSampler, 0);

  const shpCanvas = build_shaderProgram( //basic 3D projection shader
    "attribute vec3 position;\n\
    attribute vec2 uv;\n\
    uniform mat4 projMatrix, movMatrix;\n\
    varying vec2 vUV;\n\
    void main(void){\n\
      gl_Position = projMatrix*movMatrix*vec4(position, 1.);\n\
      vUV = uv;\n\
    }",
    copyFragmentShaderSource, 'CANVAS');

  SHADERCANVAS = {
    program: shpCanvas,
    projMatrix: GL.getUniformLocation(shpCanvas, 'projMatrix'),
    movMatrix: GL.getUniformLocation(shpCanvas, 'movMatrix'),
    position: GL.getAttribLocation(shpCanvas, 'position'),
    uv: GL.getAttribLocation(shpCanvas, 'uv')
  };
  uSampler = GL.getUniformLocation(shpCanvas, 'samplerImage');
  GL.useProgram(shpCanvas);
  GL.uniform1i(uSampler, 0);
  GL.disableVertexAttribArray(shpCanvas, SHADERCANVAS.position);
  GL.disableVertexAttribArray(shpCanvas, SHADERCANVAS.uv);
} //end init_scene()



function update_canvasTexture() {
  CANVASTEXTURENEEDSUPDATE = true;
}

// entry point - launched by body.onload():
function canvas() {
  JeelizResizer.size_canvas({
    canvasId: 'canvas2',
    isFullScreen: true,
    CSSFlipX: true,
    callback: start
  });
};

function start() {
  JEELIZFACEFILTER.init({
    canvasId: 'canvas2',
    NNCPath: 'src/model/', // root of NN_DEFAULT.json file
    // animateDelay: 2,
    // maxFacesDetected: 2,
    // videoSettings: {
    //   facingMode: 'user',
    //   isAudio: false
    // },
    callbackReady: function (errCode, spec) {
      if (errCode) {
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: JEELIZFACEFILTER IS READY');
      init_scene(spec);
      successCallback();
      $(".btn-save").prop('value', 'Save Expression');
    }, //end callbackReady()

    // called at each render iteration (drawing loop):
    callbackTrack: function (detectState) {
      if (ISDETECTED && detectState.detected < SETTINGS.detectionThreshold - SETTINGS.detectionHysteresis) {
        // DETECTION LOST
        detect_callback(false);
        ISDETECTED = false;
      } else if (!ISDETECTED && detectState.detected > SETTINGS.detectionThreshold + SETTINGS.detectionHysteresis) {
        // FACE DETECTED
        detect_callback(true);
        ISDETECTED = true;
      }

      // render the video screen:
      GL.viewport(0, 0, CV.width, CV.height);
      GL.useProgram(SHADERVIDEO.program);
      GL.uniformMatrix2fv(SHADERVIDEO.videoTransformMat2, false, VIDEOTRANSFORMMAT2);
      GL.bindTexture(GL.TEXTURE_2D, VIDEOTEXTURE);
      GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0);

      if (ISDETECTED) {
        const aspect = CV.width / CV.height;

        // move the cube in order to fit the head:
        const tanFOV = Math.tan(aspect * SETTINGS.cameraFOV * Math.PI / 360); // tan(FOV/2), in radians
        const W = detectState.s;  // relative width of the detection window (1-> whole width of the detection window)
        const D = 1 / (2 * W * tanFOV); // distance between the front face of the cube and the camera

        // coords in 2D of the center of the detection window in the viewport:
        const xv = detectState.x;
        const yv = detectState.y;

        // coords in 3D of the center of the cube (in the view coordinates system):
        const z = -D - 0.5;   // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
        const x = xv * D * tanFOV;
        const y = yv * D * tanFOV / aspect;

        // move and rotate the cube:
        set_mat4Position(MOVMATRIX, x, y + SETTINGS.pivotOffsetYZ[0], z + SETTINGS.pivotOffsetYZ[1]);
        set_mat4RotationXYZ(MOVMATRIX, detectState.rx + SETTINGS.rotationOffsetX, detectState.ry, detectState.rz);

        // render the canvas above:
        GL.clear(GL.DEPTH_BUFFER_BIT);
        GL.enable(GL.BLEND);
        GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        GL.useProgram(SHADERCANVAS.program);
        GL.enableVertexAttribArray(SHADERCANVAS.position);
        GL.enableVertexAttribArray(SHADERCANVAS.uv);
        GL.uniformMatrix4fv(SHADERCANVAS.movMatrix, false, MOVMATRIX);
        if (PROJMATRIXNEEDSUPDATE) {
          update_projMatrix();
        }
        GL.bindTexture(GL.TEXTURE_2D, CANVASTEXTURE);
        if (CANVASTEXTURENEEDSUPDATE) {
          GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, CANVAS2D);
          CANVASTEXTURENEEDSUPDATE = false;
        }
        GL.bindBuffer(GL.ARRAY_BUFFER, VBO_VERTEX);
        GL.vertexAttribPointer(SHADERCANVAS.position, 3, GL.FLOAT, false, 20, 0);
        GL.vertexAttribPointer(SHADERCANVAS.uv, 2, GL.FLOAT, false, 20, 12);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, VBO_FACES);
        GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
        GL.disableVertexAttribArray(SHADERCANVAS.uv);
        GL.disableVertexAttribArray(SHADERCANVAS.position);
        GL.disable(GL.BLEND);
      } //end if face detected
    } //end callbackTrack()
  }); //end JEELIZFACEFILTER.init call
}
