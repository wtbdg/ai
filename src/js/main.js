"use strict";

// SETTINGS of this demo:
const SETTINGS = {
  strokeStyle: 'red',
  rotationOffsetX: 0, // negative -> look upper. in radians
  cameraFOV: 40,    // in degrees, 3D camera FOV
  pivotOffsetYZ: [0.2,0.2], // XYZ of the distance between the center of the cube and the pivot
  detectionThreshold: 0.75, // sensibility, between 0 and 1. Less -> more sensitive
  detectionHysteresis: 0.05,
  scale: [1,1.24], // scale of the 2D canvas along horizontal and vertical 2D axis
  offsetYZ: [-0.1,-0.2], // offset of the 2D canvas along vertical and depth 3D axis
  canvasSizePx: 512 // resolution of the 2D canvas in pixels
};

// some globalz:
let CV = null, CANVAS2D = null, CTX = null, GL = null, CANVASTEXTURE = null, CANVASTEXTURENEEDSUPDATE = false;
function update_canvasTexture(){
  CANVASTEXTURENEEDSUPDATE = true;
}
const DISPLACEMENT_THRESHOLD = 2.8;

let emotions = {};
let expressions = [];
let displacement = 9999;

//entry point :
function main() {
  let CVD = null;
  JEEFACETRANSFERAPI.init({
    canvasId: "canvas",
    NNCpath: "src/model/",
    callbackReady: function(errCode) {
      if (errCode) {
        console.log(
          "ERROR - cannot init JEEFACETRANSFERAPI. errCode =",
          errCode
        );
        errorCallback(errCode);
        return;
      }
      console.log("INFO : JEEFACETRANSFERAPI is ready !!!");
      successCallback();
    } //end callbackReady()
  });
  JEELIZFACEFILTER.init({
      canvasId: 'canvas',
      NNCPath: 'src/model/',
      callbackReady: function(errCode, spec) {
          if (errCode) {
              console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
              return;
          }
          console.log('INFO: JEELIZFACEFILTER IS READY');
          successCallback();
          CVD = JeelizCanvas2DHelper(spec);
          CVD.ctx.strokeStyle = 'yellow';
      },
      callbackTrack: function(detectState) {
          if (detectState.detected > 0.8) {
              const faceCoo = CVD.getCoordinates(detectState);
              CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);
              CVD.ctx.strokeRect(faceCoo.x, faceCoo.y, faceCoo.w, faceCoo.h);
              CVD.update_canvasTexture();
          }
          CVD.draw();
      }
  });
}



function successCallback() {
  // Call next frame
  nextFrame();
  // Add code after API is ready.
}

function errorCallback(errorCode) {
  // Add code to handle the error
  alert("Some error occured " + errorCode);
}

function nextFrame() {
  if (JEEFACETRANSFERAPI.is_detected()) {
    // Do something awesome with rotation values
    let rotation = JEEFACETRANSFERAPI.get_rotationStabilized();
    // Do something awesome with animation values
    expressions = JEEFACETRANSFERAPI.get_morphTargetInfluences();
    getMeanDisplacement(rotation);
    if (displacement > DISPLACEMENT_THRESHOLD) {
      let emotions = get_emotions();
      var meter = document.getElementById("canvas-wrap");
      if (emotions.happy <= 0.25) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-superhappy");
        meter.classList.remove("meter-happy");
      };
      if (emotions.happy >= 0.3) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-superhappy");
        meter.classList.add("meter-happy");
      };
      if (emotions.happy >= 0.5) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-happy");
        meter.classList.add("meter-superhappy");
      };
      if (emotions.happy >= 0.7) {
        meter.classList.remove("meter-superhappy");
        meter.classList.remove("meter-happy");
        meter.classList.add("meter-growhappy");
      };
      
      document.getElementById("canvas-wrap").dataset.state = emotions.happy;
      // document.getElementById("emotion-anger").style.opacity = emotions.anger;
      // document.getElementById("emotion-surprise").style.opacity = emotions.surprise;
      // document.getElementById("emotion-happy").style.opacity = emotions.happy;
      // document.getElementById("emotion-fear").style.opacity = emotions.fear;
      // document.getElementById("emotion-sad").style.opacity = emotions.sad;
    }

    //**************************************************************************** */

    // The API is detected
    console.log("Detected");
  } else {
    // Tell the user that detection is off.
    console.log("Not Detected");
  }
  // Replay frame
  requestAnimationFrame(nextFrame);
}

function getMeanDisplacement(rotation) {
  displacement = 0;
  let factors = rotation.concat(expressions);
  for (let index = 0; index < factors.length; index++) {
    const element = Math.abs(factors[index]);
    displacement += element;
  }
}
