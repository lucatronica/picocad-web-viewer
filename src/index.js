import * as mat4 from "../node_modules/gl-matrix/esm/mat4";
import * as vec3 from "../node_modules/gl-matrix/esm/vec3";
import { loadPicoCADModel } from "./loader";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";
import { ShaderProgram } from "./shader-program";

export class PicoCADViewer {
	/**
	 * @param {object} [options]
	 * @param {HTMLCanvasElement} [options.canvas] The canvas to render to. If not provided one will be created.
	 * @param {number} [options.fov] The camera FOV (degrees). Defaults to 90;
	 * @param {boolean} [options.drawModel] If the model should be drawn. Defaults to true.
	 * @param {boolean} [options.drawWireframe] If the wireframe should be drawn. Defaults to false.
	 * @param {number[]} [options.wireframeColor] The wireframe color as [R, G, B] (each component [0, 1]). Defaults to white.
	 * @param {number[]} [options.wireframeXray] If the wireframe should be drawn "through" the model. Defaults to true.
	 * @param {number} [options.tesselationCount] Quads can be tessellated to reduce the effect of UV distortion. Pass 1 or less to do no tessellation. Defaults to 3.
	 */
	constructor(options={}) {
		this.canvas = options.canvas;
		if (this.canvas == null) {
			this.canvas = document.createElement("canvas");
		}

		/** The webGL rendering context. */
		this.gl = this.canvas.getContext("webgl", {
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

		/** If a model has been loaded. @readonly */
		this.loaded = false;
		/** Information about the current model. @readonly @type {{name: string, backgroundIndex: number, zoomLevel: number, backgroundColor: number[], alphaIndex: number, alphaColor: number[], texture: ImageData, textureColorFlags: boolean[]}} */
		this.model = null;

		/** If the model should be drawn. */
		this.drawModel = options.drawModel ?? true;
		/** If the wireframe should be drawn. */
		this.drawWireframe = options.drawWireframe ?? false;
		/** If the wireframe should be drawn "through" the model. */
		this.wireframeXray = options.wireframeXray ?? true;
		/** The wireframe color as [R, G, B] (each component [0, 1]). */
		this.wireframeColor = options.wireframeColor ?? [1, 1, 1];
		/** Quads can be tessellated to reduce the effect of UV distortion. Pass 0 to do no tessellation. */
		this.tesselationCount = options.tesselationCount ?? 3;

		/** @private @type {Pass[]} */
		this._passes = [];
		/** @private @type {WebGLTexture} */
		this._mainTex = null;
		/** @private */
		this._programColor = createColorProgram(this.gl);
		/** @private */
		this._programTexture = createTextureProgram(this.gl);
		/** @private @type {WirePass} */
		this._wireframe = null;
		/** @private */
		this._programWireframe = createWireframeProgram(this.gl);

		// Init GL.
		const gl = this.gl;

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * Load a picoCAD model.
	 * @param {Blob|string|URL} model The string can be a file's contents or a URL to a file.
	 * @returns The model name.
	 */
	async load(model) {
		if (typeof model === "string") {
			if (model.startsWith("picocad;")) {
				this._loadString(model);
			} else if (model.startsWith("http:") || model.startsWith("https:")) {
				await this._loadUrl(model);
			} else {
				throw Error(`Invalid string/url: ${model.slice(0, 50)}`);
			}
		} else if (model instanceof URL) {
			await this._loadUrl(model);
		} else if (model instanceof Blob) {
			await this._loadBlob(model);
		} else {
			throw TypeError();
		}

		return this.model.name;
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
		const gl = this.gl;

		// Free old model resources.
		if (this.loaded) {
			for (const pass of this._passes) {
				pass.free();
			}
			this._passes = [];

			this._wireframe.free();

			gl.deleteTexture(this._mainTex);
			this._mainTex = null;
		}

		this.loaded = false;

		// Load the model.
		const model = loadPicoCADModel(this.gl, source, this.tesselationCount);

		this.model = {
			name: model.name,
			zoomLevel: model.zoomLevel,
			backgroundIndex: model.backgroundIndex,
			backgroundColor: PICO_COLORS[model.backgroundIndex],
			alphaIndex: model.alphaIndex,
			alphaColor: PICO_COLORS[model.alphaIndex],
			texture: model.texture,
			textureColorFlags: model.textureFlags,
			faceCount: model.faceCount,
			objectCount: model.objectCount,
		};
		this._passes = model.passes;
		this._wireframe = model.wireframe;

		// Upload GL texture.
		if (this._mainTex == null) {
			this._mainTex = gl.createTexture();
		}
		gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			model.texture
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Done :)
		this.loaded = true;
	}

	/**
	 * Draw the scene once.
	 */
	draw() {
		if (!this.loaded || (!this.drawModel && !this.drawWireframe)) {
			return;
		}

		const gl = this.gl;

		// Set viewport.
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// Clear screen.
		const bgColor = this.model.backgroundColor;

		gl.clearColor(bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 1);
		gl.clearDepth(1.0); 
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Setup camera
		const mat = mat4.create();
		mat4.perspective(
			mat,
			this.cameraFOV * Math.PI / 180,
			this.canvas.width / this.canvas.height,
			0.1,
			400,
		);
		mat4.rotateX(mat, mat, this.cameraRotation.x);
		mat4.rotateY(mat, mat, this.cameraRotation.y);
		mat4.rotateZ(mat, mat, this.cameraRotation.z);
		mat4.translate(mat, mat, [ this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z ]);

		// Draw model
		if (this.drawModel) {
			// Render each pass
			for (const pass of this._passes) {
				if (pass.clearDepth) {
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}

				if (pass.isEmpty()) {
					continue;
				}

				const programInfo = pass.useTexture ? this._programTexture : this._programColor;

				programInfo.program.use();

				// Uniforms
				gl.uniformMatrix4fv(
					programInfo.program.mvpLocation,
					false,
					mat,
				);
		
				if (programInfo === this._programTexture) {
					// Main texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._mainTex);
					gl.uniform1i(this._programTexture.locations.mainTex, 0);

					// UV attrib
					gl.bindBuffer(gl.ARRAY_BUFFER, pass.uvBuffer);
					gl.vertexAttribPointer(
						this._programTexture.locations.uv,
						2,
						gl.FLOAT,
						false,
						0,
						0,
					);
					gl.enableVertexAttribArray(this._programTexture.locations.uv);
				} else if (programInfo === this._programColor) {
					// Color attrib
					gl.bindBuffer(gl.ARRAY_BUFFER, pass.colorBuffer);
					gl.vertexAttribPointer(
						this._programColor.locations.color,
						4,
						gl.FLOAT,
						false,
						0,
						0,
					);
					gl.enableVertexAttribArray(this._programColor.locations.color);
				}

				// Bind vertex data
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

				if (programInfo === this._programTexture) {
					gl.disableVertexAttribArray(this._programTexture.locations.uv);
				} else if (programInfo === this._programColor) {
					gl.disableVertexAttribArray(this._programColor.locations.color);
				}
			}
		}

		// Draw wireframe
		if (this.drawWireframe) {
			if (this.drawModel && this.wireframeXray) {
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}

			this._programWireframe.program.use();

			// Uniforms
			gl.uniformMatrix4fv(
				this._programWireframe.program.mvpLocation,
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
		return this._transformDirection(0, 0, 1);
	}

	/**
	 * The number of colors used in the texture.
	 * (There may more used by face colors.)
	 */
	getTextureColorCount(includeAlpha=false) {
		let count = 0;
		for (let i = 0; i < 16; i++) {
			if ((includeAlpha || i !== this.model.alphaIndex) && this.model.textureColorFlags[i]) {
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
	 * Set the camera rotation and position to look at the model a certain radius from the ceter.
	 * @param {number} radius 
	 * @param {number} y The base y position
	 * @param {number} spin The horizontal position (radians).
	 * @param {number} roll The vertical position (radians).
	 */
	setTurntableCamera(radius, y, spin, roll) {
		const a = Math.PI - spin;
		roll = -roll;

		this.cameraPosition = {
			x: radius * Math.cos(roll) * Math.sin(a),
			y: radius * Math.sin(roll) - y,
			z: radius * Math.cos(roll) * Math.cos(a),
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

		gl.deleteTexture(this._mainTex);

		this._programColor.program.free();
		this._programTexture.program.free();
		this._programWireframe.program.free();
		this._programColor = null;
		this._programTexture = null;
		this._programWireframe = null;
	}
}
export default PicoCADViewer;

/**
 * @param {WebGLRenderingContext} gl 
 */
 function createTextureProgram(gl) {
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
			highp vec4 col = texture2D(mainTex, v_uv.xy);
			if (col.a == float(0)) discard;
			gl_FragColor = col;
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			mainTex: program.getUniformLocation("mainTex"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
function createColorProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec4 col;

		varying lowp vec4 fcol;

		uniform mat4 mvp;

		void main() {
			fcol = col;
			gl_Position = mvp * vertex;
		}
	`, `
		varying lowp vec4 fcol;

		void main() {
			gl_FragColor = fcol;
		}
	`);
	
	return {
		program: program,
		locations: {
			color: program.getAttribLocation("col"),
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
			color: program.getUniformLocation("color"),
		}
	};
}
