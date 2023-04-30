import { GIFEncoder, quantize, applyPalette } from "./gifenc";
import { rgbToInt } from "../src/color";

let gifRecorder = new GIFEncoder();

/** @type {Uint8Array[]} */
let frames = [];

/**
 * @param {Uint8Array} frame
 */
function addFrame(frame) {
	frames.push(frame);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} scale
 * @param {number} delay
 * @param {number[]} background
 * @param {import("./gifenc").GIFPalette|null} globalPalette
 * @param {number} transparentIndex
 */
function generateAndReset(width, height, scale, delay, background, globalPalette, transparentIndex) {
	let pixelCount = width * height;
	let recycledIndices = null;
	let scaledIndices = new Uint8Array(pixelCount * scale * scale);
	let paletteIntToIndex = globalPalette == null ? null : new Map(globalPalette.map((rgb, i) => [ rgbToInt(rgb), i ]));

	for (let i = 0; i < frames.length; i++) {
		let frame = frames[i];
		
		// Replace transparent pixels with background color.
		for (let i = 0; i < frame.length; i += 4) {
			if (frame[i + 3] < 255) {
				frame[i    ] = background[0];
				frame[i + 1] = background[1];
				frame[i + 2] = background[2];
				frame[i + 3] = background[3];
			}
		}
		
		// Quantize and apply palette.
		let palette = null;
		let indices;
		let isTransparent = false;

		if (globalPalette == null) {
			// Have no palette, need to quantize and paletize each frame.
			palette = quantize(frame, 256, {
				format: "rgba4444",
			});

			// Check for transparent pixels.
			for (let ci = 0; ci < palette.length; ci++) {
				let color = palette[ci];

				if (color.length >= 4 && color[3] < 255) {
					isTransparent = true;
					transparentIndex = ci;
				}
			}

			indices = applyPalette(frame, palette, "rgba4444");
		} else {
			// Only need to write the global palette once.
			if (i === 0) {
				palette = globalPalette;
			}

			// Use our simplified method of mapping colors to indices.
			// Should be more efficient since we know what colors are going to appear.
			let ints = new Uint32Array(frame.buffer);
			
			if (recycledIndices == null) {
				recycledIndices = new Uint8Array(pixelCount);
			}

			for (let i = 0; i < ints.length; i++) {
				recycledIndices[i] = paletteIntToIndex.get(ints[i]) ?? 0;
			}

			indices = recycledIndices;

			isTransparent = transparentIndex >= 0;
		}

		// Transform indices:
		// Flip vertically (WebGL buffer is top to bottom).
		let srcRowIndex = pixelCount - width;
		let dstRowIndex = 0;
		let outWidth1 = width * scale;
		let outWidth2 = outWidth1 * scale;

		for (let y = 0; y < height; y++) {
			let srcIndex = srcRowIndex;
			let dstIndex = dstRowIndex;

			for (let x = 0; x < width; x++) {
				let index = indices[srcIndex];

				if (scale === 1) {
					scaledIndices[dstIndex] = index;
					dstIndex++;
				} else {
					// Repeat index in square region.
					let outIndexLoc = dstIndex;

					for (let sy = 0; sy < scale; sy++) {
						for (let sx = 0; sx < scale; sx++) {
							scaledIndices[outIndexLoc + sx] = index;
						}

						outIndexLoc += outWidth1;
					}

					dstIndex += scale;
				}
				
				srcIndex++;
			}

			srcRowIndex -= width;
			dstRowIndex += outWidth2;
		}

		// Write indices to GIF buffer.
		gifRecorder.writeFrame(scaledIndices, width * scale, height * scale, {
			palette: palette,
			delay: delay,
			transparent: isTransparent,
			transparentIndex: transparentIndex,
		});
	}

	// Finalize GIF and send to main script.
	gifRecorder.finish();

	let buffer = gifRecorder.bytesView();

	postMessage({ type: "gif", data: buffer }, [ buffer.buffer ]);

	// Cleanup.
	gifRecorder.reset();

	frames.length = 0;
}

addEventListener("message", (event) => {
	let data = event.data;

	let eventType = data.type;

	if (eventType === "generate") {
		generateAndReset(data.width, data.height, data.scale, data.delay, data.background, data.palette, data.transparentIndex);
	} else if (eventType === "frame") {
		addFrame(data.data);
	}
});

// Tell main script we're ready.
postMessage({ type: "load" });
