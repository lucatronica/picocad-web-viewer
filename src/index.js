import * as mat4 from "../node_modules/gl-matrix/esm/mat4";
import * as vec3 from "../node_modules/gl-matrix/esm/vec3";
import { prepareModelForRendering } from "./model-gl-loader";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";
import { ShaderProgram } from "./shader-program";
import { createColorLightMap, createTextureLightMap } from "./lighting";
import { isSafari } from "./environment";
import { PicoCADModel } from "./model";
import { parsePicoCADModel } from "./model-parser";

export default class PicoCADViewer {
	/**
	 * @param {object} [options]
	 * @param {HTMLCanvasElement} [options.canvas] The canvas to render to. If not provided one will be created.
	 * @param {number} [options.fov] The camera FOV (degrees). Defaults to 90;
	 * @param {boolean} [options.drawWireframe] If the wireframe should be drawn. Defaults to false.
	 * @param {number[]} [options.wireframeColor] The wireframe color as [R, G, B] (each component [0, 1]). Defaults to white.
	 * @param {number[]} [options.wireframeXray] If the wireframe should be drawn "through" the model. Defaults to true.
	 * @param {number} [options.tesselationCount] Quads can be tessellated to reduce the effect of UV distortion. Pass 1 or less to do no tessellation. Defaults to 3.
	 * @param {boolean} [options.shading] If all faces should be draw without lighting. Defaults to true.
	 * @param {PicoCADRenderMode} [options.renderMode] The style draw the model. Defaults to "texture".
	 * @param {{x: number, y: number, z: number}} [options.lightDirection] Defaults to {x: 1, y: -1, z: 0}.
	 * @param {{width: number, height: number, scale?: number}} [options.resolution] Defaults to {width: 128, height: 128, scale: 1}.
	 */
	constructor(options={}) {
		this.canvas = options.canvas;
		if (this.canvas == null) {
			this.canvas = document.createElement("canvas");
		}

		/** The webGL rendering context. */
		const gl = this.gl = this.canvas.getContext("webgl", {
			antialias: false,
		});
		
		/** Camera position in scene. */
		this.cameraPosition = {
			x: 0,
			y: 0,
			z: 0,
		};

		/** Camera rotation as Euler angles (radians). */
		this.cameraRotation = {
			x: 0,
			y: 0,
			z: 0,
		};

		/** The camera field-of-view in degrees. */
		this.cameraFOV = options.fov ?? 90;

		/** If a model has been loaded. */
		this.loaded = false;
		/** The current loaded model. @type {PicoCADModel} */
		this.model = null;
		/** The current loaded texture as an image. See `viewer.model.texture` for the raw indices. @type {ImageData} */
		this.modelTexture = null;

		/** If the model should be drawn with lighting. */
		this.shading = options.shading ?? true;
		/** The style draw the model. */
		this.renderMode = options.renderMode ?? "texture";
		/** If the wireframe should be drawn. */
		this.drawWireframe = options.drawWireframe ?? false;
		/** If the wireframe should be drawn "through" the model. */
		this.wireframeXray = options.wireframeXray ?? true;
		/** The wireframe color as [R, G, B] (each component [0, 1]). */
		this.wireframeColor = options.wireframeColor ?? [1, 1, 1];
		/** Quads can be tessellated to reduce the effect of UV distortion. Pass 0 to do no tessellation. */
		this.tesselationCount = options.tesselationCount ?? 3;
		/** The lighting direction. Does not have to be normalized. */
		this.lightDirection = options.lightDirection ?? {x: 1, y: -1, z: 0};

		/** @private @type {Pass[]} */
		this._passes = [];
		/** @private @type {WebGLTexture} */
		this._mainTex = null;
		/** @private @type {WebGLTexture} */
		this._indexTex = null;
		/** @private */
		this._lightMapTex = this._createTexture(null, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, createTextureLightMap());
		/** @private */
		this._colorLightMapTex = this._createTexture(null, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, createColorLightMap());
		/** @private */
		this._programTexture = createTextureProgram(gl);
		/** @private */
		this._programUnlitTexture = createUnlitTextureProgram(gl);
		/** @private @type {WirePass} */
		this._wireframe = null;
		/** @private */
		this._programWireframe = createWireframeProgram(gl);

		// Handle pixel scaling.
		if (isSafari) {
			// Safari does not support `image-rendering: pixelated` on a WebGL canvas.
			// Need to render to a texture, then draw that scaled up texture to the screen.
			/** @private */
			this._programFramebuffer = createFramebufferProgram(gl);

			/** @private */
			this._depthBuffer = gl.createRenderbuffer();

			/** @private */
			this._frameBuffer = gl.createFramebuffer();

			/** @private */
			this._screenQuads = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._screenQuads);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				-1, -1,
				+1, -1,
				-1, +1,
				-1, +1,
				+1, -1,
				+1, +1,
			]), gl.STATIC_DRAW);
		} else {
			const className = "pico-cad-viewport"

			this.canvas.classList.add(className);

			/** @private */
			this._style = document.createElement("style");
			this._style.textContent = `.${className} { image-rendering: -moz-crisp-edges; image-rendering: pixelated; }`;
			document.head.append(this._style);
		}

		// Set resolution. Internally this will also setup Safari framebuffers.
		const res = options.resolution;
		if (res == null) {
			this.setResolution(128, 128, 1);
		} else {
			this.setResolution(res.width, res.height, res.scale ?? 1);
		}

		// Init GL.
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * Set the size and scale of the viewport.
	 * @param {number} width 
	 * @param {number} height 
	 * @param {number} [scale] The level of scaling, e.g. '3' means three times as big as the native resolution.
	 */
	setResolution(width, height, scale=1) {
		if (this._resolution != null && this._resolution[0] === width && this._resolution[1] === height && this._resolution[2] === scale) return;

		/** @private */;
		this._resolution = [width, height, scale, 0, 0];

		const widthScreen = width * scale;
		const heightScreen = height * scale;

		const gl = this.gl;
		const canvas = this.canvas;

		if (isSafari) {
			canvas.width = widthScreen;
			canvas.height = heightScreen;

			// Update framebuffer resolution.
			/** @private */
			this._frameBufferTex = this._createTexture(this._frameBufferTex, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, null, width, height);

			gl.bindRenderbuffer(gl.RENDERBUFFER, this._depthBuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				this._frameBufferTex,
				0,
			);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._depthBuffer);
		} else {
			canvas.width = width;
			canvas.height = height;
		}

		canvas.style.width = `${widthScreen}px`;
		canvas.style.height = `${heightScreen}px`;
	}

	getResolution() {
		return {
			width: this._resolution[0],
			height: this._resolution[1],
			scale: this._resolution[2],
		};
	}

	/**
	 * Creates a nearest neighbor texture with the given formats.
	 * @private
	 * @param {WebGLTexture} tex 
	 * @param {number} internalFormat 
	 * @param {number} format 
	 * @param {number} type 
	 * @param {TexImageSource|ArrayBufferView} source
	 * @param {number} [width]
	 * @param {number} [height]
	 */
	_createTexture(tex, internalFormat, format, type, source, width, height) {
		const gl = this.gl;

		if (tex == null) {
			tex = gl.createTexture();
		}

		gl.bindTexture(gl.TEXTURE_2D, tex);

		if (width == null) {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				internalFormat,
				format,
				type,
				/** @type {TexImageSource} */(source)
			);
		} else {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				internalFormat,
				width,
				height,
				0,
				format,
				type,
				/** @type {ArrayBufferView} */(source)
			);
		}
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		return tex;
	}

	/**
	 * Load a picoCAD model.
	 * @param {PicoCADSource} model The string can be a file's contents or a URL to a file.
	 * @returns {Promise<PicoCADModel>}
	 */
	async load(model) {
		if (typeof model === "string") {
			if (model.startsWith("picocad;")) {
				this._loadString(model);
			} else {
				await this._loadUrl(model);
			}
		} else if (model instanceof URL) {
			await this._loadUrl(model);
		} else if (model instanceof Blob) {
			await this._loadBlob(model);
		} else if (model instanceof PicoCADModel) {
			this._loadModel(model);
		} else {
			throw TypeError();
		}

		return this.model;
	}

	/**
	 * @private
	 * @param {string | URL} url 
	 */
	async _loadUrl(url) {
		const response = await fetch(String(url));

		if (response.ok) {
			this._loadString(await response.text());
		} else {
			throw Error(`${response.status}: ${response.statusText}`);
		}
	}
	
	/**
	 * @private
	 * @param {Blob} blob 
	 */
	_loadBlob(blob) {
		return new Promise((resolve, reject) => {
			if (!blob.type.startsWith("text")) {
				throw Error("picoCAD file must be a text file");
			}
	
			const fr = new FileReader();
			fr.onload = () => {
				resolve(this._loadString(/** @type {string} */(fr.result)));
			};
			fr.onerror = () => {
				reject(fr.error);
			};
			fr.readAsText(blob);
		});
	}

	/**
	 * @private
	 * @param {string} source
	 */
	_loadString(source) {
		this._loadModel(parsePicoCADModel(source));
	}

	/**
	 * @private
	 * @param {PicoCADModel} model
	 */
	_loadModel(model) {
		const gl = this.gl;

		this.loaded = false;
		this.model = null;

		// Free old model resources.
		if (this.loaded) {
			for (const pass of this._passes) {
				pass.free();
			}
			this._passes = [];

			this._wireframe.free();

			gl.deleteTexture(this._mainTex);
			this._mainTex = null;

			gl.deleteTexture(this._indexTex);
			this._indexTex = null;
		}

		// Prepare model for WebGL rendering.
		const rendering = prepareModelForRendering(gl, model, this.tesselationCount);

		this._passes = rendering.passes;
		this._wireframe = rendering.wireframe;
		this._mainTex = this._createTexture(this._mainTex, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rendering.texture);
		this._indexTex = this._createTexture(this._indexTex, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(rendering.textureIndices), 128, 128);
		this.modelTexture = rendering.texture;

		this.loaded = true;
		this.model = model;
	}

	/**
	 * Draw the scene once.
	 */
	draw() {
		const doDrawModel = this.renderMode !== "none";
		const forceColor = this.renderMode === "color";

		if (!this.loaded || (!doDrawModel && !this.drawWireframe)) {
			return;
		}

		const gl = this.gl;
		const canvas = this.canvas;

		// Set viewport and framebuffer.
		if (isSafari) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);

			gl.viewport(0, 0, this._resolution[0], this._resolution[1]);
		} else {
			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		// Clear screen.
		const bgColor = this.model.backgroundColor();

		gl.clearColor(bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 1);
		gl.clearDepth(1.0); 
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Setup camera
		const mat = mat4.create();
		mat4.perspective(
			mat,
			this.cameraFOV * Math.PI / 180,
			this._resolution[0] / this._resolution[1],
			0.1,
			400,
		);
		mat4.rotateX(mat, mat, this.cameraRotation.x);
		mat4.rotateY(mat, mat, this.cameraRotation.y);
		mat4.rotateZ(mat, mat, this.cameraRotation.z);
		mat4.translate(mat, mat, [ this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z ]);

		// Setup lighting
		const lightVector = normalized(this.lightDirection);

		// Draw model
		if (doDrawModel) {
			// Render each pass
			for (const pass of this._passes) {
				if (pass.clearDepth) {
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}

				if (pass.isEmpty()) {
					continue;
				}

				const useColor = forceColor || !pass.texture;
				const programInfo = (this.shading && pass.shading) ? this._programTexture : this._programUnlitTexture;

				programInfo.program.use();

				// Uniforms
				gl.uniformMatrix4fv(
					programInfo.locations.mvp,
					false,
					mat,
				);

				// Vertex and UV attrib
				gl.bindBuffer(gl.ARRAY_BUFFER, pass.vertexBuffer);
				gl.vertexAttribPointer(
					programInfo.program.vertexLocation,
					3,
					gl.FLOAT,
					false,
					0,
					0,
				);
				gl.enableVertexAttribArray(programInfo.program.vertexLocation);

				gl.bindBuffer(gl.ARRAY_BUFFER, useColor ? pass.colorUVBuffer : pass.uvBuffer);
				gl.vertexAttribPointer(
					programInfo.locations.uv,
					2,
					gl.FLOAT,
					false,
					0,
					0,
				);
				gl.enableVertexAttribArray(programInfo.locations.uv);

				// Shader specific data
				if (programInfo === this._programUnlitTexture) {
					// Main texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
					gl.uniform1i(programInfo.locations.mainTex, 0);
				} else if (programInfo === this._programTexture) {
					// Index texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._indexTex);
					gl.uniform1i(programInfo.locations.indexTex, 0);

					// Light-map texture
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, useColor ? this._colorLightMapTex : this._lightMapTex);
					gl.uniform1i(programInfo.locations.lightMap, 1);

					// Light map curve
					gl.uniform1f(programInfo.locations.lightMapOffset, useColor ? -0.316326530612245 : -0.3571428571428572);
					gl.uniform1f(programInfo.locations.lightMapGradient, useColor ? 1.63265306122449 : 2.857142857142857);

					// Light direction
					gl.uniform3f(programInfo.locations.lightDir, lightVector.x, lightVector.y, lightVector.z);

					// Normal attrib
					gl.bindBuffer(gl.ARRAY_BUFFER, pass.normalBuffer);
					gl.vertexAttribPointer(
						programInfo.locations.normal,
						3,
						gl.FLOAT,
						false,
						0,
						0,
					);
					gl.enableVertexAttribArray(programInfo.locations.normal);
				}

				// Configure culling
				if (pass.cull) {
					gl.enable(gl.CULL_FACE);
				} else {
					gl.disable(gl.CULL_FACE);
				}

				// Draw!
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pass.triangleBuffer);

				gl.drawElements(gl.TRIANGLES, pass.vertexCount, gl.UNSIGNED_SHORT, 0);

				// Clean up attributes
				gl.disableVertexAttribArray(programInfo.program.vertexLocation);
				gl.disableVertexAttribArray(programInfo.locations.uv);
				
				if (programInfo === this._programTexture) {
					gl.disableVertexAttribArray(programInfo.locations.normal);
				}
			}
		}

		// Draw wireframe
		if (this.drawWireframe) {
			if (doDrawModel && this.wireframeXray) {
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}

			this._programWireframe.program.use();

			// Uniforms
			gl.uniformMatrix4fv(
				this._programWireframe.locations.mvp,
				false,
				mat,
			);

			gl.uniform4fv(
				this._programWireframe.locations.color,
				[
					this.wireframeColor[0],
					this.wireframeColor[1],
					this.wireframeColor[2],
					1
				],
			);

			// Bind vertex data
			gl.bindBuffer(gl.ARRAY_BUFFER, this._wireframe.vertexBuffer);
			gl.vertexAttribPointer(
				this._programWireframe.program.vertexLocation,
				3,
				gl.FLOAT,
				false,
				0,
				0,
			);
			gl.enableVertexAttribArray(this._programWireframe.program.vertexLocation);

			gl.drawArrays(gl.LINES, 0, this._wireframe.vertexCount);
		}

		// Render framebuffer to canvas.
		if (isSafari) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			gl.viewport(0, 0, canvas.width, canvas.height);

			this._programFramebuffer.program.use();

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this._frameBufferTex);
			gl.uniform1i(this._programFramebuffer.locations.mainTex, 0);

			gl.bindBuffer(gl.ARRAY_BUFFER, this._screenQuads);
			gl.vertexAttribPointer(
				this._programFramebuffer.program.vertexLocation,
				2,
				gl.FLOAT,
				false,
				0,
				0,
			);
			gl.enableVertexAttribArray(this._programFramebuffer.program.vertexLocation);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		// // Check if any errors occurred.
		// const error = gl.getError();
		// if (error !== 0) {
		// 	throw Error(
		// 		({
		// 			[gl.INVALID_ENUM]: "Invalid enum",
		// 			[gl.INVALID_VALUE]: "Invalid value",
		// 			[gl.INVALID_OPERATION]: "Invalid operation",
		// 			[gl.INVALID_FRAMEBUFFER_OPERATION]: "Invalid framebuffer operation",
		// 			[gl.OUT_OF_MEMORY]: "Out of memory",
		// 			[gl.CONTEXT_LOST_WEBGL]: "Lost context",
		// 		})[error] ?? "Unknown WebGL Error"
		// 	);
		// }
	}

	/**
	 * @param {(dt: number) => void} [callback] Called before the start of every draw. `dt` is the seconds since last draw.
	 */
	startDrawLoop(callback) {
		let then = performance.now();
		const loop = () => {
			if (callback != null) {
				const now = performance.now();
				const dt = (now - then) / 1000;
				callback(dt);
				then = now;
			}

			this.draw();

			/** @private */
			this._rafID = requestAnimationFrame(loop);
		};
		loop();
	}

	stopDrawLoop() {
		if (this._rafID != null) {
			cancelAnimationFrame(this._rafID);
		}
	}

	getCameraRight() {
		return this._transformDirection(1, 0, 0);
	}
	getCameraUp() {
		return this._transformDirection(0, -1, 0);
	}
	getCameraForward() {
		return this._transformDirection(0, 0, -1);
	}

	/**
	 * Set the light direction from the camera, matching native picoCAD's shading.
	 */
	setLightDirectionFromCamera() {
		const du = 0.4;
		const up = this.getCameraUp();
		const forward = this.getCameraForward();

		this.lightDirection = {
			x: forward.x - up.x * du,
			y: forward.y - up.y * du,
			z: forward.z - up.z * du,
		};
	}

	/**
	 * The number of colors used in the texture.
	 * (There may more used by face colors.)
	 */
	getTextureColorCount(includeAlpha=false) {
		/** @type {boolean[]} */
		const flags = Array(16).fill(false);
		let count = 0;

		for (const index of this.model.texture) {
			if (!flags[index]) {
				flags[index] = true;
				count++;
			}
		}

		return count;
	}

	getTriangleCount() {
		let count = 0;
		for (const pass of this._passes) {
			count += Math.floor(pass.vertexCount / 3);
		}
		return count;
	}

	getDrawCallCount() {
		let count = 0;
		for (const pass of this._passes) {
			if (!pass.isEmpty()) count++;
		}
		if (this.drawWireframe) count++;
		if (isSafari) count++;
		return count;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {{x: number, y: number, z: number}}
	 * @private
	 */
	_transformDirection(x, y, z) {
		const vec = vec3.create();
		vec3.set(vec, x, y, z);

		const zero = vec3.zero(vec3.create());

		vec3.rotateX(vec, vec, zero, Math.PI + this.cameraRotation.x);
		vec3.rotateY(vec, vec, zero, this.cameraRotation.y);
		vec3.rotateZ(vec, vec, zero, Math.PI + this.cameraRotation.z);

		return {
			x: vec[0],
			y: vec[1],
			z: vec[2],
		};
	}

	/**
	 * Set the camera rotation and position to look at the model a certain radius from the center.
	 * @param {number} radius 
	 * @param {number} spin The horizontal position (radians).
	 * @param {number} roll The vertical position (radians).
	 * @param {{x: number, y: number, z: number}} [center] Defaults to {x: 0, y: 1.5, z: 0}
	 */
	setTurntableCamera(radius, spin, roll, center={ x: 0, y: 1.5, z: 0}) {
		const a = Math.PI - spin;
		roll = -roll;

		this.cameraPosition = {
			x: radius * Math.cos(roll) * Math.sin(a) - center.x,
			y: radius * Math.sin(roll) - center.y,
			z: radius * Math.cos(roll) * Math.cos(a) - center.z,
		};
		this.cameraRotation = {
			y: spin,
			x: -roll,
			z: 0,
		};
	}

	/**
	 * Frees resources used by this viewer.
	 */
	free() {
		const gl = this.gl;
		
		this.stopDrawLoop();

		for (const pass of this._passes) {
			pass.free();
		}
		this._passes = [];

		gl.deleteTexture(this._lightMapTex);
		gl.deleteTexture(this._colorLightMapTex);
		gl.deleteTexture(this._mainTex);
		gl.deleteTexture(this._indexTex);
		this._lightMapTex = null;
		this._colorLightMapTex = null;
		this._mainTex = null;
		this._indexTex = null;

		this._programTexture.program.free();
		this._programWireframe.program.free();
		this._programTexture = null;
		this._programWireframe = null;

		if (isSafari) {
			gl.deleteFramebuffer(this._frameBuffer);
			gl.deleteTexture(this._frameBufferTex);
			gl.deleteBuffer(this._screenQuads);
			gl.deleteRenderbuffer(this._depthBuffer);
			this._programFramebuffer.program.free();
			this._frameBuffer = null;
			this._frameBufferTex = null;
			this._screenQuads = null;
			this._depthBuffer = null;
			this._programFramebuffer = null;
		}
	}
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec3 normal;
		attribute vec2 uv;

		varying highp vec2 v_uv;
		varying highp vec3 v_normal;

		uniform mat4 mvp;

		void main() {
			v_normal = normal;
			v_uv = uv;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 v_uv;
		varying highp vec3 v_normal;
		
		uniform sampler2D indexTex;
		uniform sampler2D lightMap;
		uniform highp vec3 lightDir;
		uniform highp float lightMapOffset;
		uniform highp float lightMapGradient;

		void main() {
			highp float index = texture2D(indexTex, v_uv).r;
			if (index == 1.0) discard;
			// highp float intensity = clamp(4.0 * abs(dot(v_normal, lightDir)) - 1.0, 0.0, 1.0);
			highp float intensity = clamp(lightMapGradient * abs(dot(v_normal, lightDir)) + lightMapOffset, 0.0, 1.0);
			gl_FragColor = texture2D(lightMap, vec2(index * 15.9375 + mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) * 0.03125, 1.0 - intensity));
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			normal: program.getAttribLocation("normal"),
			indexTex: program.getUniformLocation("indexTex"),
			lightMap: program.getUniformLocation("lightMap"),
			lightDir: program.getUniformLocation("lightDir"),
			mvp: program.getUniformLocation("mvp"),
			lightMapOffset: program.getUniformLocation("lightMapOffset"),
			lightMapGradient: program.getUniformLocation("lightMapGradient"),
		}
	};
}


