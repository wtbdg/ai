const videoElm = document.querySelector('#video');
const btnFront = document.querySelector('#btn-front');
const btnBack = document.querySelector('#btn-back');

const supports = navigator.mediaDevices.getSupportedConstraints();
// if (!supports['facingMode']) {
//     alert('Browser Not supported!');
//     return;
// }

let stream;

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
capture('user');
btnBack.addEventListener('click', () => {
    capture('environment');
});

btnFront.addEventListener('click', () => {
    capture('user');
});