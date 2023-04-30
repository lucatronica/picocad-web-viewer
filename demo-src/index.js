import PicoCADViewer from "../src/index";
import { urlCompressModel, urlDecompressModel } from "./model-compression";
import { PICO_COLORS } from "../src/pico";

// Get elements
const texCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("texture"));
const texHDImage = /** @type {HTMLImageElement} */(document.getElementById("texture-hd"));
const viewportCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("viewport"));
const inputResolution = /** @type {HTMLSelectElement} */(document.getElementById("input-resolution"));
const inputAutoTurn = /** @type {HTMLInputElement} */(document.getElementById("input-auto-turn"));
const inputWireframe = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe"));
const inputWireframeColor = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe-color"));
const inputRenderMode = /** @type {HTMLSelectElement} */(document.getElementById("input-render-mode"));
const inputBackgroundColor = /** @type {HTMLInputElement} */(document.getElementById("input-background-color"));
const inputBackgroundColorEnabled = /** @type {HTMLInputElement} */(document.getElementById("input-background-color-enabled"));
const inputBackgroundTransparent = /** @type {HTMLInputElement} */(document.getElementById("input-background-transparent"));
const inputShading = /** @type {HTMLInputElement} */(document.getElementById("input-shading"));
const inputFOV = /** @type {HTMLInputElement} */(document.getElementById("input-fov"));
const inputHDContainer = /** @type {HTMLElement} */(document.getElementById("hd-controls"));
const inputHDSteps = /** @type {HTMLInputElement} */(document.getElementById("input-hd-steps"));
const inputHDAmbient = /** @type {HTMLInputElement} */(document.getElementById("input-hd-ambient"));
const btnShowControls = /** @type {HTMLButtonElement} */(document.getElementById("btn-show-controls"));
const inputGifFps = /** @type {HTMLInputElement} */(document.getElementById("input-gif-fps"));
const inputOutlineSize = /** @type {HTMLInputElement} */(document.getElementById("input-outline-size"));
const inputOutlineColor = /** @type {HTMLInputElement} */(document.getElementById("input-outline-color"));
const inputWatermark = /** @type {HTMLInputElement} */(document.getElementById("input-watermark"));
const btnRecordGIF = /** @type {HTMLButtonElement} */(document.getElementById("btn-record-gif"));
const gifStatusEl = /** @type {HTMLButtonElement} */(document.getElementById("gif-status"));
const popupControls = document.getElementById("popup-controls");
const popupImageOptions = document.getElementById("popup-image-options");
const statsTable = document.getElementById("stats");

// Load worker.
let worker = new Worker("worker.js");
let workerLoaded = false;

worker.onmessage = (event) => {
	let data = event.data;

	// Handle response to message.
	let type = data.type;

	if (type === "gif") {
		gifStatusEl.hidden = true;
		
		downloadGif(data.data);
	}

	// Once loaded, enabled recording etc.
	if (!workerLoaded) {
		workerLoaded = true;
		btnRecordGIF.disabled = false;
	}
};

// Create viewer
const pcv = new PicoCADViewer({
	canvas: viewportCanvas,
});
window["viewer"] = pcv;

// App/renderer state
let cameraSpin = -Math.PI / 2;
let cameraRoll = 0.2;
let cameraRadius = 12;
let cameraTurntableSpeed = 0.75;
let cameraTurntableCenter = {x: 0, y: 1.5, z: 0};
let cameraTurntableAuto = true;
let cameraMode = 0;


// Model load wrapper.

/**
 * @param {import("../src/index").PicoCADSource} source 
 */
