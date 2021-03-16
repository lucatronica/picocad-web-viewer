import PicoCADViewer from "./pico-cad-viewer.js";

// Get elements
const texCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("texture"));
const viewportCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("viewport"));
const inputResolution = /** @type {HTMLSelectElement} */(document.getElementById("input-resolution"));
const inputWireframe = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe"));
const inputWireframeColor = /** @type {HTMLInputElement} */(document.getElementById("input-wireframe-color"));
const inputStyle = /** @type {HTMLSelectElement} */(document.getElementById("input-style"));
const inputFOV = /** @type {HTMLInputElement} */(document.getElementById("input-fov"));
const statsTable = document.getElementById("stats");

// Create viewer
const pcv = new PicoCADViewer({
	canvas: viewportCanvas,
});
window["pcv"] = pcv;

// App/renderer state
let cameraSpin = -Math.PI / 2;
let cameraRoll = 0.2;
let cameraRadius = 12;
let cameraTurntableSpeed = 0.75;
let cameraTurntableY = 1.5;
let cameraMode = 0;


// Extra model loading steps + stats

const texCanvasCtx = texCanvas.getContext("2d");

function loadedModel() {
	cameraRadius = pcv.model.zoomLevel;
	
	viewportCanvas.classList.add("clickable");

	texCanvasCtx.putImageData(pcv.model.texture, 0, 0);

	while (statsTable.lastChild != null) statsTable.lastChild.remove();

	statsTable.append(h("li", {}, pcv.model.name));

	const stats = {
		"Colors": pcv.getTextureColorCount(),
		"Objects": pcv.model.objectCount,
		"Faces": pcv.model.faceCount,
		"Triangles": pcv.getTriangleCount(),
	};

	for (const [key, value] of Object.entries(stats)) {
		statsTable.append(h("li", {}, `${key}: ${value}`));
	}
}


// Input

const keys = Object.create(null);

window.onkeydown = event => {
	if (!event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		const key = event.key.toLowerCase();
		keys[key] = true;

		// down handlers
		if (key === "t") {
			inputWireFrameHandler(!pcv.drawWireframe);
		}
	}
};
window.onkeyup = event => {
	if (!event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		keys[event.key.toLowerCase()] = false;
	}
};

viewportCanvas.onclick = () => {
	if (pcv.loaded) {
		viewportCanvas.requestPointerLock();
	}
};

document.onpointerlockchange = (event) => {
	if (document.pointerLockElement === viewportCanvas) {
		cameraMode = 1;
	} else {
		cameraMode = 0;
	}
};

window.onmousemove = (event) => {
	if (document.pointerLockElement === viewportCanvas && cameraMode === 1) {
		const sensitivity = 0.003;

		cameraSpin += event.movementX * sensitivity;
		cameraRoll += event.movementY * sensitivity;
	}
};

viewportCanvas.onwheel = (event) => {
	event.preventDefault();

	if (cameraMode === 1 || (cameraMode === 0 && event.shiftKey)) {
		inputFOVUpdate(pcv.cameraFOV + event.deltaY);
	} else if (cameraMode === 0) {
		cameraRadius = clamp(0, 200, cameraRadius + event.deltaY * 0.2);
	}
};

inputHandler(inputResolution, value => {
	const [w, h, scale] = value.split(",").map(s => Number(s));

	viewportCanvas.width = w;
	viewportCanvas.height = h;
	viewportCanvas.style.maxWidth = `${w * scale}px`;
});

const inputFOVUpdate = inputHandler(inputFOV, () => {
	pcv.cameraFOV = inputFOV.valueAsNumber;
	inputFOV.nextElementSibling.textContent = inputFOV.value;
});

const inputWireFrameHandler = inputHandler(inputWireframe, () => {
	pcv.drawWireframe = inputWireframe.checked;
});

inputHandler(inputWireframeColor, (value) => {
	pcv.wireframeColor = [
		value.slice(1, 3),
		value.slice(3, 5),
		value.slice(5, 7),
	].map(s => parseInt(s, 16) / 255);
});

inputHandler(inputStyle, value => {
	if (value === "flat") {
		pcv.drawModel = true;
	} else if (value === "") {
		pcv.drawModel = false;
	}
});

// Render loop
pcv.startDrawLoop((dt) => {
	// Camera controls
	const lookSpeed = 1.2 * dt;

	let inputLR = 0;
	let inputFB = 0;
	let inputUD = 0;
	let inputCameraLR = 0;
	let inputCameraUD = 0;
	if (keys["w"]) inputFB -= 1;
	if (keys["s"]) inputFB += 1;
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
		cameraTurntableSpeed -= (inputLR + inputCameraLR) * 2 * dt;
		cameraTurntableSpeed = clamp(-2, 2, cameraTurntableSpeed);
		cameraRoll += (inputFB + inputCameraUD) * lookSpeed;
		cameraTurntableY += inputUD * 3 * dt;

		cameraSpin += cameraTurntableSpeed * dt;

		pcv.setTurntableCamera(cameraRadius, cameraTurntableY, cameraSpin, cameraRoll);
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
});


// Handle file dropping.
window.addEventListener("dragover", (event) => {
	event.preventDefault();
});

window.addEventListener("dragenter", (event) => {
	if (event.dataTransfer.types.includes("Files")) {
		document.body.classList.add("drag");
	}
});

window.addEventListener("dragexit", (event) => {
	dragEnd();
});

function dragEnd() {
	document.body.classList.remove("drag");
}

window.addEventListener("drop", (event) => {
	event.preventDefault();

	dragEnd();

	const file = event.dataTransfer.files[0];
	if (file != null) {
		pcv.load(file).then(loadedModel);
	}
});

// Handling pasting.
document.body.addEventListener("paste", (event) => {
	const s = event.clipboardData.getData("text/plain");
	if (s != null) {
		pcv.load(s).then(loadedModel);
	} else {
		const file = event.clipboardData.files[0];
		if (file != null) {
			pcv.load(file).then(loadedModel);
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
 * @param {(value: string) => void} onchange
 * @returns {(value: any) => void} Call to change value
 */
function inputHandler(input, onchange) {
	function listener() {
		onchange(input.value);
	}

	input[input instanceof HTMLSelectElement ? "onchange" : "oninput"] = listener;

	listener();

	if (input instanceof HTMLInputElement) {
		return (value) => {
			if (typeof value === "boolean") {
				input.checked = value;
			} else {
				input.value = value;
			}
			listener();
		};
	} else {
		return (value) => {
			input.value = value;
			listener();
		};
	}
}
