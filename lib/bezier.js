class Bezier{
	constructor(pointArr){
		this.points=new Array(pointArr.length);
		this.piecewisePoints=[];
		this.piecewiseLengths=[];
		this.piecewiseParams=[];
		this.piecewiseGradient=[];
		this.piecewiseRefreshed=false;
		pointArr.forEach((p,i)=>this.points[i]={x:p.x,y:p.y});
	}
	getOrder(){
		return this.points.length-1;
	}
	getPointAt(t){
		let tmp=new Array(this.points.length);
		for(let i=0;i<tmp.length;i++){
			tmp[i]={
				x:this.points[i].x,
				y:this.points[i].y
			};
		}
		for(let i=tmp.length-1;i>0;i--){
			for(let k=0;k<i;k++){
				tmp[k].x+=(tmp[k+1].x-tmp[k].x)*t;
				tmp[k].y+=(tmp[k+1].y-tmp[k].y)*t;
			}
		}
		return {x:tmp[0].x,y:tmp[0].y};
	}
	getGradientAt(t){
		let tmp=new Array(this.points.length-1);
		for(let i=0;i<tmp.length;i++){
			tmp[i]={
				x:this.points[i+1].x-this.points[i].x,
				y:this.points[i+1].y-this.points[i].y
			};
		}
		for(let i=tmp.length-1;i>0;i--){
			for(let k=0;k<i;k++){
				tmp[k].x+=(tmp[k+1].x-tmp[k].x)*t;
				tmp[k].y+=(tmp[k+1].y-tmp[k].y)*t;
			}
		}
		return {x:tmp[0].x*tmp.length,y:tmp[0].y*tmp.length};
	}
	getSecondDerivativeAt(t){
		let tmp=new Array(this.points.length-2);
		for(let i=0;i<tmp.length;i++){
			tmp[i]={
				x:this.points[i+2].x+this.points[i].x-2*this.points[i+1].x,
				y:this.points[i+2].y+this.points[i].y-2*this.points[i+1].y
			};
		}
		for(let i=tmp.length-1;i>0;i--){
			for(let k=0;k<i;k++){
				tmp[k].x+=(tmp[k+1].x-tmp[k].x)*t;
				tmp[k].y+=(tmp[k+1].y-tmp[k].y)*t;
			}
		}
		let r=tmp.length*(tmp.length+1);
		return {x:tmp[0].x*r,y:tmp[0].y*r};
	}
	getCurvatureRadiusAt(t,grad){ // Radius can be Negative: appears on the other side of the curve
		grad=grad||this.getGradientAt(t);
		let scdg=this.getSecondDerivativeAt(t);
		let n=grad.x*scdg.y-grad.y*scdg.x;
		let m=Math.sqrt(grad.x*grad.x+grad.y*grad.y);
		return m*m*m/n;
	}
	setControlPoint(v,x,y){
		this.points[v].x=x;
		this.points[v].y=y;
		this.piecewiseRefreshed=false;
	}
	getPiecewiseInterpolation(precision){
		if(this.piecewiseRefreshed){
			return this.piecewisePoints;
		}

		this.piecewiseRefreshed=true;
		// precision is the angle of line segment towards the center of curvature

		// Fixed step method
		let pArr=[{x:this.points[0].x,y:this.points[0].y}];
		this.piecewiseLengths=[0];
		this.piecewiseParams=[0];
		this.piecewiseGradient=[this.getGradientAt(0)];

		// Upper bound of the curve length
		let disUpperBound=this.getCurveLengthUpperBound();
		let step=precision/disUpperBound;
		let tSPrec=Bezier.LENGTH_COMPENSATION/(1/step+1)+1; // when the curve is short
		step/=tSPrec;

		for(let t=step,i=1;;t+=step,i++){
			if(t>1)t=1; // Draw Tail
			pArr[i]=this.getPointAt(t);
			this.piecewiseParams[i]=t;
			this.piecewiseLengths[i]=this.piecewiseLengths[i-1]+distance(pArr[i],pArr[i-1]);
			this.piecewiseGradient[i]=this.getGradientAt(t);
			if(t>=1){
				break;
			}
		}

		this.piecewisePoints=pArr;
		return pArr;
	}
	getCurveLength(t){
		if(t!=t)return Number.NaN; // NaN
		if(!this.piecewiseRefreshed){
			this.getPiecewiseInterpolation(Bezier.PRECISION);
		}
		if(t){
			if(t<0||t>1){
				return Number.NaN;
			}
			let params=this.piecewiseParams; // Binary Search
			let l=0,r=params.length-1;
			while(r-l>1){
				let mid=Math.floor((l+r)/2);
				let val=params[mid];
				if(val<t)l=mid;
				else r=mid;
			}
			let k=(t-params[l])/(params[r]-params[l]);
			let len=(this.piecewiseLengths[r]-this.piecewiseLengths[l])*k+this.piecewiseLengths[l];
			return len;
		}
		else{
			return this.piecewiseLengths[this.piecewiseLengths.length-1];
		}
	}
	getCurveLengthUpperBound(){
		// Just an approximation of length without integration
		const N=this.points.length;
		let tmp=new Array(N);
		for(let i=0;i<N;i++){
			tmp[i]={x:this.points[i].x,y:this.points[i].y};
		}
		let pL={x:this.points[0].x,y:this.points[0].y};
		let pR={x:this.points[N-1].x,y:this.points[N-1].y};

		let len=0;
		for(let i=N-1;i>0;i--){
			for(let k=0;k<i;k++){
				tmp[k].x+=(tmp[k+1].x-tmp[k].x)/2;
				tmp[k].y+=(tmp[k+1].y-tmp[k].y)/2;
			}
			// Clone L/R points
			let pLnew={x:tmp[0].x,y:tmp[0].y};
			let pRnew={x:tmp[i-1].x,y:tmp[i-1].y};
			len+=distance(pL,pLnew)+distance(pR,pRnew);
			pL=pLnew;pR=pRnew;
		}

		return len;
	}
	getParamAtLengthRatio(v){
		if(v!=v||v<0||v>1)return Number.NaN;
		let len=v*this.getCurveLength();

		let plen=this.piecewiseLengths;
		let l=0,r=plen.length-1;
		while(r-l>1){
			let mid=Math.floor((l+r)/2);
			let val=plen[mid];
			if(val<len)l=mid;
			else r=mid;
		}
		let k=(len-plen[l])/(plen[r]-plen[l]);
		let t=(this.piecewiseParams[r]-this.piecewiseParams[l])*k+this.piecewiseParams[l];
		return t;
	}
	getOffsetCurvePoints(offset){ // Need to deal with sharp corners
		// Positive offset on the right of the original curve
		let pArr=[];
		for(let i=0;i<this.piecewisePoints.length;i++){
			let p=this.piecewisePoints[i];
			let grad=this.piecewiseGradient[i];
			if(i>0){ // Check the angle between 2 lines
				/*let cv=this.getCurvatureRadiusAt(this.piecewiseParams[i],grad);
				if(cv>0&&cv<offset||cv<0&&cv>offset){
					continue; // vertex trimming
				}*/
				let p0=this.piecewisePoints[i-1];
				let grad0=this.piecewiseGradient[i-1];
				let aD=vecAngle(grad,grad0);
				if(Math.abs(aD)>0.1){ // Needs Intersection
					let intsc=sharpCurveFitting(p,grad,p0,grad0,offset);
					pArr=pArr.concat(intsc);
				}
			}
			let norm=Math.sqrt(grad.x*grad.x+grad.y*grad.y);
			let x=p.x-grad.y/norm*offset;
			let y=p.y+grad.x/norm*offset;
			pArr.push({x:x,y:y});
		}
		return pArr;
	}
	getOffsetSplinePoints(offset){
		let pArr1=this.getOffsetCurvePoints(offset);
		let pArr2=this.getOffsetCurvePoints(-offset);
		
		let grad1=this.piecewiseGradient[0];
		let grad2=this.piecewiseGradient[this.piecewiseGradient.length-1];
		let p1=this.points[0];
		let p2=this.points[this.points.length-1];
		let hat1=vertexHatR(p1,{x:-grad1.x,y:-grad1.y},grad1,offset);
		let hat2=vertexHatR(p2,grad2,{x:-grad2.x,y:-grad2.y},offset);

		// Combine the spline
		pArr2.reverse();
		let result=hat1.concat(pArr1,hat2,pArr2);
		result.push(result[0]); // close the curve
		return result;
	}
	getClosestPoint(p,lowerBound){
		if(!this.piecewiseRefreshed){
			this.getPiecewiseInterpolation(Bezier.PRECISION);
		}
		let pMin=null;
		let minDis=Number.POSITIVE_INFINITY;
		for(let i=0;i<this.piecewisePoints.length;i++){
			let dis=distance(p,this.piecewisePoints[i]);
			if(dis<minDis){
				minDis=dis;
				pMin=i;
			}
			if(minDis<lowerBound){
				break;
			}
		}
		return {dis:minDis,p:pMin};
	}
};
Bezier.PRECISION=30; // min distance in pixel
Bezier.LENGTH_COMPENSATION=8; // plotting compensation for short curve

