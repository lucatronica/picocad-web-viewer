# WebGL viewer for picoCAD files

## [lucatronica.github.io/picocad-web-viewer/](https://lucatronica.github.io/picocad-web-viewer/)
## [luca.games/picocad/](https://luca.games/picocad/)

## Light-maps

Color palettes and shading can be customized using light-maps.

![Enlarged default picoCAD light-map](default_lightmap_large.png)

A light-map must be 32 pixels wide, but can be any height.

Each 2-pixel-column specifies the shading for one color.

* Each row is a shading level, going from light-to-dark from top-to-bottom.
* The pair of pixels in each row are used to control dithering.
	* To have no dithering make both colors the same.
* The order of the columns correspond to the PICO-8 color indices.

The default picoCAD light-maps are a good starting point for customization:

![Default picoCAD light-map](default_lightmap.png)

[See here for examples of custom light-maps](https://luca.games/picocad/light-maps/).

> Note the GIF export feature will break when using custom light-maps with more than 16 colors.

## Usage

The model viewer can be freely used in other contexts.

```js
// Example usage //

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
