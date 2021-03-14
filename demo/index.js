import PicoCADViewer from "./pico-cad-viewer.js";

// Get elements
const texCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("texture"));
const viewportCanvas = /** @type {HTMLCanvasElement} */(document.getElementById("viewport"));
const inputResolution = /** @type {HTMLSelectElement} */(document.getElementById("input-resolution"));
const inputCameraMode = /** @type {HTMLSelectElement} */(document.getElementById("input-camera-mode"));
const inputFOV = /** @type {HTMLInputElement} */(document.getElementById("input-fov"));
const statColorCount = document.getElementById("stat-color-count");
const statFaceCount = document.getElementById("stat-face-count");
const statTriangleCount = document.getElementById("stat-triangle-count");

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
let cameraMode = 0;


// Extra model loading steps + stats

const texCanvasCtx = texCanvas.getContext("2d");

function loadedModel() {
	cameraRadius = pcv.model.zoomLevel;
	
	texCanvasCtx.putImageData(pcv.model.texture, 0, 0);

	statColorCount.textContent = `Colors: ${pcv.getTextureColorCount()}`;
	statTriangleCount.textContent = `Triangles: ${pcv.getTriangleCount()}`;
	statFaceCount.textContent = `Faces: ${pcv.model.faceCount}`;
}


// Input

const keys = Object.create(null);

window.onkeydown = event => {
	if (!event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		keys[event.key.toLowerCase()] = true;
	}
};
window.onkeyup = event => {
	if (!event.ctrlKey && !event.metaKey) {
		event.preventDefault();
		keys[event.key.toLowerCase()] = false;
	}
};

viewportCanvas.onclick = () => {
	viewportCanvas.requestPointerLock();
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

	if (cameraMode === 0) {
		cameraRadius = clamp(0, 200, cameraRadius + event.deltaY * (event.shiftKey ? 0.4 : 0.2));
	} else if (cameraMode === 1) {
		inputFOV.valueAsNumber += event.deltaY;
		inputFOVUpdate();
	}
};

const inputCameraModeUpdate = () => {
	cameraMode = Number(inputCameraMode.value);
	inputCameraMode.nextElementSibling.textContent = [
		"Arrows to adjust speed and angle. Mousewheel to zoom.",
		"WASD, shift, space, arrows. Click viewport to use mouse aim.",
	][cameraMode];
};
inputCameraMode.onchange = inputCameraModeUpdate;
inputCameraModeUpdate();

const inputResolutionUpdate = () => {
	const [w, h, scale] = inputResolution.value.split(",").map(s => Number(s));

	viewportCanvas.width = w;
	viewportCanvas.height = h;
	viewportCanvas.style.maxWidth = `${w * scale}px`;
};
inputResolution.onchange = inputResolutionUpdate;
inputResolutionUpdate();

const inputFOVUpdate = () => {
	pcv.cameraFOV = inputFOV.valueAsNumber;
	inputFOV.nextElementSibling.textContent = inputFOV.value;
};
inputFOV.oninput = inputFOVUpdate;
inputFOVUpdate();

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
		cameraTurntableSpeed -= inputCameraLR * 2 * dt;
		cameraTurntableSpeed = clamp(-2, 2, cameraTurntableSpeed);
		cameraRoll += inputCameraUD * lookSpeed;

		cameraSpin += cameraTurntableSpeed * dt;

		pcv.setTurntableCamera(cameraRadius, 1.5, cameraSpin, cameraRoll);
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
			pos.x += (right.x * inputLR + forward.x * inputFB) * speed;
			pos.y += (right.y * inputLR + forward.y * inputFB - inputUD) * speed;
			pos.z += (right.z * inputLR + forward.z * inputFB) * speed;
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
