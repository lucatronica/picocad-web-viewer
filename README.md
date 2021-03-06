# WebGL viewer for picoCAD scenes.

## [Demo: https://lucatronica.github.io/picocad-web-viewer/](https://lucatronica.github.io/picocad-web-viewer/)

## Example usage

```js
import PicoCADViewer from "./pico-cad-viewer.esm.js";

const myCanvas = document.getElementByID("my-canvas");

const viewer = new PicoCadViewer({
	canvas: myCanvas,
});

// Load models from file, string or URL.
viewer.load("./my-model.txt");

// Draw the model manually or start a draw loop.
if (oneShot) {
	viewer.draw();
} else {
	let spin = 0;

	viewer.startDrawLoop((dt) => {
		// This callback is called before every frame is drawn.
		spin += dt;
		viewer.setTurntableCamera(8, spin, 0.1);
		viewer.setLightDirectionFromCamera();
	});
}
```

## TODO:

* Improve triangulation of complex faces to reduce UV distortion.
* Give option to fix Z-fighting on model load, maybe provide user directed method to resolve.
