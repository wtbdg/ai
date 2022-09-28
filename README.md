# AI Happy Meter

Happy Meter based on your expression in a camera.

## How to use the demo

1. Open https://wtbdg.github.io/ai/ on your smartphone
2. Try to smile. Sticker will change based on your expression
3. Press Capture button to capture your expression
4. Press button on the left to take another one
5. Press button on the right to save your expression into an image file

## How it works

The heart of the lib is `JEELIZFACEEXPRESSIONS`. It relies on *Jeeliz WebGL Deep Learning* technology to detect and track the user's face using a deep learning network, and to simultaneously evaluate the expression factors. The accuracy is adaptative: the best is the hardware, the more detections are processed per second. All is done client-side.

Here is the indices of the morphs returned by this library:

* 0:  smileRight &rarr; closed mouth smile right
* 1:  smileLeft  &rarr; closed mouth smile left
* 2:  eyeBrowLeftDown &rarr; left eyebrow frowned
* 3:  eyeBrowRightDown &rarr; right eyebrow frowned
* 4:  eyeBrowLeftUp &rarr; raise left eyebrow (surprise)
* 5:  eyeBrowRightUp &rarr; raise right eyebrow (surprise)
* 6:  mouthOpen &rarr; open mouth
* 7:  mouthRound &rarr; o shaped mouth
* 8:  eyeRightClose &rarr; close right eye
* 9:  eyeLeftClose  &rarr; close left eye
* 10: mouthNasty   &rarr; nasty mouth (show teeth)

## Documentation

https://github.com/jeeliz/jeelizWeboji/blob/master/doc/jeelizFaceExpressions.pdf
