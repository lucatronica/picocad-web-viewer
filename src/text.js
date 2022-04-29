
// Direct Base64 encoding of font.gif.
// Adapted from the CC-0 PICO-8 font: https://www.lexaloffle.com/gfx/pico-8_font_022.png
const FONT_GIF_BASE64 = "R0lGODdhgACAAIAAAAAAAP///yH5BAkKAAAALAAAAACAAIAAAAL/hI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC5vBHBtBcitz/ty859PpaIgdjngIFgE/pvMIxTWaRpAy+UwibVtnM9sDM7tVLOP7FQOHVDJZfLWp3cLzMV2PYsow6oQvJ4GGV1NoeIiYqLgYJoUGBhg3tpBWKUQogrnkeIfUZaaVt0kpCmr1h9pWyhVB2Pba+mkXsuP5dtk6tarGS6E5CiH5CJu7KjkruMu4zNzs/BwTOUiMRR14h10k61ucXa1sueSnDFf+uDsNzinlHaptPRauBc9dr70OfI1OKs7/bewvXzxy7Qa+K6jP4LyACgUydKgOmsSJFCtaRHXx2TE6/0P0LDzo0UvBSOXYhGTVL6U7h8IG7TvH7l5MkP9qJuTiZxy+m7xawhQojFTOnShtNiyKdCVPkvA+bRyqMmnGqVSrWr3KzOmZnz24TupIUw5Uo0GbIpspMpg5oniGsZ1jslTbsxWkgQXI1o3XhPLQmqq7Ne/Dr0DfqBo59ySlbVgbO34M+aE0lzLDHiUsFvHYpRwVb077NzPLwRsllxy5Nljn0KClao07+qSlz8eEvsUV++1et6Np98pL+aNwzrRXix7eOjnjyMybO6cIaI5Ts76rI3xd+ULZ2wCtR01+sy9ruKgPW4brvbBXWZWo+8V8HChu5EwZJn6/l/zd+PA5G/8zrNl+4f3yXIEGHghNLUYEwSA7Cl6jU1g0bDFZOw/GUwtNF5qiIBENYrggD56AkiFOWWw44Q98XFjFhAOpWJktInYoUoMLEuYiXxSWCKKJLZbYoQ8zgkjhPULi5CGNNYrlYogimsFjj8OlKGFaP5a04pAmInnjhygCyRo96UQl5Iw/sqjXLQiuyWab0UQJB48b+gIkjTZuCaFn2eTw5BR8yuiNk8qRyKArS/I1SpRwvtLkkrYQCeNKHormZYplZngnhhza10mfmiT5Z5Za9hepF4XqcmeOSvTF53Gt/jbPiBDKCacgdT6Y6aQ8NXSkO08S6Gawwg7rQK2QEIrdrlj/dhLaorSStMmIigp4qShyLnZmdGYShOieyZrZZ0zAliqXPkr+idxM65mbh3l5LuWPihHKpwunEGmqnKFQMqsUns1O56m8weXjbLTLEYtwwm6+Wg2j+xYlr1polsFeng6TySsboFocSJmEdmWwjJFue+KKGg95BcWrvvtqy4mixXC4fymJ3qrQenqiI0du7LKp4f76xMj4Dv3VqOi+e+xiscqk66Mdw0dx0bbd+KJc2ppltcJab621TuCSy2XD5wHLwZxJMSoziR5RGaOuHTMs8T71zrxop75GayTeSPM6ZthICtgatKfJHXSSe/eaWqPqchxxRPaO3Z7BesD999H0/Yptmb5rG8t15543N++/Rdr9MKnTihurwP2orl62X+vtd6Jm95Q67GkP9Utb48z7865Co8QV5U/nKKW4igKoduxh0hUetXNn18u6OSetZm7K6xiFNdOhs9vn3n8PeiyC40XcjvYdX30ddZPur+zRUb90vOYam7sdYBev7Hz9sjt9vWDzpjzhCWx373kepmBWusEMb3AGFEfa4MW+SfCueiTb39SsJaoraexe4OugByWSwXeMDkb3K96XVNYM8cyChLnpndw+NB5sbWCAIvxdfFxIu/j5hYbQQwrNiqVAVlmJf/rZYXccV5dnDWxTOEpT4zbnLtHR44NUrGJGCgAAOw==";

/**
 * @returns {Promise<HTMLImageElement>}
 */
async function loadFontImage() {
	return new Promise((resolve, reject) => {
		let img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject("could not load PICO-8 font");
		img.src = "data:image/gif;base64," + FONT_GIF_BASE64;
	});
}

let lazyLoading = false;
let lazyLoadedFont = null;

/**
 * @returns {HTMLImageElement|null}
 */
export function lazyLoadedFontImage() {
	if (!lazyLoading) {
		lazyLoading = true;
		loadFontImage().then(font => lazyLoadedFont = font);
	}
	return lazyLoadedFont;
}