//================ Tool functions for math ==============
function distance(p1,p2){
	const dx=p1.x-p2.x;
	const dy=p1.y-p2.y;
	return Math.sqrt(dx*dx+dy*dy);
}

function posMod(n,m){ // get positive n%m
	m=Math.abs(m);
	let k=n%m;
	if(k<0)k+=m;
	return k;
}

/*
	Calculate the intersection of vector p1->g1 & p2->g2
*/
function vecIntersection(p1,g1,p2,g2){ // get intersection point
	let t1=g2.x*(p2.y-p1.y)-g2.y*(p2.x-p1.x);
	let t2=g2.x*g1.y-g2.y*g1.x;
	let t=t1/t2;
	return {x:p1.x+t*g1.x,y:p1.y+t*g1.y};
}

function vecAngle(v1,v2){ // Calculate the angle v1 -> v2, (-Pi,Pi]
	let n1=Math.sqrt(v1.x*v1.x+v1.y*v1.y);
	let n2=Math.sqrt(v2.x*v2.x+v2.y*v2.y);
	let a=Math.acos((v1.x*v2.x+v1.y*v2.y)/(n1*n2));
	return v1.x*v2.y>v1.y*v2.x ? a : -a;
}

function isLineCrossed(p1,p2,q1,q2){
	// Cross Rect
	if(Math.min(p1.x,p2.x)>Math.max(q1.x,q2.x)
	|| Math.min(q1.x,q2.x)>Math.max(p1.x,p2.x)
	|| Math.min(p1.y,p2.y)>Math.max(q1.y,q2.y)
	|| Math.min(q1.y,q2.y)>Math.max(p1.y,p2.y)){
		return false;
	}

	// Intersection Point
	let gp={x:p2.x-p1.x,y:p2.y-p1.y};
	let gq={x:q2.x-q1.x,y:q2.y-q1.y};
	let pS=vecIntersection(p1,gp,q1,gq);

	// Check cross later
	return ((pS.x-p1.x)*(pS.x-p2.x)+(pS.y-p1.y)*(pS.y-p2.y)<=0
		&& (pS.x-q1.x)*(pS.x-q2.x)+(pS.y-q1.y)*(pS.y-q2.y)<=0);
}
//================ Tool functions for polygon construction ==========
/*
	Give the polygon forming an arc
	centerX, centerY, radiusStart, radiusEnd, angleStart, angleEnd, isClockwise
*/

