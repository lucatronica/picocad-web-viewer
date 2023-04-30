!function(){"use strict";
/*
	@licence https://github.com/mattdesl/gifenc
	The MIT License (MIT)
	Copyright (c) 2017 Matt DesLauriers

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
	IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
	OR OTHER DEALINGS IN THE SOFTWARE.
	*/var t=59;function e(t=256){let e=0,r=new Uint8Array(t);return{get buffer(){return r.buffer},reset(){e=0},bytesView:()=>r.subarray(0,e),bytes:()=>r.slice(0,e),writeByte(t){n(e+1),r[e]=t,e++},writeBytes(t,a=0,l=t.length){n(e+l);for(let n=0;n<l;n++)r[e++]=t[n+a]},writeBytesView(t,a=0,l=t.byteLength){n(e+l),r.set(t.subarray(a,a+l),e),e+=l}};function n(t){var n=r.length;if(n>=t)return;t=Math.max(t,n*(n<1048576?2:1.125)>>>0),0!=n&&(t=Math.max(t,256));let a=r;r=new Uint8Array(t),e>0&&r.set(a.subarray(0,e),0)}}var r=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];var n=function(t,n,a,l,i=e(512),f=new Uint8Array(256),c=new Int32Array(5003),o=new Int32Array(5003)){let u=c.length,w=Math.max(2,l);f.fill(0),o.fill(0),c.fill(-1);let y=0,s=0,h=w+1,g=h,b=!1,m=g,B=(1<<m)-1,p=1<<h-1,A=p+1,d=p+2,v=0,M=a[0],U=0;for(let t=u;t<65536;t*=2)++U;U=8-U,i.writeByte(w),x(p);let k=a.length;for(let t=1;t<k;t++)t:{let e=a[t],r=(e<<12)+M,n=e<<U^M;if(c[n]===r){M=o[n];break t}let l=0===n?1:u-n;for(;c[n]>=0;)if(n-=l,n<0&&(n+=u),c[n]===r){M=o[n];break t}x(M),M=e,d<4096?(o[n]=d++,c[n]=r):(c.fill(-1),d=p+2,b=!0,x(p))}return x(M),x(A),i.writeByte(0),i.bytesView();function x(t){for(y&=r[s],s>0?y|=t<<s:y=t,s+=m;s>=8;)f[v++]=255&y,v>=254&&(i.writeByte(v),i.writeBytesView(f,0,v),v=0),y>>=8,s-=8;if((d>B||b)&&(b?(m=g,B=(1<<m)-1,b=!1):(++m,B=12===m?1<<m:(1<<m)-1)),t==A){for(;s>0;)f[v++]=255&y,v>=254&&(i.writeByte(v),i.writeBytesView(f,0,v),v=0),y>>=8,s-=8;v>0&&(i.writeByte(v),i.writeBytesView(f,0,v),v=0)}}};function a(t,e,r){return t<<8&63488|e<<2&992|r>>3}function l(t,e,r,n){return t>>4|240&e|(240&r)<<4|(240&n)<<8}function i(t,e,r){return t>>4<<8|240&e|r>>4}function f(t,e,r){return t<e?e:t>r?r:t}function c(t){return t*t}function o(t,e,r){var n=0,a=1e100;let l=t[e],i=l.cnt,f=l.ac,o=l.rc,u=l.gc,w=l.bc;for(var y=l.fw;0!=y;y=t[y].fw){let e=t[y],l=e.cnt,h=i*l/(i+l);if(!(h>=a)){var s=0;r&&(s+=h*c(e.ac-f))>=a||!((s+=h*c(e.rc-o))>=a)&&(!((s+=h*c(e.gc-u))>=a)&&(!((s+=h*c(e.bc-w))>=a)&&(a=s,n=y)))}}l.err=a,l.nn=n}function u(t,e,r={}){let{format:n="rgb565",clearAlpha:u=!0,clearAlphaColor:y=0,clearAlphaThreshold:s=0,oneBitAlpha:h=!1}=r;if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array||t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let g=new Uint32Array(t.buffer),b=!1!==r.useSqrt,m="rgba4444"===n,B=function(t,e){let r=new Array("rgb444"===e?4096:65536),n=t.length;if("rgba4444"===e)for(let e=0;e<n;++e){let n=t[e],a=n>>24&255,i=n>>16&255,f=n>>8&255,c=255&n,o=l(c,f,i,a),u=o in r?r[o]:r[o]={ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0};u.rc+=c,u.gc+=f,u.bc+=i,u.ac+=a,u.cnt++}else if("rgb444"===e)for(let e=0;e<n;++e){let n=t[e],a=n>>16&255,l=n>>8&255,f=255&n,c=i(f,l,a),o=c in r?r[c]:r[c]={ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0};o.rc+=f,o.gc+=l,o.bc+=a,o.cnt++}else for(let e=0;e<n;++e){let n=t[e],l=n>>16&255,i=n>>8&255,f=255&n,c=a(f,i,l),o=c in r?r[c]:r[c]={ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0};o.rc+=f,o.gc+=i,o.bc+=l,o.cnt++}return r}(g,n),p=B.length,A=p-1,d=new Uint32Array(p+1);for(var v=0,M=0;M<p;++M){let t=B[M];if(null!=t){var U=1/t.cnt;m&&(t.ac*=U),t.rc*=U,t.gc*=U,t.bc*=U,B[v++]=t}}c(e)/v<.022&&(b=!1);for(M=0;M<v-1;++M)B[M].fw=M+1,B[M+1].bk=M,b&&(B[M].cnt=Math.sqrt(B[M].cnt));var k,x,E;for(b&&(B[M].cnt=Math.sqrt(B[M].cnt)),M=0;M<v;++M){o(B,M,!1);var V=B[M].err;for(x=++d[0];x>1&&!(B[k=d[E=x>>1]].err<=V);x=E)d[x]=k;d[x]=M}var I=v-e;for(M=0;M<I;){for(var q;;){var C=d[1];if((q=B[C]).tm>=q.mtm&&B[q.nn].mtm<=q.tm)break;q.mtm==A?C=d[1]=d[d[0]--]:(o(B,C,!1),q.tm=M);V=B[C].err;for(x=1;(E=x+x)<=d[0]&&(E<d[0]&&B[d[E]].err>B[d[E+1]].err&&E++,!(V<=B[k=d[E]].err));x=E)d[x]=k;d[x]=C}var G=B[q.nn],z=q.cnt,F=G.cnt;U=1/(z+F);m&&(q.ac=U*(z*q.ac+F*G.ac)),q.rc=U*(z*q.rc+F*G.rc),q.gc=U*(z*q.gc+F*G.gc),q.bc=U*(z*q.bc+F*G.bc),q.cnt+=G.cnt,q.mtm=++M,B[G.bk].fw=G.fw,B[G.fw].bk=G.bk,G.mtm=A}let R=[];var L=0;for(M=0;;++L){let t=f(Math.round(B[M].rc),0,255),e=f(Math.round(B[M].gc),0,255),r=f(Math.round(B[M].bc),0,255),n=255;if(m){if(n=f(Math.round(B[M].ac),0,255),h){n=n<=("number"==typeof h?h:127)?0:255}u&&n<=s&&(t=e=r=y,n=0)}let a=m?[t,e,r,n]:[t,e,r];if(w(R,a)||R.push(a),0==(M=B[M].fw))break}return R}function w(t,e){for(let r=0;r<t.length;r++){let n=t[r],a=n[0]===e[0]&&n[1]===e[1]&&n[2]===e[2],l=!(n.length>=4&&e.length>=4)||n[3]===e[3];if(a&&l)return!0}return!1}function y(t,e,r="rgb565"){if(!t||!t.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(t instanceof Uint8Array||t instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(e.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(t.buffer),f=n.length,c="rgb444"===r?4096:65536,o=new Uint8Array(f),u=new Array(c);if("rgba4444"===r)for(let t=0;t<f;t++){let r=n[t],a=r>>24&255,i=r>>16&255,f=r>>8&255,c=255&r,w=l(c,f,i,a),y=w in u?u[w]:u[w]=s(c,f,i,a,e);o[t]=y}else{let t="rgb444"===r?i:a;for(let r=0;r<f;r++){let a=n[r],l=a>>16&255,i=a>>8&255,f=255&a,c=t(f,i,l),w=c in u?u[c]:u[c]=h(f,i,l,e);o[r]=w}}return o}function s(t,e,r,n,a){let l=0,i=1e100;for(let f=0;f<a.length;f++){let c=a[f],o=g(c[3]-n);o>i||(o+=g(c[0]-t),o>i||(o+=g(c[1]-e),o>i||(o+=g(c[2]-r),!(o>i)&&(i=o,l=f))))}return l}function h(t,e,r,n){let a=0,l=1e100;for(let i=0;i<n.length;i++){let f=n[i],c=g(f[0]-t);c>l||(c+=g(f[1]-e),c>l||(c+=g(f[2]-r),!(c>l)&&(l=c,a=i)))}return a}function g(t){return t*t}function b(t,e){let r=1<<p(e.length);for(let n=0;n<r;n++){let r=[0,0,0];n<e.length&&(r=e[n]),t.writeByte(r[0]),t.writeByte(r[1]),t.writeByte(r[2])}}function m(t,e){t.writeByte(255&e),t.writeByte(e>>8&255)}function B(t,e){for(var r=0;r<e.length;r++)t.writeByte(e.charCodeAt(r))}function p(t){return Math.max(Math.ceil(Math.log2(t)),1)}function A(t){return(t.length<4?4278190080:function(t,e){for(let r=0;r<e;r++)t*=2;return t}(t[3],24))+(t[2]<<16)+(t[1]<<8)+t[0]}let d=new function(r={}){let{initialCapacity:a=4096,auto:l=!0}=r,i=e(a),f=new Uint8Array(256),c=new Int32Array(5003),o=new Int32Array(5003),u=!1;return{reset(){i.reset(),u=!1},finish(){i.writeByte(t)},bytes:()=>i.bytes(),bytesView:()=>i.bytesView(),get buffer(){return i.buffer},get stream(){return i},writeHeader:w,writeFrame(t,e,r,a={}){let{transparent:y=!1,transparentIndex:s=0,delay:h=0,palette:g=null,repeat:A=0,colorDepth:d=8,dispose:v=-1}=a,M=!1;if(l?u||(M=!0,w(),u=!0):M=Boolean(a.first),e=Math.max(0,Math.floor(e)),r=Math.max(0,Math.floor(r)),M){if(!g)throw new Error("First frame must include a { palette } option");(function(t,e,r,n,a=8){let l=1,i=0,f=p(n.length)-1,c=l<<7|a-1<<4|i<<3|f,o=0,u=0;m(t,e),m(t,r),t.writeBytes([c,o,u])})(i,e,r,g,d),b(i,g),A>=0&&function(t,e){t.writeByte(33),t.writeByte(255),t.writeByte(11),B(t,"NETSCAPE2.0"),t.writeByte(3),t.writeByte(1),m(t,e),t.writeByte(0)}(i,A)}let U=Math.round(h/10);!function(t,e,r,n,a){var l,i;t.writeByte(33),t.writeByte(249),t.writeByte(4),a<0&&(a=0,n=!1),n?(l=1,i=2):(l=0,i=0),e>=0&&(i=7&e),i<<=2;let f=0;t.writeByte(0|i|f|l),m(t,r),t.writeByte(a||0),t.writeByte(0)}(i,v,U,y,s);let k=Boolean(g)&&!M;(function(t,e,r,n){if(t.writeByte(44),m(t,0),m(t,0),m(t,e),m(t,r),n){let e=0,r=0,a=p(n.length)-1;t.writeByte(128|e|r|0|a)}else t.writeByte(0)})(i,e,r,k?g:null),k&&b(i,g),function(t,e,r,a,l=8,i,f,c){n(r,a,e,l,t,i,f,c)}(i,t,e,r,d,f,c,o)}};function w(){B(i,"GIF89a")}},v=[];addEventListener("message",(t=>{let e=t.data,r=e.type;var n;"generate"===r?function(t,e,r,n,a,l,i){let f=t*e,c=null,o=new Uint8Array(f*r*r),w=null==l?null:new Map(l.map(((t,e)=>[A(t),e])));for(let s=0;s<v.length;s++){let h=v[s];for(let t=0;t<h.length;t+=4)h[t+3]<255&&(h[t]=a[0],h[t+1]=a[1],h[t+2]=a[2],h[t+3]=a[3]);let g,b=null,m=!1;if(null==l){b=u(h,256,{format:"rgba4444"});for(let t=0;t<b.length;t++){let e=b[t];e.length>=4&&e[3]<255&&(m=!0,i=t)}g=y(h,b,"rgba4444")}else{0===s&&(b=l);let t=new Uint32Array(h.buffer);null==c&&(c=new Uint8Array(f));for(let e=0;e<t.length;e++)c[e]=w.get(t[e])??0;g=c,m=i>=0}let B=f-t,p=0,A=t*r,M=A*r;for(let n=0;n<e;n++){let e=B,n=p;for(let a=0;a<t;a++){let t=g[e];if(1===r)o[n]=t,n++;else{let e=n;for(let n=0;n<r;n++){for(let n=0;n<r;n++)o[e+n]=t;e+=A}n+=r}e++}B-=t,p+=M}d.writeFrame(o,t*r,e*r,{palette:b,delay:n,transparent:m,transparentIndex:i})}d.finish();let s=d.bytesView();postMessage({type:"gif",data:s},[s.buffer]),d.reset(),v.length=0}(e.width,e.height,e.scale,e.delay,e.background,e.palette,e.transparentIndex):"frame"===r&&(n=e.data,v.push(n))})),postMessage({type:"load"})}();