async function loadModel(source, saveToURL=true) {
	// Load the model.
	const model = await pcv.load(source);
	window["model"] = model;

	console.log(`=== load "${model.name}" ===`);

	// Enable UI hints.
	viewportCanvas.classList.add("loaded");

	// Set turntable radius from zoom level.
	cameraRadius = model.zoomLevel;

	// Draw texture.
	texCanvas.hidden = false;
	texHDImage.hidden = true;
	texCanvasCtx.putImageData(pcv.getModelTexture(), 0, 0);

	// Reset custom state.
	pcv.removeHDTexture();

	// Show stats
	const faceCount = model.objects.reduce((acc, obj) => acc + obj.faces.length, 0);

	while (statsTable.lastChild != null) statsTable.lastChild.remove();

	statsTable.append(h("li", { class: "filename" }, pcv.model.name), h("br"));

	const stats = {
		// "Colors": pcv.getTextureColorCount(),
		"Objects": model.objects.length,
		"Faces": faceCount,
	};

	console.log(`${pcv.getTriangleCount()} triangles, ${pcv.getDrawCallCount()} draw calls`);

	for (const [key, value] of Object.entries(stats)) {
		statsTable.append(h("li", {}, ` ${key}: ${value}`));
	}

	// Add compressed model text to URL.
	if (saveToURL) {
		const compressed = urlCompressModel(model);
		history.pushState(null, "", "#" + compressed);
		console.log(`lzw base64: ${compressed.length} bytes`);
	}
}


// Example model.

function loadExample(saveToURL=true) {
	loadModel("./example.txt", saveToURL);
}


// Palette loading

let hdImageObjectURL = null;

/**
 * @param {File} file
 */
function loadImage(file) {
	if (hdImageObjectURL != null) {
		URL.revokeObjectURL(hdImageObjectURL);
	}

	hdImageObjectURL = URL.createObjectURL(file);

	const img = new Image();
	img.onload = () => {
		// Get ImageData.
		const canvas = document.createElement("canvas");
		canvas.id = "image-drop-preview";
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Check texture info.
		const isPico8 = isPico8Texture(imageData);
		const isLightMap = imageData.width === 32;

		// Get actions we can make.
		/** @type {[string, number, () => void][]} */
		const actions = [];

		// Light map action
		if (isLightMap) {
			actions.push(["Light-map", 0, () => {
				pcv.setLightMap(imageData);
				texCanvasCtx.putImageData(pcv.getModelTexture(), 0, 0);
			},]);

			// These have been hidden for simplicity.
			// Maybe show in expandable list
// 			actions.push(["Texture light-map", 1, () => {
// 				pcv.setTextureLightMap(imageData);
// 				texCanvasCtx.putImageData(pcv.getModelTexture(), 0, 0);
// 			},]);
		}

		// Basic texture action
		actions.push(["Texture", 0, () => {
			texCanvas.hidden = true;
			texHDImage.hidden = false;
			texHDImage.src = hdImageObjectURL;

			if (isPico8) {
				// PICO-8 style texture
				inputHDContainer.hidden = true;
				pcv.removeHDTexture();
				pcv.setIndexTexture(imageData);
			} else {
				// HD Texture
				inputHDContainer.hidden = false;
				pcv.setHDTexture(imageData);
			}
		}]);

		// If just one action, execute it right away.
		if (actions.length === 1) {
			actions[0][2]();
			return;
		}

		// Show actions in popup.
		popupImageOptions.hidden = false;
		const el = popupImageOptions.firstElementChild;
		el.innerHTML = "";

		el.append(
			canvas,
			h("p", {}, "How should this image be used?"),
		);

		for (const [label, ident, callback] of actions) {
			const btn = h("div", {class: "lil-btn"}, label);
			btn.style.marginLeft = `${ident * 30}px`;
			btn.onclick = () => {
				callback();
				popupImageOptions.hidden = true;
			};
			el.append(btn);
		}
	};

	img.src = hdImageObjectURL;
}


/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgbToInt(r, g, b) {
	return 0xff000000 | (b << 16) | (g << 8) | r;
}

/**
 * @param {ImageData} imageData 
 */
function isPico8Texture(imageData) {
	const colors = new Set(PICO_COLORS.map(([r, g, b]) => rgbToInt(r, g, b)));

	const ints = new Int32Array(imageData.data.buffer);

	for (let i = 0, n = ints.length; i < n; i++) {
		const int = ints[i];
		if (!colors.has(int)) {
			return false;
		}
	}

	return true;
}


// Extra model loading steps + stats

const texCanvasCtx = texCanvas.getContext("2d");


// Popups

document.querySelectorAll(".popup").forEach(/** @type {(el: HTMLElement) => void} */(popup) => {
	popup.addEventListener("click", (event) => {
		if (event.target === popup) {
			popup.hidden = !popup.hidden;
		}
	});
});

btnShowControls.onclick = () => {
	popupControls.hidden = !popupControls.hidden;
};

