let cv=null;
let ctx=null;
let canvasW=0;
let canvasH=0;

(function(){ // Initialization
	$(window).on("load",()=>{
		console.log("Init");
		cv=document.getElementById("viz_workspace");
		resize();
		ctx=getWebGLContext(cv);
		testRender(ctx);
	});
	$(window).on("resize",()=>{
		resize();
		renderFrame(ctx,3);
	});
})();

function resize(){
	const dElem=document.documentElement;
	canvasW=dElem.clientWidth;
	canvasH=dElem.clientHeight;
	console.log("Size W="+canvasW+" H="+canvasH);
	$(cv).attr({"width":canvasW,"height":canvasH});
}

//==================== WebGL Imp. =========================

function getWebGLContext(canvas){
	let gl=null;
	try{
		gl=canvas.getContext('webgl')||canvas.getContext('exprimental-webgl');
	}catch{
		alert("WebGL not supported");
	}
	return gl;
}

const testVertexShaderSource=`
attribute vec4 a_Position;
attribute vec4 a_Color;
varying vec4 v_Color;
void main(){
	gl_Position=a_Position;
	gl_PointSize=10.0;
	v_Color=a_Color;
}
`;

const testFragmentShaderSource=`
precision mediump float;
varying vec4 v_Color;
void main(){
	gl_FragColor=v_Color;
}
`;

function testRender(gl){
	initShaders(gl,testVertexShaderSource,testFragmentShaderSource);
	const n=initBuffers(gl);
	renderFrame(gl,n);
}

function renderFrame(gl,n){
	gl.clearColor(0,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES,0,n);
}

function initShaders(gl,vShader,fShader){
	const vertexShader=loadShader(gl,gl.VERTEX_SHADER,vShader);
	const fragmentShader=loadShader(gl,gl.FRAGMENT_SHADER,fShader);
	const program=gl.createProgram();
	gl.attachShader(program,vertexShader);
	gl.attachShader(program,fragmentShader);
	gl.linkProgram(program);
	gl.useProgram(program);
	gl.program=program;
	return true;
}

function loadShader(gl,type,source){
	const shader=gl.createShader(type);
	gl.shaderSource(shader,source);
	gl.compileShader(shader);

	const compiled=gl.getShaderParameter(shader,gl.COMPILE_STATUS);
	if(!compiled){
		const error=gl.getShaderInfoLog(shader);
		console.log("Shader Compile Failed: "+error);
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function initBuffers(gl){
	const vertices=new Float32Array([
		 0.0,  0.5,  1.0,  0.0,  0.0,
		-0.5, -0.5,  0.0,  1.0,  0.0,
		 0.5, -0.5,  0.0,  0.0,  1.0
	]);
	const n=3;
	const vertexBuffer=gl.createBuffer();
	const FSIZE=vertices.BYTES_PER_ELEMENT;
	gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);

	const aPosition=gl.getAttribLocation(gl.program,'a_Position');
	const aColor=gl.getAttribLocation(gl.program,'a_Color');

	gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,FSIZE*5,0);
	gl.enableVertexAttribArray(aPosition);
	gl.vertexAttribPointer(aColor,3,gl.FLOAT,false,FSIZE*5,FSIZE*2);
	gl.enableVertexAttribArray(aColor);

	return n;
}