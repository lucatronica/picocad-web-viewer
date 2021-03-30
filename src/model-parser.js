import { PicoCADModel, PicoCADModelFace, PicoCADModelObject } from "./model";
import { parsePicoCADData } from "./model-data-parser";
import { readLine, splitString } from "./parser-utils";

/**
 * @param {string} source 
 * @returns {PicoCADModel}
 */
export function parsePicoCADModel(source) {
	if (!source.startsWith("picocad;")) {
		throw Error("Not a picoCAD file.");
	}

	// Read header.
	const [header, body] = readLine(source);

	const headerValues = header.split(";");
	const fileName = headerValues[1];
	const [bestZoom, bgIndex, alphaIndex] = headerValues.slice(2).map(s => Number(s));

	const [dataStr, texStr] = splitString(body, "%"); 

	// Read data.
	const luaData = parsePicoCADData(dataStr);
	const objects = parseLuaData(luaData);

	// Read texture.
	const texIndices = parseTexture(readLine(texStr)[1]);

	// Done!
	return new PicoCADModel(objects, {
		name: fileName,
		alphaIndex: alphaIndex,
		backgroundIndex: bgIndex,
		zoomLevel: bestZoom,
		texture: texIndices,
	});
}

/**
 * @param {import("./model-data-parser").LuaPicoCADModel} lua 
 * @returns {PicoCADModelObject[]}
 */
function parseLuaData(lua) {
	return lua.array.map(luaObject => {
		const name = luaObject.dict.name;
		const pos = luaObject.dict.pos.array;
		const rot = luaObject.dict.rot.array;

		const vertices = luaObject.dict.v.array.map(la => la.array);

		const faces = luaObject.dict.f.array.map(luaFace => {
			const indices = luaFace.array.map(x => x - 1);
			const color = luaFace.dict.c;

			const flatUVs = luaFace.dict.uv.array;
			const uvs = [];
			for (let i = 1; i < flatUVs.length; i += 2) {
				uvs.push([
					flatUVs[i - 1],
					flatUVs[i],
				]);
			}

			return new PicoCADModelFace(indices, color, uvs, {
				shading: luaFace.dict.noshade !== 1,
				texture: luaFace.dict.notex !== 1,
				doubleSided: luaFace.dict.dbl === 1,
				renderFirst: luaFace.dict.prio === 1,
			});
		});

		return new PicoCADModelObject(name, pos, rot, vertices, faces);
	});
}

/**
 * @param {string} s 
 * @returns {number[]}
 */
function parseTexture(s) {
	const indices = /** @type {number[]} */(Array(15360));

	let i = 0;
	let line;
	for (let y = 0; y < 120; y++) {
		[line, s] = readLine(s);

		for (let x = 0; x < 128; x++) {
			indices[i] = Number.parseInt(line.charAt(x), 16);
			i++;
		}
	}

	return indices;
}
