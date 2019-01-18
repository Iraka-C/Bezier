let app=null;
let canvasW=0;
let canvasH=0;

let vertices=[];
let edges=[];
let polygon=null;
let polyGraph=null;

let bezierCurve=null;
let bezierGraph=null;

let offsetWidth=30;

$(()=>{
	app=new PIXI.Application({width:0,height:0,antialias:true});
	document.getElementById("canvas_box").appendChild(app.view);
	resize();
	$(window).on("resize",resize);
	setup(6);
});

function resize(){
	app.renderer.resize(window.innerWidth,window.innerHeight);
}

function setup(d){
	// Initialize spirits
	bezierGraph=new PIXI.Graphics();
	app.stage.addChild(bezierGraph);

	let radius=10;
	let vArr=[];
	let bArr=[];
	for(let i=0;i<=d;i++){
		let circle=new PIXI.Graphics();
		circle.lineStyle(2,0xFFFFFF,1);
		circle.drawCircle(0,0,radius);
		circle.x=Math.cos(i*i)*200+400;
		circle.y=Math.sin(i*i)*200+400;
		circle.r=radius+i;
		vertices[i]=circle;
		app.stage.addChild(circle);
		vArr.push(circle.x);
		vArr.push(circle.y);
		bArr.push({x:circle.x,y:circle.y});
	}
	
	polygon=new PIXI.Polygon(vArr);
	polyGraph=new PIXI.Graphics();
	app.stage.addChild(polyGraph);

	bezierCurve=new Bezier(bArr);

	isStageChanged=true;

	// Initialize events
	$(window).on("mousedown",event=>mouseDown(event.offsetX,event.offsetY));
	$(window).on("mousemove",event=>mouseMove(event.offsetX,event.offsetY));
	$(window).on("mouseup",event=>mouseUp(event.offsetX,event.offsetY));
	$(window).on("wheel",event=>{
		if(event.originalEvent.wheelDelta>0){
			scrollUp();
		}
		else{
			scrollDown();
		}
		$("#offset_info").text("offset = "+offsetWidth+" px");
	});
	app.ticker.add(dt=>mainLoop(dt));
}

let isStageChanged=false;
let bLengthPercentage=0;
function mainLoop(dt){
	if(!isStageChanged)return;
	bLengthPercentage+=dt/100;
	if(bLengthPercentage>1)bLengthPercentage=0;

	//renewBezier();
	render();
	isStageChanged=false;
}
//============== canvas operation ====================

function render(){
	polyGraph.clear();
	polyGraph.lineStyle(1.5,0xCC0000,1);
	polyGraph.drawShape(polygon);

	// polyGraph.lineStyle(1.5,0x880000,1);
	// let p0=vertices[0];
	// let p1=vertices[vertices.length-1];
	// polyGraph.moveTo(p1.x,p1.y);
	// polyGraph.lineTo(p0.x,p0.y);

	renderBezier();
	//renderPolygon(polyGraph);
}

function renderBezier(){
	let bezierPoints=bezierCurve.getPiecewiseInterpolation(Bezier.PRECISION);
	
	bezierGraph.clear();
	bezierGraph.lineStyle(2,0x00FF00,1);
	renderPointsOnGraphics(bezierPoints,bezierGraph);

	/*bezierGraph.lineStyle(1.5,0x0088FF,1);
	for(let i=0;i<bezierPoints.length;i++){
		let p=bezierPoints[i];
		bezierGraph.drawCircle(p.x,p.y,2);
	}*/

	let offsetPoints=bezierCurve.getOffsetSplinePoints(offsetWidth);
	bezierGraph.lineStyle(3,0xFF8800,1);
	renderPointsOnGraphics(offsetPoints,bezierGraph);

	$("#bezier_info").text(bezierPoints.length+" vertices on the bezier curve");
	$("#point_info").text(offsetPoints.length+" vertices on the offset curve");
}


/* Test! */
function renewBezier(){
	for(let i=0;i<vertices.length;i++){
		let c=vertices[i];
		setControlPoint(i,c.x+Math.random()*6-3,c.y+Math.random()*6-3);
	}
}

function renderPointsOnGraphics(pArr,g,x,y){
	if(x===undefined)x=0;
	if(y===undefined)y=pArr.length-1;
	x=posMod(x,pArr.length);
	y=posMod(y,pArr.length);
	if(x>=y)x-=pArr.length;

	let polyArray=[];
	for(let i=x;i<=y;i++){
		let j=i<0?i+pArr.length:i;
		let p=pArr[j];
		polyArray.push(p.x);
		polyArray.push(p.y);
	}
	let poly=new PIXI.Polygon(polyArray);
	g.drawShape(poly);
}

function renderPolygon(g){
	let poly=new Polygon(vertices);
	let insc=poly.calcIntersection();

	g.lineStyle(2,0x0000FF,1);
	/*for(let i=0;i<insc.point.length;i++){
		let p=insc.point[i];
		g.drawCircle(p.x,p.y,5);
	}*/

	
	let psList=poly.sortIntersection(insc.point,insc.id);
	let edgeList=poly.getLineSections(psList);
	if(edgeList.length){
		for(let i=0;i<edgeList.length;i++){
			if(edgeList[i].start!=edgeList[i].end)
				renderPointsOnGraphics(vertices,g,
					edgeList[i].start,edgeList[i].end);
		}
	}
	else{
		renderPointsOnGraphics(vertices,g);
	}

	
}

//================ event handler ==================

function setControlPoint(v,x,y){
	let circle=vertices[v];
	circle.x=x;
	circle.y=y;
	polygon.points[v*2]=x;
	polygon.points[v*2+1]=y;
	bezierCurve.setControlPoint(v,x,y);
	isStageChanged=true;
}

let nowVertex=null;
function mouseDown(x,y){
	let minDis2=Number.POSITIVE_INFINITY;
	for(let i=0;i<vertices.length;i++){
		let circle=vertices[i];
		let dx=x-circle.x;
		let dy=y-circle.y;
		let dis2=dx*dx+dy*dy;
		if(dis2<=4*circle.r*circle.r&&dis2<minDis2){
			minDis2=dis2;
			nowVertex=i;
		}
	}
	return false;
}

function mouseMove(x,y){
	if(nowVertex!==null){
		setControlPoint(nowVertex,x,y);
		isStageChanged=true;
	}
	return false;
}

function mouseUp(x,y){
	nowVertex=null;
	return false;
}

function scrollUp(){
	if(offsetWidth<500)offsetWidth++;
	isStageChanged=true;
	return false;
}

function scrollDown(){
	if(offsetWidth>1)offsetWidth--;
	isStageChanged=true;
	return false;
}