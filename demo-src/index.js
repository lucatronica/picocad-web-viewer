import PicoCADViewer from "../src/index";
import { PicoCADModel } from "../src/model";
import { urlCompressModel, urlDecompressModel } from "./model-compression";
import { GIFEncoder } from "./gifenc";
import { PICO_COLORS } from "../src/pico";

// Get elements
const texCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("texture"));
const viewportCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("viewport"));
const inputResolution = /** @type {HTMLSelectElement} */(document.getElementById("input-resolution"));
const inputAutoTurn = /** @type {HTMLInputElement} */(document.getElementById("input-auto-turn"));
const inputWireframe = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe"));
const inputWireframeColor = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe-color"));
const inputRenderMode = /** @type {HTMLSelectElement} */(document.getElementById("input-render-mode"));
const inputShading = /** @type {HTMLInputElement} */(document.getElementById("input-shading"));
const inputFOV = /** @type {HTMLInputElement} */(document.getElementById("input-fov"));
const btnShowControls = /** @type {HTMLButtonElement} */(document.getElementById("btn-show-controls"));
const inputGifFps = /** @type {HTMLInputElement} */(document.getElementById("input-gif-fps"));
const btnRecordGIF = /** @type {HTMLButtonElement} */(document.getElementById("btn-record-gif"));
const popupControls = document.getElementById("popup-controls")
const statsTable = document.getElementById("stats");

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
	texCanvasCtx.putImageData(pcv.modelTexture, 0, 0);

	// Show stats
	const faceCount = model.objects.reduce((acc, obj) => acc + obj.faces.length, 0);

	while (statsTable.lastChild != null) statsTable.lastChild.remove();

	statsTable.append(h("li", {}, pcv.model.name));

	const stats = {
		"Colors": pcv.getTextureColorCount(),
		"Objects": model.objects.length,
		"Faces": faceCount,
	};

	console.log(`${pcv.getTriangleCount()} triangles, ${pcv.getDrawCallCount()} draw calls`);

	for (const [key, value] of Object.entries(stats)) {
		statsTable.append(h("li", {}, `${key}: ${value}`));
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


// Extra model loading steps + stats

const texCanvasCtx = texCanvas.getContext("2d");


// Popups

document.querySelectorAll(".popup").forEach(popup => {
	popup.addEventListener("click", () => {
		popupControls.hidden = !popupControls.hidden;
	});
});


btnShowControls.onclick = () => {
	popupControls.hidden = !popupControls.hidden;
};

popupControls.querySelectorAll("kbd").forEach(kbd => {
	kbd.onclick = () => keyPressed(kbd.textContent.toLowerCase());
});


// GIF recording

/** @type {import("./gifenc").GIFPalette} */
const gifPalette = PICO_COLORS.slice();
const GIF_MAX_LEN = 30; // seconds
const gifRecorder = new GIFEncoder();

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

	// Render GIF
	const res = pcv.getResolution();
	console.log(gifFrames.length);

	for (let i = 0; i < gifFrames.length; i++) {
		gifRecorder.writeFrame(gifFrames[i], res.width * res.scale, res.height * res.scale, {
			palette: i === 0 ? gifPalette : null,
			delay: gifDelay * 1000,
		});
	}

	gifRecorder.finish();

	downloadGif();

	gifRecorder.reset();
	gifFrames = [];
}

function downloadGif() {
	const fileName = `${pcv.model.name}.gif`;

	const file = new File([ gifRecorder.bytesView() ], fileName, {
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

/** @type {Uint8Array[]} */
let gifFrames = [];

function putGifFrame() {
	const res = pcv.getResolution();
	const indices = pcv.getPixelIndices(res.scale);

	gifFrames.push(indices);
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
	}
}

const keys = Object.create(null);

window.onkeydown = event => {
	if (!event.ctrlKey && !event.metaKey) {
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
	pcv.wireframeColor = [
		value.slice(1, 3),
		value.slice(3, 5),
		value.slice(5, 7),
	].map(s => parseInt(s, 16) / 255);
});

const inputRenderModeHandler = inputHandler(inputRenderMode, value => {
	pcv.renderMode = /** @type {import("../src/index").PicoCADRenderMode} */(value);
});

const inputShadingHandler = inputHandler(inputShading, () => {
	pcv.shading = inputShading.checked;
});

const inputGifFpsHandler = inputHandler(inputGifFps, value => {
	gifDelay = Number(value) / 100;
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
		loadModel(file);
	}
});

// Handling pasting.
document.body.addEventListener("paste", (event) => {
	const s = event.clipboardData.getData("text/plain");
	if (s != null) {
		loadModel(s);
	} else {
		const file = event.clipboardData.files[0];
		if (file != null) {
			loadModel(file);
		}
	}
});

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} x 
 */
function clamp(a, b, x) {
	return x < a ? a : (x > b ? b : x);
}

/**
 * @param {string|Element} tag 
 * @param {*} attributes 
 * @param  {...any} nodes 
 */
function h(tag, attributes, ...nodes) {
	tag = tag instanceof Element ? tag : document.createElement(tag);
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