function arcPoly(cx,cy,r1,r2,a1,a2,isClockwise){
	const MAXSTEP=0.2;
	const MINPOINT=3; // Minimum points on an arc

	let pArr=[];
	a1=posMod(a1,2*Math.PI);
	a2=posMod(a2,2*Math.PI);
	// Add condition: if start/end point too near: return[]
	let pStart={x:r1*Math.cos(a1),y:r1*Math.sin(a1)};
	let pEnd={x:r2*Math.cos(a2),y:r2*Math.sin(a2)};
	if(distance(pStart,pEnd)<5)return [];

	const PREC=Bezier.PRECISION;

	if(isClockwise){
		if(a2<=a1)a2+=2*Math.PI;
		let pointNum=(a2-a1)*(r1+r2)/PREC; // how many points
		if(pointNum<MINPOINT)pointNum=MINPOINT;
		let step=(a2-a1)/pointNum; // at least this many steps
		if(step>MAXSTEP)step=MAXSTEP;

		for(let a=a1;a<=a2;a+=step){
			let k=(a-a1)/(a2-a1);
			let r=(r2-r1)*k+r1;
			pArr.push({ // Can be refined by triangular formula
				x:cx+r*Math.cos(a),
				y:cy+r*Math.sin(a)
			});
		}
	}
	else{
		if(a2>=a1)a2-=2*Math.PI;
		let pointNum=(a1-a2)*(r1+r2)/PREC; // how many points
		if(pointNum<MINPOINT)pointNum=MINPOINT;
		let step=(a1-a2)/pointNum; // at least this many steps
		if(step>MAXSTEP)step=MAXSTEP;

		for(let a=a1;a>=a2;a-=step){
			let k=(a-a1)/(a2-a1);
			let r=(r2-r1)*k+r1;
			pArr.push({
				x:cx+r*Math.cos(a),
				y:cy+r*Math.sin(a)
			});
		}
	}
	return pArr;
}

