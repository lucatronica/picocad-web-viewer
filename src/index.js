import * as mat4 from "../node_modules/gl-matrix/esm/mat4";
import * as vec3 from "../node_modules/gl-matrix/esm/vec3";
import { prepareModelForRendering } from "./model-gl-loader";
import { Pass, WirePass } from "./pass";
import { PICO_COLORS } from "./pico";
import { ShaderProgram } from "./shader-program";
import { createLightMap } from "./lighting";
import { PicoCADModel } from "./model";
import { parsePicoCADModel } from "./model-parser";
import { luma, rgb01to255, rgbToInt } from "./color";
import { lazyLoadedFontImage } from "./text.js";

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
	 * @param {boolean} [options.preserveDrawingBuffer] If the true, the browser will not clear the buffer after drawing as completed. This is needed for `getPixelIndices` to work asynchronously. May have performance impact. Defaults to false.
	 */
	constructor(options={}) {
		this.canvas = options.canvas;
		if (this.canvas == null) {
			this.canvas = document.createElement("canvas");
		}

		/** The webGL rendering context. */
		const gl = this.gl = this.canvas.getContext("webgl", {
			antialias: false,
			preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
		});

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
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

		/** If the model should be drawn with lighting. */
		this.shading = options.shading ?? true;
		/** The style draw the model. */
		this.renderMode = options.renderMode ?? "texture";
		/**
		 * A custom background color. As [R, G, B] or [R, G, B, A] (each component [0, 1]).
		 * @type {number[]}
		 */
		this.backgroundColor = null;
		/**
		 * The outline color. As [R, G, B] or [R, G, B, A] (each component [0, 1]).
		 * @type {number[]}
		 */
		this.outlineColor = [0, 0, 0, 1];
		/**
		 * The outline size in pixels.
		 * 
		 * An additional draw call is needed for each pixel increment.
		 * @type {number}
		 */
		this.outlineSize = 0;
		/**
		 * @type {string|null}
		 * @private
		 */
		this._watermarkText = null;
		/**
		 * @type {number[]}
		 * @private
		 */
		this._watermarkSize = null;
		/**
		 * @private
		 * @type {WebGLBuffer}
		 */
		this._watermarkBuffer = null;
		/**
		 * @private
		 */
		this._watermarkTriangleCount = 0;
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
		/** Set the options for the HD texture shader. */
		this.hdOptions = {
			shadingSteps: 4,
			shadingColor: [0.1, 0.1, 0.1],
		};

		/** @private @type {Pass[]} */
		this._passes = [];
		/** @private @type {WebGLTexture} */
		this._colorIndexTex = this._createTexture(null, this.gl.LUMINANCE, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, new Uint8Array([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]), 16, 1);
		/** @private @type {WebGLTexture} */
		this._indexTex = null;
		/** @private @type {WebGLTexture} */
		this._fontTex = null;
		this.resetLightMap();
		/** @private */
		this._programTexture = createTextureProgram(gl);
		/** @private */
		this._programUnlitTexture = createUnlitTextureProgram(gl);
		/** @private */
		this._programHDTexture = createHDTextureProgram(gl);
		/** @private @type {WirePass} */
		this._wireframe = null;
		/** @private */
		this._programWireframe = createWireframeProgram(gl);
		/** @private */
		this._programText = createTextProgram(gl);

		// We draw the scene to a framebuffer to support pixel scaling on all platforms, and to enable post-processing.
		// We use a second framebuffer + texture to enable multiple post-processing filters (ping-pong between the two).
		/** @private */
		this._programFramebuffer = createFramebufferProgram(gl);
		
		/** @private */
		this._programOutline = createOutlineProgram(gl);

		/** @private */
		this._depthBuffer = gl.createRenderbuffer();

		/** @private */
		this._frameBuffer = gl.createFramebuffer();
		
		/** @private */
		this._frameBuffer2 = gl.createFramebuffer();

		/**
		 * The last used framebuffer.
		 * @private
		 * @type {WebGLFramebuffer|null}
		 */
		this._framebufferCurrent = null;

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
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
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

		canvas.width = widthScreen;
		canvas.height = heightScreen;

		// Update framebuffer resolution.
		/** @private */
		this._frameBufferTex = this._createTexture(this._frameBufferTex, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, null, width, height);
		this._frameBufferTex2 = this._createTexture(this._frameBufferTex2, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, null, width, height);

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
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer2);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this._frameBufferTex2,
			0,
		);

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
	 * @deprecated Should call `this.getModelTexture()` instead to make performance side-effects explicit.
	 */
	get modelTexture() {
		return this.getModelTexture();
	}

	/**
	 * Get the current model's texture as pixels using the current palette.
	 */
	getModelTexture() {
		return this.model.textureAsImage(this._lightMapColors);
	}

	/**
	 * Set light-maps to default state (accurate picoCad emulation).
	 */
	resetLightMap() {
		if (this._lightMapTex != null) this.gl.deleteTexture(this._lightMapTex);

		/** @private */
		this._lightMapTex = this._createTexture(null, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, createLightMap());
		/** @type {number[][]} @private */
		this._lightMapColors = PICO_COLORS.slice();
	}

	/**
	 * The RGBA255 colors used in the current render.
	 * 
	 * The first 16 colors will always be the PICO-8 indices.
	 * For the default light-map this just returns the PICO-8 colors.
	 * 
	 * If a custom background is set, that will be included at the end of the array.
	 * 
	 * Note a custom light-map may contain additional colors not in the returned array, due to shading and dithering.
	 * @returns {number[][]}
	 */
	getPalette() {
		// Convert existing palette to RGBA
		let colors = this._lightMapColors.map(color => [color[0], color[1], color[2], 255]);

		// Add wireframe color.
		if (this.drawWireframe) {
			const wireframe = rgb01to255(this.wireframeColor);
			if (wireframe.length != 4) wireframe.push(255);
			colors.push(wireframe);
		}

		// Add custom outline.
		if (this.outlineSize >= 1) {
			const outline = rgb01to255(this.outlineColor);
			if (outline.length != 4) outline.push(255);
			colors.push(outline);
		}

		// Add custom background
		if (this.backgroundColor != null) {
			const bg = rgb01to255(this.backgroundColor);
			if (bg.length != 4) bg.push(255);
			colors.push(bg);
		}

		return colors;
	}

	/**
	 * Get the effective RGBA255 background color.
	 * @returns {number[]} As [ R, G, B, A ] (each component 0 to 255).
	 */
	getRenderedBackgroundColor() {
		if (this.backgroundColor == null) {
			const bgColor = this._lightMapColors[this.model.backgroundIndex];
			
			return [ bgColor[0], bgColor[1], bgColor[2], 255 ];
		} else {
			return [
				Math.floor(this.backgroundColor[0] * 255.999 ),
				Math.floor(this.backgroundColor[1] * 255.999 ),
				Math.floor(this.backgroundColor[2] * 255.999 ),
				this.backgroundColor.length <= 3 ? 255 : Math.floor(this.backgroundColor[3] * 255.999 ),
			];
		}
	}

	/**
	 * @param {ImageData} imageData
	 * @private
	 */
	_getLightMapColors(imageData) {
		const data = imageData.data;
		const colors = Array(16);
		const set = new Set();

		// First add every 2nd pixel from top row.
		for (let i = 0; i < 16; i++) {
			let ti = i * 8;
			let r = data[ti    ];
			let g = data[ti + 1];
			let b = data[ti + 2];
			let rgb = [r, g, b];
			colors[i] = rgb;
			set.add(r + g * 256 + b * 65536);
		}

		// Then check all other pixels!
		for (let i = 0; i < data.length; i += 4) {
			let r = data[i    ];
			let g = data[i + 1];
			let b = data[i + 2];
			let key = r + g * 256 + b * 65536;
			if (!set.has(key)) {
				set.add(key);
				colors.push([r, g, b]);
			}
		}

		return colors;
	}

	/**
	 * Override the default light-maps (texture and color).
	 * 
	 * The passed image-data must be 32 pixels wide, but can be of any height.
	 * 
	 * Each 2-pixel-column specifies the lightning for one color. Top-to-bottom maps light-to-dark. The two columns are used to provide dithering.
	 * @param {ImageData} imageData
	 */
	setLightMap(imageData) {
		if (this._lightMapTex != null) this.gl.deleteTexture(this._lightMapTex);

		this._lightMapColors = this._getLightMapColors(imageData);

		this._lightMapTex = this._createTexture(null, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, imageData);
	}

	/**
	 * @private
	 */
	_freeMainTexture() {
		if (this._indexTex != null) {
			this.gl.deleteTexture(this._indexTex);
			this._indexTex = null;
		}
	}

	/**
	 * @param {ImageData|number[]|Uint8Array} src
	 * @param {number} [width] Required if passing an index array via `src`.
	 * @param {number} [height] Required if passing an index array via `src`.
	 */
	setIndexTexture(src, width, height) {
		/** @type {ImageData} */
		let imageData;
		/** @type {Uint8Array} */
		let indices;

		if (src instanceof ImageData) {
			// Passed image data/pixels.
			imageData = src;

			// Convert pixels to indices
			const n = imageData.width * imageData.height;
			indices = new Uint8Array(n);
			const colorToIndex = new Map(PICO_COLORS.map(([r, g, b], i) => [ 0xff000000 | (b << 16) | (g << 8) | r, (this.model.alphaIndex === i ? 255 : i) ]));
			const ints = new Int32Array(src.data.buffer);

			for (let i = 0; i < n; i++) {
				const int = ints[i];
				indices[i] = colorToIndex.get(int) ?? 0;
			}
		} else {
			// TODO this does not handle alpha index correctly.
			// Passed an index array.
			if (src instanceof Uint8Array) {
				indices = src;
			} else {
				indices = new Uint8Array(src);
			}

			// Convert indices to pixels
			imageData = new ImageData(width, height);
			const data = imageData.data;

			let i = 0;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const [r, g, b] = PICO_COLORS[i] ?? PICO_COLORS[0];
					data[i++] = r;
					data[i++] = g;
					data[i++] = b;
					data[i++] = 255;
				}
			}
		}

		

		// Create textures
		this._freeMainTexture();
		this._indexTex = this._createTexture(this._indexTex, this.gl.LUMINANCE, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, indices, imageData.width, imageData.height);
	}

	/**
	 * @param {TexImageSource} texture 
	 */
	setHDTexture(texture) {
		if (texture == null) {
			this.removeHDTexture();
			return;
		}

		/** @private */
		this._hdTex = this._createTexture(this._hdTex, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, texture);
	}

	hasHDTexture() {
		return this._hdTex != null;
	}

	removeHDTexture() {
		if (this._hdTex != null) {
			this.gl.deleteTexture(this._hdTex);
			this._hdTex = null;
		}
	}
	
	getWatermark() {
		return this._watermarkText;
	}

	/**
	 * Sets a watermark to be displayed in the corner of the GIF.
	 * @param {string} s
	 */
	setWatermark(s) {
		if (s == null || s.trim().length === 0) {
			s = null;
		}

		if (s !== this._watermarkText) {
			this._watermarkText = s;

			if (s) {
				/** @type {number[]} */
				let bytes = [];

				let charToByte = {
					"▮": 16,
					"■": 17,
					"□": 18,
					"⁙": 19,
					"⁘": 20,
					"‖": 21,
					"◀": 22,
					"▶": 23,
					"「": 24,
					"」": 25,
					"¥": 26,
					"•": 27,
					"、": 28,
					"。": 29,
					"゛": 30,
					"゜": 31,
					"○": 127,
					"█": 128,
					"▒": 129,
					"🐱": 130,
					"⬇️": 131,
					"░": 132,
					"✽": 133,
					"●": 134,
					"♥": 135,
					"❤": 135,
					"☉": 136,
					"웃": 137,
					"🧍‍♀️": 137,
					"🧍‍♂️": 137,
					"⌂": 138,
					"🏠": 138,
					"⬅️": 139,
					"🙂": 140,
					"😐": 140,
					"♪": 141,
					"🎵": 141,
					"🅾️": 142,
					"◆": 143,
					"…": 144,
					"➡️": 145,
					"★": 146,
					"⧗": 147,
					"⏳": 147,
					"⬆️": 148,
					"ˇ": 149,
					"∧": 150,
					"❎": 151,
					"▤": 152,
					"▥": 153,
					"ー": 254,
				};

				// Iterate code-points and convert to PICO-8 bytes.
				for (let cs of s) {
					let byte = 32;

					if (charToByte.hasOwnProperty(cs)) {
						byte = charToByte[cs];
					} else if (cs.length === 1) {
						let code = cs.charCodeAt(0);

						if (code >= 65 && code <= 90) {
							// A-Z -> a-z
							byte = 97 + (code - 65);
						} else if (code >= 97 && code <= 122) {
							// a-z -> A->Z
							byte = 65 + (code - 97);
						} else if (code < 128) {
							// Other ASCII
							byte = code;
						} else if (code >= 0xff00 && code <= 0xff5e) {
							// Fullwidth
							byte = 32 + (code - 0xff00);
						} else if (code >= 0x3040 && code <= 0x30ff) {
							// Kana
							byte = 154;

							// Account for Katakana
							let isHiragana = true;
							if (code >= 0x30a0)  {
								code -= 96;
								byte = 204;
								isHiragana = false;
							}

							if (code <= 0x304A) {
								// Vowels
								byte += Math.floor((code - 0x3041) / 2);
							} else if (code === 0x3063) {
								// っ
								byte += 46;
							} else if (code <= 0x3069) {
								// か to ぢ
								if (code > 0x3063) code--;

								code -= 0x304b;

								byte += 5 + Math.floor(code / 2);

								// Dakuten
								if (code % 2 === 1) {
									bytes.push(byte);
									byte = 30;
								}

								// Handakuten
							} else if (code <= 0x306e) {
								// な to の
								byte += 20 + (code - 0x306a);
							} else if (code <= 0x307d) {
								// は to ぽ
								code -= 0x306f;

								byte += 25 + Math.floor(code / 3);

								// Dakuten
								if (code % 3 === 1) {
									bytes.push(byte);
									byte = 30;
								}

								// Handakuten
								if (code % 3 === 2) {
									bytes.push(byte);
									byte = 31;
								}
							} else if (code <= 0x3082) {
								// ま to も
								byte += 30 + (code - 0x307e);
							} else if (code <= 0x3088) {
								// ゃ to よ
								code -= 0x3083;

								byte += 35 + Math.floor(code / 2);

								if (code % 2 === 0) {
									// Small versions
									byte += 12;
								}
							} else if (code <= 0x308d) {
								// ら to ろ
								byte += 38 + (code - 0x3089);
							} else if (code <= 0x308f) {
								// ゎ and わ
								byte += 43;
							} else if (code === 0x3092) {
								// を
								byte += 44;
							} else if (code === 0x3093) {
								// ん
								byte += 45;
							}
						}
					}

					bytes.push(byte);
				}

				// Convert to WebGL data.
				let floats = new Float32Array(bytes.length * 24);
				let floatIndex = 0;
				let x1 = 0;
				let y1 = 0;
				let totalWidth = 0;

				/**
				 * @param {number} x
				 * @param {number} y
				 * @param {number} u
				 * @param {number} v
				 */
				let addVertex = (x, y, u, v) => {
					floats[floatIndex++] = x;
					floats[floatIndex++] = y;
					floats[floatIndex++] = u;
					floats[floatIndex++] = v;
				}

				for (let i = 0; i < bytes.length; i++) {
					let byte = bytes[i];

					// note '#'(35) has modified full-width glyph.
					let charW = byte == 35 ? 6 : byte < 128 ? 4 : 8;
					let charH = 5;

					let x2 = x1 + charW;
					let y2 = y1 + charH;

					let u1 = (byte % 16) / 16;
					let v1 = Math.floor(byte / 16) / 16;
					let sprW = charW / 128;
					let sprH = charH / 128;
					let u2 = u1 + sprW;
					let v2 = v1 + sprH;

					addVertex(x1, y1, u1, v1);
					addVertex(x1, y2, u1, v2);
					addVertex(x2, y2, u2, v2);
					
					addVertex(x1, y1, u1, v1);
					addVertex(x2, y2, u2, v2);
					addVertex(x2, y1, u2, v1);

					x1 += charW;

					totalWidth += charW;
					if (i == 0) totalWidth--;
				}

				const gl = this.gl;

				if (this._watermarkBuffer == null) {
					this._watermarkBuffer = gl.createBuffer();
				}

				gl.bindBuffer(gl.ARRAY_BUFFER, this._watermarkBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, floats, gl.STATIC_DRAW);

				this._watermarkSize = [ totalWidth, 5 ];
				this._watermarkTriangleCount = bytes.length * 6;
			}
		}
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

			gl.deleteTexture(this._indexTex);
			this._indexTex = null;
		}

		// Prepare model for WebGL rendering.
		const rendering = prepareModelForRendering(gl, model, this.tesselationCount);

		this._passes = rendering.passes;
		this._wireframe = rendering.wireframe;
		this._indexTex = this._createTexture(this._indexTex, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(rendering.textureIndices), 128, 128);

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
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);

		gl.viewport(0, 0, this._resolution[0], this._resolution[1]);

		// Clear screen.
		gl.clearColor(0, 0, 0, 0);
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
				// const programInfo = this._hdTex == null ? ((this.shading && pass.shading) ? this._programTexture : this._programUnlitTexture) : this._programHDTexture;
				const programInfo = (this._hdTex == null || useColor) ? ((this.shading && pass.shading) ? this._programTexture : this._programUnlitTexture) : this._programHDTexture;

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
					// Index texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, useColor ? this._colorIndexTex : this._indexTex);
					gl.uniform1i(programInfo.locations.indexTex, 0);

					// Light-map texture
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, this._lightMapTex);
					gl.uniform1i(programInfo.locations.lightMap, 1);
				} else if (programInfo === this._programTexture) {
					// Index texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, useColor ? this._colorIndexTex : this._indexTex);
					gl.uniform1i(programInfo.locations.indexTex, 0);

					// Light-map texture
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, this._lightMapTex);
					gl.uniform1i(programInfo.locations.lightMap, 1);

					// Light map curve
					// gl.uniform1f(programInfo.locations.lightMapOffset, useColor ? -0.316326530612245 : -0.3571428571428572);
					// gl.uniform1f(programInfo.locations.lightMapGradient, useColor ? 1.63265306122449 : 2.857142857142857);
					gl.uniform1f(programInfo.locations.lightMapOffset, -0.3571428571428572);
					gl.uniform1f(programInfo.locations.lightMapGradient, 2.857142857142857);

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
				} else if (programInfo === this._programHDTexture) {
					// Main texture
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, this._hdTex);
					gl.uniform1i(programInfo.locations.mainTex, 0);

					// Light direction
					gl.uniform3f(programInfo.locations.lightDir, lightVector.x, lightVector.y, lightVector.z);
					
					// HD lighting options
					gl.uniform1f(programInfo.locations.lightSteps, this.hdOptions.shadingSteps);
					gl.uniform3f(programInfo.locations.lightAmbient, this.hdOptions.shadingColor[0], this.hdOptions.shadingColor[1], this.hdOptions.shadingColor[2]);

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

		// Postprocessing.
		let currFrameBufferTex = this._frameBufferTex;
		let outlineIterations = this.outlineSize;

		if (outlineIterations > 0) {
			// If we have any post-processing to do, clear the second framebuffer.
			gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer2);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}

		// Outlines.
		if (outlineIterations > 0) {
			let outlineProgram = this._programOutline;

			outlineProgram.program.use();

			gl.uniform2f(outlineProgram.locations.pixel, 1 / this._resolution[0], 1 / this._resolution[1]);
			
			gl.uniform4f(outlineProgram.locations.outlineColor, this.outlineColor[0], this.outlineColor[1], this.outlineColor[2], this.outlineColor[3] ?? 1);

			gl.bindBuffer(gl.ARRAY_BUFFER, this._screenQuads);
			gl.vertexAttribPointer(
				outlineProgram.program.vertexLocation,
				2,
				gl.FLOAT,
				false,
				0,
				0,
			);
			gl.enableVertexAttribArray(outlineProgram.program.vertexLocation);
	
			for (let i = 0; i < outlineIterations; i++) {
				// Swap target framebuffer.
				let nextFrameBufferTex;
				if (currFrameBufferTex === this._frameBufferTex) {
					gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer2);
					nextFrameBufferTex = this._frameBufferTex2;
				} else {
					gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
					nextFrameBufferTex = this._frameBufferTex;
				}
	
				// Draw to framebuffer.
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, currFrameBufferTex);
				gl.uniform1i(outlineProgram.locations.mainTex, 0);
	
				gl.drawArrays(gl.TRIANGLES, 0, 6);
	
				// Finalize swap.
				currFrameBufferTex = nextFrameBufferTex;
			}
		}

		// Record which framebuffer has the most recent render.
		this._framebufferCurrent = currFrameBufferTex === this._frameBufferTex ? this._frameBuffer : this._frameBuffer2;

		// Draw watermark
		if (this._watermarkText) {

			if (!this._fontTex) {
				let img = lazyLoadedFontImage();
				if (img) {
					this._fontTex = this._createTexture(this._fontTex, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
				}
			}

			if (this._fontTex) {
				let textProgram = this._programText;
	
				textProgram.program.use();
		
				gl.bindBuffer(gl.ARRAY_BUFFER, this._watermarkBuffer);
	
				gl.vertexAttribPointer(
					textProgram.program.vertexLocation,
					2,
					gl.FLOAT,
					false,
					16,
					0,
				);
				gl.enableVertexAttribArray(textProgram.program.vertexLocation);
	
				gl.vertexAttribPointer(
					textProgram.locations.uv,
					2,
					gl.FLOAT,
					false,
					16,
					8,
				);
				gl.enableVertexAttribArray(textProgram.locations.uv);

				
				// Set text position.
				let watermarkPadding = 2;

				gl.uniform4f(textProgram.locations.data,
					this._resolution[0] / 2 - this._watermarkSize[0] - watermarkPadding,
					this._resolution[1] / 2 - this._watermarkSize[1] - watermarkPadding,
					2 / this._resolution[0],
					-2 / this._resolution[1],
				);
				
				// Set text color.
				let textColor;
				let bgColor = this.backgroundColor;
				
				if (bgColor) {
					// Custom color...
					// Use the lightest/darkest color depending on the brightness of the chosen background.
					let isLight = luma(bgColor[0], bgColor[1], bgColor[2]) > 0.5;
					let bestLuma = null;
					for (let color of this._lightMapColors) {
						let lu = luma(color[0] / 255, color[1] / 255, color[2] / 255);
						if (isLight) lu = 1 - lu;
						if (!textColor || lu > bestLuma) {
							textColor = color;
							bestLuma = lu;
						}
					}
				} else {
					// Use picoCAD method, add 8 to background color index.
					textColor = this._lightMapColors[(this.model.backgroundIndex + 8) % 16];
				}
				
				gl.uniform4f(textProgram.locations.color, textColor[0] / 255, textColor[1] / 255, textColor[2] / 255, 1);
	
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this._fontTex);
				gl.uniform1i(textProgram.locations.mainTex, 0);
	
				gl.drawArrays(gl.TRIANGLES, 0, this._watermarkTriangleCount);
			}
		}

		// Render framebuffer to canvas.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.viewport(0, 0, canvas.width, canvas.height);

		if (this.backgroundColor == null) {
			const bgColor = this._lightMapColors[this.model.backgroundIndex];
			gl.clearColor(bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 1);
		} else {
			gl.clearColor(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2], this.backgroundColor[3] ?? 1);
		}
		gl.clear(gl.COLOR_BUFFER_BIT);

		let program = this._programFramebuffer;

		program.program.use();

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, currFrameBufferTex);
		gl.uniform1i(program.locations.mainTex, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._screenQuads);
		gl.vertexAttribPointer(
			program.program.vertexLocation,
			2,
			gl.FLOAT,
			false,
			0,
			0,
		);
		gl.enableVertexAttribArray(program.program.vertexLocation);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	/**
	 * @param {(dt: number) => void} [preDrawCallback] Called before the start of every draw. `dt` is the seconds since last draw.
	 * @param {(dt: number) => void} [postDrawCallback] Called after every draw. `dt` is the seconds since last draw completed.
	 */
	startDrawLoop(preDrawCallback, postDrawCallback) {
		let then = performance.now();
		let drawThen = then;

		const loop = () => {
			if (preDrawCallback != null) {
				const now = performance.now();
				const dt = (now - then) / 1000;
				preDrawCallback(dt);
				then = now;
			}

			this.draw();

			if (postDrawCallback != null) {
				const now = performance.now();
				const dt = (now - drawThen) / 1000;
				postDrawCallback(dt);
				drawThen = now;
			}

			/** @private */
			this._rafID = requestAnimationFrame(loop);
		};
		this._rafID = requestAnimationFrame(loop);
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
		let count = 1; // framebuffer -> canvas
		for (const pass of this._passes) {
			if (!pass.isEmpty()) count++;
		}
		if (this.drawWireframe) count++;
		count += this.outlineSize;
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
	 * Get the rendered pixel data, row-by-row, bottom to top (i.e. upsidedown).  
	 * This data is not up-scaled to match the view scale.
	 * 
	 * By default this only works if called right after the frame is drawn (e.g. after `draw()` or in the post draw callback of `startDrawLoop()`).  
	 * Set `preserveDrawingBuffer: true` in the viewer options to allow calling this method asynchronously.
	 * @returns {Uint8Array} A new buffer containing the pixel data.
	 */
	getPixels() {
		const gl = this.gl;
		const [width, height] = this._resolution;
		const count = width * height;
		const buffer = new Uint8Array(count * 4);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebufferCurrent);

		gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return buffer;
	}

	/**
	 * Get the rendered pixels as PICO-8 indices (row-by-row, top to bottom).
	 * 
	 * By default this only works if called right after the frame is drawn (e.g. after `draw()` or in the post draw callback of `startDrawLoop()`).
	 * 
	 * Set `preserveDrawingBuffer: true` in the viewer options to allow calling this method asynchronously.
	 * @param {number} [scale] Upscale by repeating indices. Defaults to 1.
	 * @returns {Uint8Array}
	 */
	getPixelIndices(scale=1) {
		const gl = this.gl;
		const [width, height] = this._resolution;
		const count = width * height;
		const outWidth1 = width * scale;
		const outWidth2 = outWidth1 * scale;
		const scaleMultiple = scale * scale;
		scale = Math.max(1, Math.floor(scale));

		const buffer = new Uint8Array(count * 4);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebufferCurrent);

		gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// Create color -> index mapping.
		const palette = this.getPalette();
		const paletteIntToIndex = new Map(palette.map((rgb, i) => [ rgbToInt(rgb), i ]));

		// The framebuffer has a transparent background, so add transparent -> background-color mapping.
		paletteIntToIndex.set(0, this.backgroundColor ? palette.length - 1 : this.model.backgroundIndex);

		// Convert.
		// Note the WebGL buffer is top to bottom.
		const ints = new Uint32Array(buffer.buffer);
		const indices = new Uint8Array(count * scaleMultiple);

		let bufRowIndex = count - width;
		let outRowIndex = 0;

		for (let y = 0; y < height; y++) {
			let bufIndex = bufRowIndex;
			let outIndex = outRowIndex;

			for (let x = 0; x < width; x++) {
				const int = ints[bufIndex];
				const index = paletteIntToIndex.get(int) ?? 0;

				if (scale === 1) {
					indices[outIndex] = index;
				} else {
					// Repeat index in square region.
					let outIndexLoc = outIndex;
					for (let sy = 0; sy < scale; sy++) {
						for (let sx = 0; sx < scale; sx++) {
							indices[outIndexLoc + sx] = index;
						}
						outIndexLoc += outWidth1;
					}
				}
				
				outIndex += scale;
				bufIndex++;
			}

			bufRowIndex -= width;
			outRowIndex += outWidth2;
		}

		return indices;
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
		gl.deleteTexture(this._indexTex);
		this._lightMapTex = null;
		this._indexTex = null;

		this._programTexture.program.free();
		this._programWireframe.program.free();
		this._programTexture = null;
		this._programWireframe = null;

		gl.deleteFramebuffer(this._frameBuffer);
		gl.deleteFramebuffer(this._frameBuffer2);
		gl.deleteTexture(this._frameBufferTex);
		gl.deleteTexture(this._frameBufferTex2);
		gl.deleteBuffer(this._screenQuads);
		gl.deleteRenderbuffer(this._depthBuffer);
		this._programFramebuffer.program.free();
		this._frameBuffer = null;
		this._frameBuffer2 = null;
		this._framebufferCurrent = null;
		this._frameBufferTex = null;
		this._frameBufferTex2 = null;
		this._screenQuads = null;
		this._depthBuffer = null;
		this._programFramebuffer = null;

		this._programText.program.free();
		if (this._watermarkBuffer) {
			gl.deleteBuffer(this._watermarkBuffer);
			this._watermarkBuffer = null;
		}
		if (this._fontTex) {
			gl.deleteTexture(this._fontTex);
			this._fontTex = null;
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
			highp float intensity = clamp(lightMapGradient * abs(dot(v_normal, lightDir)) + lightMapOffset, 0.0, 1.0);
			gl_FragColor = texture2D(lightMap, vec2(0.015625 + index * 15.9375 + mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) * 0.03125, 1.0 - intensity));
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
		
		uniform sampler2D indexTex;
		uniform sampler2D lightMap;

		void main() {
			highp float index = texture2D(indexTex, v_uv).r;
			if (index == 1.0) discard;
			gl_FragColor = texture2D(lightMap, vec2(0.015625 + index * 15.9375, 0.0));
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			mvp: program.getUniformLocation("mvp"),
			indexTex: program.getUniformLocation("indexTex"),
			lightMap: program.getUniformLocation("lightMap"),
		}
	};
}