popupControls.querySelectorAll("kbd").forEach(kbd => {
	kbd.onclick = () => keyPressed(kbd.textContent.toLowerCase());
});


// GIF recording

const GIF_MAX_LEN = 30; // seconds

/** Delay between frames in seconds. */
let gifDelay = 0.02;
let gifRecording = false;
let gifTime = 0;
let gifInitialSpin = 0;

function toggleGifRecording() {
	if (gifRecording) {
		stopRecordingGif();
	} else {
		startRecordingGif();
	}
}

function startRecordingGif() {
	gifRecording = true;
	gifTime = 0;
	gifInitialSpin = cameraSpin;

	btnRecordGIF.textContent = "Recording GIF...";
	btnRecordGIF.classList.add("recording");
	viewportCanvas.classList.add("recording");
	inputGifFps.disabled = true;
}

function stopRecordingGif() {
	gifRecording = false;

	btnRecordGIF.textContent = "Record GIF";
	btnRecordGIF.classList.remove("recording");
	viewportCanvas.classList.remove("recording");
	inputGifFps.disabled = false;
	gifStatusEl.hidden = false;

	// Render GIF in worker.
	let resolution = pcv.getResolution();
	let background = pcv.getRenderedBackgroundColor();
	let palette = null;
	let transparentIndex = -1;

	// If possible, determine the global color palette.
	if (!pcv.hasHDTexture()) {
		palette = pcv.getPalette();

		if (palette.length > 256) {
			palette = null;
		} else {
			// Have a palette, handle transparent background index.
			// A bit hacky, we know that the background index is at the end of the `pcv.getPalette()` array.
			if (pcv.backgroundColor != null && pcv.backgroundColor[3] < 1) {
				transparentIndex = palette.length - 1;
			}
		}
	}
	
	worker.postMessage({
		type: "generate",
		width: resolution.width,
		height: resolution.height,
		scale: resolution.scale,
		delay: Math.round(gifDelay * 1000),
		background: background,
		palette: palette,
		transparentIndex: transparentIndex,
	});
}

/**
 * @param {Uint8Array} bytes
 */
function downloadGif(bytes) {
	const fileName = `${pcv.model.name}.gif`;

	const file = new File([ bytes ], fileName, {
		type: "image/gif",
	});

	const url = URL.createObjectURL(file);

	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.append(a);
	a.click();

	a.remove();
	URL.revokeObjectURL(url);
	
	console.log(`downloaded ${fileName} ${file.size / 1024}kb`);
}

// /** @type {{ scale: number, indices?: Uint8Array, pixels?: Uint8Array }[]} */
// let gifFrames = [];

function putGifFrame() {
	let data = pcv.getPixels();

	worker.postMessage({
		type: "frame",
		data: data,
	}, [ data.buffer ]);
}


// Input

/**
 * @param {string} key 
 */
function keyPressed(key) {
	if (key === "r") {
		inputWireFrameHandler(!pcv.drawWireframe);
	} else if (key === "t") {
		inputAutoTurnHandler(!cameraTurntableAuto)
	} else if (key === "m") {
		inputRenderModeHandler(inputRenderMode.value === "texture" ? "color" : "texture");
	} else if (key === "l") {
		inputShadingHandler(!inputShading.checked);
	} else if (key === "/" || key === "?") {
		loadExample();
	} else if (key === "g") {
		toggleGifRecording();
	} else if (key === "pause") {
		pcv.stopDrawLoop();
		viewportCanvas.style.opacity = "0.5";
	}
}

const keys = Object.create(null);

window.onkeydown = event => {
	if (event.target === document.body && !event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		const key = event.key.toLowerCase();
		keys[key] = true;

		keyPressed(key);
	}
};
window.onkeyup = event => {
	if (!event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		keys[event.key.toLowerCase()] = false;
	}
};

viewportCanvas.ondblclick = () => {
	if (pcv.loaded) {
		/** @type {HTMLElement} */( document.activeElement )?.blur();

		viewportCanvas.requestPointerLock();
	}
};

viewportCanvas.oncontextmenu = (event) => {
	event.preventDefault();
}

document.onpointerlockchange = (event) => {
	if (document.pointerLockElement === viewportCanvas) {
		cameraMode = 1;
	} else {
		cameraMode = 0;
	}
};


