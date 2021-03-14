
export class ShaderProgram {
	/**
	 * @param {WebGLRenderingContext} gl
	 * @param {string} vertexShader 
	 * @param {string} fragmentShader 
	 */
	constructor(gl, vertexShader, fragmentShader) {
		this.gl = gl;

		// create shaders
		const vs = this.createShader(gl.VERTEX_SHADER, vertexShader);
		const fs = this.createShader(gl.FRAGMENT_SHADER, fragmentShader);

		this.program = gl.createProgram();
		gl.attachShader(this.program, vs);
		gl.attachShader(this.program, fs);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			const msg = gl.getProgramInfoLog(this.program);
			gl.deleteProgram(this.program);
			throw msg;
		}

		this.vertexLocation = this.getAttribLocation("vertex");
		this.mvpLocation = this.getUniformLocation("mvp");
	}

	/**
	 * @param {number} type 
	 * @param {string} source 
	 */
	createShader(type, source) {
		const gl = this.gl;

		const shader = gl.createShader(type);

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const msg = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw msg;
		}

		return shader;
	}

	/**
	 * @param {string} name 
	 */
	getAttribLocation(name) {
		return this.gl.getAttribLocation(this.program, name);
	}
	
	/**
	 * @param {string} name 
	 */
	getUniformLocation(name) {
		return this.gl.getUniformLocation(this.program, name);
	}
}