/**
 * @param {WebGLRenderingContext} gl 
 */
function createHDTextureProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec4 vertex;
		attribute vec3 normal;
		attribute vec2 uv;

		varying highp vec2 v_uv;
		varying highp vec3 v_normal;

		uniform mat4 mvp;

		void main() {
			v_uv = uv;
			v_normal = normal;
			gl_Position = mvp * vertex;
		}
	`, `
		varying highp vec2 v_uv;
		varying highp vec3 v_normal;
		
		uniform highp float lightSteps;
		uniform sampler2D mainTex;
		uniform highp vec3 lightDir;
		uniform highp vec3 lightAmbient;

		void main() {
			highp vec4 col = texture2D(mainTex, v_uv);
			if (col.a != 1.0) discard;
			highp float pixel = mod(gl_FragCoord.x + gl_FragCoord.y, 2.0);
			highp float intensity = abs(dot(v_normal, lightDir)) * 2.2 - 0.2;
			intensity = floor(intensity * (lightSteps + 0.5) + pixel/2.0) / lightSteps;
			intensity = clamp(intensity, 0.0, 1.0);
			gl_FragColor = vec4(mix(col.rgb * lightAmbient, col.rgb, intensity), 1.0);
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			normal: program.getAttribLocation("normal"),
			mvp: program.getUniformLocation("mvp"),
			lightSteps: program.getUniformLocation("lightSteps"),
			lightAmbient: program.getUniformLocation("lightAmbient"),
			mainTex: program.getUniformLocation("mainTex"),
			lightDir: program.getUniformLocation("lightDir"),
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
 * @param {WebGLRenderingContext} gl 
 */
function createOutlineProgram(gl) {
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
		uniform highp vec2 pixel;
		uniform lowp vec4 outlineColor;

		void main() {
			lowp float a = 1.0 - texture2D(mainTex, v_uv).a;
			lowp float b = texture2D(mainTex, v_uv + vec2(pixel.x, 0.0)).a + texture2D(mainTex, v_uv - vec2(pixel.x, 0.0)).a + texture2D(mainTex, v_uv + vec2(0.0, pixel.y)).a + texture2D(mainTex, v_uv - vec2(0.0, pixel.y)).a;
			gl_FragColor = mix(
				mix(
					texture2D(mainTex, v_uv),
					vec4(0.0, 0.0, 0.0, 0.0),
					a
				),
				outlineColor,
				min(1.0, a * b)
			);
		}
	`);
	
	return {
		program: program,
		locations: {
			mainTex: program.getUniformLocation("mainTex"),
			pixel: program.getUniformLocation("pixel"),
			outlineColor: program.getUniformLocation("outlineColor"),
		}
	};
}

/**
 * @param {WebGLRenderingContext} gl 
 */
function createTextProgram(gl) {
	const program = new ShaderProgram(gl, `
		attribute vec2 vertex;
		attribute vec2 uv;

		varying highp vec2 v_uv;

		uniform highp vec4 data;

		void main() {
			v_uv = uv;
			gl_Position = vec4((data.xy + vertex) * data.zw, 0.0, 1.0);
		}
	`, `
		varying highp vec2 v_uv;
		
		uniform sampler2D mainTex;
		uniform lowp vec4 color;

		void main() {
			gl_FragColor = texture2D(mainTex, v_uv) * color;
		}
	`);
	
	return {
		program: program,
		locations: {
			uv: program.getAttribLocation("uv"),
			data: program.getUniformLocation("data"),
			mainTex: program.getUniformLocation("mainTex"),
			color: program.getUniformLocation("color"),
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
