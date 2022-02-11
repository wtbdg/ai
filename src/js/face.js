"use strict";

const DISPLACEMENT_THRESHOLD = 2.5;

let emotions = {};
let expressions = [];
let displacement = 9999;

//entry point :
// entry point - launched by body.onload():
function smile() {
  JEEFACETRANSFERAPI.set_size(360,740);
  // $(".btn-save").prop('value', 'Loading...');
  $(".loading").css("display", "grid");
  JEEFACETRANSFERAPI.init({
    canvasId: "canvas",
    NNCpath: "src/model/",
    videoSettings: {
      // videoElement: "#video",
      deviceId: 'video',
      facingMode: 'user',
      isAudio: false
    },
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
      // $(".btn-save").prop('value', 'Save Expression');
      JEEFACETRANSFERAPI.set_color([0, 0, 0]);
      $("video").addClass("canvas");
      $(".loading").css("display", "none");
    } //end callbackReady()
  });
} //end main()

function successCallback() {
  // Call next frame
  nextFrame();
  $("video").addClass("canvas");
  // Add code after API is ready.
}

function errorCallback() {
  // Add code to handle the error
  // alert("Some error occured " + errorCode);
  // setTimeout(function(){
  //   location = ''
  // },2000)
  $("body").css("display","grid").css("place-items","center").html("<a style='display: block; color:#fff' href='javascript:location.reload(true)'>Refresh</a>")
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
      if (emotions.happy <= 0.02) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-superhappy");
        meter.classList.remove("meter-happy");
      };
      if (emotions.happy >= 0.05) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-superhappy");
        meter.classList.add("meter-happy");
      };
      if (emotions.happy >= 0.12) {
        meter.classList.remove("meter-growhappy");
        meter.classList.remove("meter-happy");
        meter.classList.add("meter-superhappy");
      };
      if (emotions.happy >= 0.2) {
        meter.classList.remove("meter-superhappy");
        meter.classList.remove("meter-happy");
        meter.classList.add("meter-growhappy");
      };
      
      // document.getElementById("canvas-wrap").dataset.state = emotions.happy;
      // document.getElementById("emotion-anger").style.opacity = emotions.anger;
      // document.getElementById("emotion-surprise").style.opacity = emotions.surprise;
      // document.getElementById("emotion-happy").style.opacity = emotions.happy;
      // document.getElementById("emotion-fear").style.opacity = emotions.fear;
      // document.getElementById("emotion-sad").style.opacity = emotions.sad;
    }

    //**************************************************************************** */

    // The API is detected
    // console.log("Detected");
  } else {
    // Tell the user that detection is off.
    // console.log("Not Detected");
  }
  // Replay frame
  requestAnimationFrame(nextFrame);
  // return window.JEEFACETRANSFERAPI();
}

function getMeanDisplacement(rotation) {
  displacement = 0;
  let factors = rotation.concat(expressions);
  for (let index = 0; index < factors.length; index++) {
    const element = Math.abs(factors[index]);
    displacement += element;
  }
}