// Viewport mouse controls.

let mouseDown = /** @type {boolean[]} */(Array(5)).fill(false);
let mouseDownViewport = /** @type {boolean[]} */(Array(5)).fill(false);
let mouse = [0, 0];

window.onmousedown = (event) => {
	const button = event.button;
	const isViewport = event.target == viewportCanvas;

	mouseDown[button] = true;
	mouseDownViewport[button] = isViewport;

	if (isViewport) {
		event.preventDefault();

		viewportCanvas.classList.add("grabbing");

		if (cameraMode === 0 && button === 0) {
			inputAutoTurnHandler(false);
		}
	}
};

window.onmouseup = (event) => {
	const button = event.button;

	mouseDown[button] = false;
	mouseDownViewport[button] = false;

	viewportCanvas.classList.remove("grabbing");
};

window.onmousemove = (event) => {
	const mouseNow = [event.clientX, event.clientY];
	const mouseDelta = [mouseNow[0] - mouse[0], mouseNow[1] - mouse[1]];

	if (cameraMode === 1 && document.pointerLockElement === viewportCanvas) {
		const sensitivity = 0.003;

		cameraSpin += event.movementX * sensitivity;
		cameraRoll += event.movementY * sensitivity;
	} else if (cameraMode == 0) {
		if (mouseDownViewport[0]) {
			const sensitivity = 0.005;

			cameraSpin += mouseDelta[0] * sensitivity;
			cameraRoll += mouseDelta[1] * sensitivity;
		} else if (mouseDownViewport[1] || mouseDownViewport[2]) {
			const sensitivity = 0.005;

			const up = pcv.getCameraUp();
			const right = pcv.getCameraRight();
			const rightDelta = mouseDelta[0] * sensitivity;
			const upDelta = -mouseDelta[1] * sensitivity;

			cameraTurntableCenter.x += right.x * rightDelta + up.x * upDelta;
			cameraTurntableCenter.y += right.y * rightDelta + up.y * upDelta;
			cameraTurntableCenter.z += right.z * rightDelta + up.z * upDelta;
		}
	}

	mouse = mouseNow;
};

viewportCanvas.onwheel = (event) => {
	event.preventDefault();

	const dy = clamp(-6, 6, event.deltaY)

	if (cameraMode === 1 || (cameraMode === 0 && event.altKey)) {
		inputFOVUpdate(pcv.cameraFOV + dy);
	} else if (cameraMode === 0) {
		cameraRadius = clamp(0, 200, cameraRadius + dy * 0.5);
	}
};


// Viewport touch controls.

let currTouch = [0, 0, -1];
let touchViewport = false;

document.addEventListener("touchstart", (event) => {
	touchViewport = event.target == viewportCanvas;

	const touch = event.changedTouches[0];

	currTouch = [touch.clientX, touch.clientY, touch.identifier];

	if (touchViewport) {
		event.preventDefault();

		inputAutoTurnHandler(false);
	}
}, { passive: false });

document.addEventListener("touchmove", (event) => {
	const touch = Array.from(event.changedTouches).find(touch => touch.identifier === currTouch[2]);

	if (touch != null) {
		const newTouch = [touch.clientX, touch.clientY, touch.identifier]

		if (touchViewport) {
			const delta = [newTouch[0] - currTouch[0], newTouch[1] - currTouch[1]];
			const sensitivity = 0.01;

			cameraSpin += delta[0] * sensitivity;
			cameraRoll += delta[1] * sensitivity;
		}

		currTouch = newTouch;
	}
});

document.addEventListener("touchend", (event) => {
	const touch = Array.from(event.changedTouches).find(touch => touch.identifier === currTouch[2]);

	if (touch != null) {
		touchViewport = false;
	}
});


// Controls.

if (window.innerWidth < 700) {
	inputResolution.value = "128,128,2";
}

inputHandler(inputResolution, value => {
	const [w, h, scale] = value.split(",").map(s => Number(s));

	pcv.setResolution(w, h, scale);
});

const inputFOVUpdate = inputHandler(inputFOV, () => {
	pcv.cameraFOV = inputFOV.valueAsNumber;
	inputFOV.nextElementSibling.textContent = inputFOV.value;
});

const inputWireFrameHandler = inputHandler(inputWireframe, () => {
	pcv.drawWireframe = inputWireframe.checked;
});

