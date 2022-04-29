
/**
 * A rendering pass.
 */
export class Pass {
	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {{cull?: boolean, shading?: boolean, texture?: boolean, clearDepth?: boolean}} [options] 
	 */
	constructor(gl, options={}) {
		this.gl = gl;
		this.cull = options.cull ?? true;
		this.shading = options.shading ?? true;
		this.texture = options.texture ?? true;
		this.clearDepth = options.clearDepth ?? false;

		/** @type {number[]} */
		this.vertices = [];
		/** @type {number[]} */
		this.normals = [];
		/** @type {number[]} */
		this.uvs = [];
		/** @type {number[]} */
		this.colorUVs = [];
		/** @type {number[]} */
		this.triangles = [];
	}

	/**
	 * Upload changes to the GL context.
	 */
	save() {
		const gl = this.gl;

		this.vertexCount = this.triangles.length;

		if (!this.isEmpty()) {
			this.vertexBuffer = gl.createBuffer();
			this.uvBuffer = gl.createBuffer();
			this.colorUVBuffer = gl.createBuffer();
			this.triangleBuffer = gl.createBuffer();
			this.normalBuffer = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
		
			gl.bindBuffer(gl.ARRAY_BUFFER, this.colorUVBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colorUVs), gl.STATIC_DRAW);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangles), gl.STATIC_DRAW);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
		}

		this.uvs = null;
		this.colorUVs = null;
		this.normals = null;
		this.vertices = null;
		this.triangles = null;
	}

	/**
	 * If there is nothing to render.
	 */
	isEmpty() {
		return this.vertexCount === 0;
	}

	free() {
		const gl = this.gl;

		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.uvBuffer);
		gl.deleteBuffer(this.colorUVBuffer);
		gl.deleteBuffer(this.triangleBuffer);
		gl.deleteBuffer(this.normalBuffer);
	}
}

export class WirePass {
	/**
	 * @param {WebGLRenderingContext} gl 
	 */
	constructor(gl) {
		this.gl = gl;

		/** @type {number[]} */
		this.vertices = [];
	}

	save() {
		const gl = this.gl;

		this.vertexCount = Math.floor(this.vertices.length / 3);

		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

		this.vertices = null;
	}

	free() {
		this.gl.deleteBuffer(this.vertexBuffer);
	}
}