/**
 * @param {WebGLRenderingContext} gl 
 */
 function createUnlitTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec2 uv;

		varying highp vec2 v_uv;

		uniform mat4 mvp;

		void main() {
			v_uv = uv;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 v_uv;
		
		uniform sampler2D mainTex;

		void main() {
			lowp vec4 color = texture2D(mainTex, v_uv);
			if (color.a == 0.0) discard;
			gl_FragColor = color;
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			mvp: program.getUniformLocation("mvp"),
			mainTex: program.getUniformLocation("mainTex"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createWireframeProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;

		uniform mat4 mvp;

		void main() {
			gl_Position = mvp * vertex;
		}
	`, `
		uniform lowp vec4 color;

		void main() {
			gl_FragColor = color;
		}
	`);
	
	return {
		program: program,
		locations: {
			mvp: program.getUniformLocation("mvp"),
			color: program.getUniformLocation("color"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createFramebufferProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;

		varying highp vec2 v_uv;

		void main() {
			v_uv = 0.5 + vertex.xy * 0.5;
			gl_Position = vertex;
		}
	`, `
		varying highp vec2 v_uv;
		
		uniform sampler2D mainTex;

		void main() {
			gl_FragColor = texture2D(mainTex, v_uv);
		}
	`);
	
	return {
		program: program,
		locations: {
			mainTex: program.getUniformLocation("mainTex"),
		}
	};
}

/**
 * @param {{x: number, y: number, z: number}} vec 
 */
function normalized(vec) {
	let len = Math.hypot(vec.x, vec.y, vec.z);
	if (len === 0) len = 1;
	return {
		x: vec.x / len,
		y: vec.y / len,
		z: vec.z / len,
	};
}

/** @typedef {string | URL | Blob | PicoCADModel} PicoCADSource */
/** @typedef {"texture" | "color" | "none"} PicoCADRenderMode */