const inputAutoTurnHandler = inputHandler(inputAutoTurn, () => {
	cameraTurntableAuto = inputAutoTurn.checked;
});

inputHandler(inputWireframeColor, (value) => {
	pcv.wireframeColor = hexToRGB(value);
});

inputHandler(inputBackgroundColorEnabled, updateCustomBackground);
inputHandler(inputBackgroundColor, updateCustomBackground);
inputHandler(inputBackgroundTransparent, updateCustomBackground);

function updateCustomBackground() {
	if (inputBackgroundTransparent.checked) {
		pcv.backgroundColor = [0, 0, 0, 0];
	} else {
		pcv.backgroundColor = inputBackgroundColorEnabled.checked ? hexToRGB(inputBackgroundColor.value) : null;
	}
}

const inputRenderModeHandler = inputHandler(inputRenderMode, value => {
	pcv.renderMode = /** @type {import("../src/index").PicoCADRenderMode} */(value);
});

const inputShadingHandler = inputHandler(inputShading, () => {
	pcv.shading = inputShading.checked;
});

const inputHDStepsHandler = inputHandler(inputHDSteps, () => {
	pcv.hdOptions.shadingSteps = inputHDSteps.valueAsNumber;
	inputHDSteps.nextElementSibling.textContent = inputHDSteps.value;
});

const inputHDAmbientHandler = inputHandler(inputHDAmbient, (value) => {
	pcv.hdOptions.shadingColor = hexToRGB(value);
});

const inputGifFpsHandler = inputHandler(inputGifFps, value => {
	gifDelay = Number(value) / 100;
});

const inputOutlineSizeHandler = inputHandler(inputOutlineSize, () => {
	pcv.outlineSize = inputOutlineSize.valueAsNumber;
});

const inputOutlineColorHandler = inputHandler(inputOutlineColor, (value) => {
	pcv.outlineColor = hexToRGB(value);
});

const inputWatermarkHandler = inputHandler(inputWatermark, (value) => {
	pcv.setWatermark(value);
});

btnRecordGIF.onclick = () => {
	toggleGifRecording();
};


// Render loop

pcv.startDrawLoop((dt) => {
	// Camera controls
	const lookSpeed = 1.2 * dt;

	let inputLR = 0;
	let inputFB = 0;
	let inputUD = 0;
	let inputCameraLR = 0;
	let inputCameraUD = 0;
	if (keys["w"]) inputFB += 1;
	if (keys["s"]) inputFB -= 1;
	if (keys["a"]) inputLR -= 1;
	if (keys["d"]) inputLR += 1;
	if (keys["q"] || keys["shift"] || keys["control"]) inputUD -= 1;
	if (keys["e"] || keys[" "]) inputUD += 1;
	if (keys["arrowleft"]) inputCameraLR -= 1;
	if (keys["arrowright"]) inputCameraLR += 1;
	if (keys["arrowup"]) inputCameraUD -= 1;
	if (keys["arrowdown"]) inputCameraUD += 1;

	if (cameraMode === 0) {
		// turntable
		cameraRoll += (inputFB + inputCameraUD) * lookSpeed;
		cameraTurntableCenter.y += inputUD * 3 * dt;

		if (cameraTurntableAuto) {
			cameraTurntableSpeed -= (inputLR + inputCameraLR) * 2 * dt;
			cameraTurntableSpeed = clamp(-2, 2, cameraTurntableSpeed);

			cameraSpin += cameraTurntableSpeed * dt;
		} else {
			cameraSpin += (inputLR + inputCameraLR) * lookSpeed;
		}

		pcv.setTurntableCamera(cameraRadius, cameraSpin, cameraRoll, cameraTurntableCenter);
	} else if (cameraMode === 1) {
		// fps
		cameraSpin += inputCameraLR * lookSpeed;
		cameraRoll += inputCameraUD * lookSpeed;
		cameraRoll = clamp(-Math.PI / 2, Math.PI / 2, cameraRoll);
		
		pcv.cameraRotation.x = cameraRoll;
		pcv.cameraRotation.y = cameraSpin;

		if (inputLR !== 0 || inputUD !== 0 || inputFB !== 0) {
			const speed = 6 * dt;

			const right = pcv.getCameraRight();
			const up = pcv.getCameraUp();
			const forward = pcv.getCameraForward();

			const pos = pcv.cameraPosition;
			pos.x += (right.x * inputLR + forward.x * inputFB + up.x * inputUD) * speed;
			pos.y += (right.y * inputLR + forward.y * inputFB + up.y * inputUD) * speed;
			pos.z += (right.z * inputLR + forward.z * inputFB + up.z * inputUD) * speed;
		}
	}

	pcv.setLightDirectionFromCamera();
}, (dt) => {
	if (gifRecording) {
		const prev = gifTime;
		gifTime += dt;

		if (gifTime >= GIF_MAX_LEN || (inputAutoTurn && Math.abs(gifInitialSpin - cameraSpin) >= Math.PI * 2)) {
			stopRecordingGif();
		} else if (prev === 0 || Math.floor(prev / gifDelay) !== Math.floor(gifTime / gifDelay)) {
			putGifFrame();
		}
	}
});