/*
	Create a hat fitting the offset curve from p1->g1 to p2->g2
*/
function sharpCurveFitting(p1,grad1,p2,grad2,offset){
	// Positive offset on the right

	let norm1=Math.sqrt(grad1.x*grad1.x+grad1.y*grad1.y);
	let norm2=Math.sqrt(grad2.x*grad2.x+grad2.y*grad2.y);
	let c1={x:-grad1.y/norm1*offset,y:grad1.x/norm1*offset};
	let c2={x:-grad2.y/norm2*offset,y:grad2.x/norm2*offset};
	let s1={x:p1.x+c1.x,y:p1.y+c1.y};
	let s2={x:p2.x+c2.x,y:p2.y+c2.y};

	if(distance(s1,s2)<5){
		// not even half a circle
		return [];
	}

	let pC={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2}; // mid point
	let pG=vecIntersection(p1,c1,p2,c2);
	let k=Math.abs(vecAngle(grad1,grad2))/Math.PI;
	let pD={x:(pC.x-pG.x)*k+pG.x,y:(pC.y-pG.y)*k+pG.y}; // curve center

	let v1x=s1.x-pD.x,v1y=s1.y-pD.y;
	let v2x=s2.x-pD.x,v2y=s2.y-pD.y;

	let r1=Math.sqrt(v1x*v1x+v1y*v1y);
	let r2=Math.sqrt(v2x*v2x+v2y*v2y);
	let aS1=Math.atan2(v1y,v1x);
	let aS2=Math.atan2(v2y,v2x);
	let cross=v1x*v2y-v1y*v2x;
	pArr=arcPoly(pD.x,pD.y,r2,r1,aS2,aS1,cross<0);
	pArr.shift();
	pArr.pop();
	return pArr;
}

/*
	Create a hat at turning cornet p (vertex p)
	from direction g1 to g2 with radius r.
	
	The hat is on the right side of the curve.
	If left side, call vertexHatR(p,-g2,-g1,r)
*/
function vertexHatR(p,g1,g2,r){
	if(g1.x*g2.y-g1.y*g2.x>0){ // No hat on the right
		return [];
	}
	let a1=Math.atan2(g1.y,g1.x)+Math.PI/2;
	let a2=Math.atan2(g2.y,g2.x)+Math.PI/2;
	let hatPoints=arcPoly(p.x,p.y,r,r,a1,a2,false);

	// delete two end points
	if(hatPoints.length)hatPoints.shift();
	if(hatPoints.length)hatPoints.pop();
	return hatPoints;
}