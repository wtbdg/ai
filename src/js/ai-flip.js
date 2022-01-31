const videoElm = document.querySelector('#video');
const canvasElm = window.canvas = document.querySelector('#canvid');
const btnFront = document.querySelector('#btn-front');
const btnBack = document.querySelector('#btn-back');

canvasElm.width = 480;
canvasElm.height = 360;

const supports = navigator.mediaDevices.getSupportedConstraints();
// if (!supports['facingMode']) {
//     alert('Browser Not supported!');
//     return;
// }

let stream;

function clone_video() {
  canvasElm.width = videoElm.videoWidth;
  canvasElm.height = videoElm.videoHeight;
  canvasElm.getContext('2d').drawImage(videoElm, 0, 0, canvasElm.width, canvasElm.height);
};
const capture = async facingMode => {
    const options = {
        audio: false,
        video: {
            facingMode,
        },
    };

    try {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        stream = await navigator.mediaDevices.getUserMedia(options);
    } catch (e) {
        alert(e);
        return;
    }
    videoElm.srcObject = null;
    videoElm.srcObject = stream;
    videoElm.play();
}
// clone_video();
btnBack.addEventListener('click', () => {
    capture('environment');
});

btnFront.addEventListener('click', () => {
    capture('user');
});