// Handle file dropping.

window.addEventListener("dragover", (event) => {
	event.preventDefault();
});

let dragDepthCount = 0;

window.addEventListener("dragenter", (event) => {
	if (dragDepthCount === 0) {
		if (event.dataTransfer.types.includes("Files")) {
			document.body.classList.add("drag");
		}
	}

	dragDepthCount++;
});


window.addEventListener("dragleave", (event) => {
	dragDepthCount--;

	if (dragDepthCount === 0) {
		dragEnd();
	}
});


function dragEnd() {
	document.body.classList.remove("drag");
}

window.addEventListener("drop", (event) => {
	event.preventDefault();

	dragDepthCount = 0;

	dragEnd();

	const file = event.dataTransfer.files[0];
	if (file != null) {
		handleFile(file);
	}
});

// Handling pasting.
document.body.addEventListener("paste", (event) => {
	const s = event.clipboardData.getData("text/plain");
	if (s != null && s.length > 0) {
		loadModel(s);
	} else {
		const file = event.clipboardData.files[0];
		if (file != null) {
			handleFile(file);
		}
	}
});

// File handler
/**
 * @param {File} file 
 */
function handleFile(file) {
	const i = file.name.lastIndexOf(".");
	const ext = i < 0 ? "" : file.name.slice(i + 1).toLowerCase();
	if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "bmp" || ext === "gif") {
		loadImage(file);
	} else {
		loadModel(file);
	}
}

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} x 
 */
function clamp(a, b, x) {
	return x < a ? a : (x > b ? b : x);
}

/**
 * @param {string|HTMLElement} tag 
 * @param {*} attributes 
 * @param  {...any} nodes 
 */
function h(tag, attributes, ...nodes) {
	tag = tag instanceof HTMLElement ? tag : document.createElement(tag);
	if (attributes != null) {
		for (const k in attributes) {
			tag.setAttribute(k, attributes[k]);
		}
	}
	tag.append(...nodes);
	return tag;
}

/**
 * @param {HTMLSelectElement|HTMLInputElement} input 
 * @param {(value: string, init: boolean) => void} onchange
 * @returns {(value: any) => void} Call to change value
 */
function inputHandler(input, onchange) {
	function listener() {
		onchange(input.value, false);
	}

	input[input instanceof HTMLSelectElement ? "onchange" : "oninput"] = listener;

	onchange(input.value, true);

	if (input instanceof HTMLInputElement) {
		return (value) => {
			if (input.disabled) return;
			if (typeof value === "boolean") {
				input.checked = value;
			} else {
				input.value = value;
			}
			listener();
		};
	} else {
		return (value) => {
			if (input.disabled) return;
			input.value = value;
			listener();
		};
	}
}

/**
 * @param {string} s
 * @returns {number[]}
 */
function hexToRGB(s) {
	return [
		s.slice(1, 3),
		s.slice(3, 5),
		s.slice(5, 7),
	].map(s => parseInt(s, 16) / 255);;
}

// Load starting model.

if (!loadModelFromURL()) {
	loadExample(false);
}

function loadModelFromURL() {
	if (location.hash.length > 1) {
		loadModel(urlDecompressModel(location.hash.slice(1)), false);
		return true;
	}
}

onhashchange = (event) => {
	loadModelFromURL();
};

window["loadModel"] = loadModel;
