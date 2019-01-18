class Polygon{ // A closed polygon, vertex in counter-clockwise order
	/*
		There must be a exterior ring of the polygon.
		The ring must be visited counter-clockwise
	*/

	constructor(pointArr){
		this.N=pointArr.length;
		this.vertex=new Array(this.N);
		//this.insIndex=null; // the points where edges cross itself
		//this.insDir=null; // the direction (L/R) of the cross
		pointArr.forEach((p,i)=>this.vertex[i]={x:p.x,y:p.y});
	}
	calcIntersection(){ // detect where the edge crosses
		// newIndex is an array containing {first:id1,second:id2}
		// for one intersection, vertex[id1] is visited before vertex[id2]
		let newVertex=[];
		let newIndex=[];
		for(let i=2;i<this.N;i++){ // line 1 won't cross 0
			let j=(i+1==this.N?0:i+1);
			for(let k=0;k<=i-2;k++){
				if(j==k)continue; // make sure i,j,k,l are all different
				let l=k+1; // k won't be this.N-1
				let p=PMath.lineIntersection(
					this.vertex[i],this.vertex[j],
					this.vertex[k],this.vertex[l]
				);
				if(p){ // intersects
					newVertex.push(p);
					newIndex.push({first:k,second:i});
				}
			}
		}
		return {point:newVertex,id:newIndex};
	}
	sortIntersection(vArr,idArr){
		// Returns a list: [{id, pList}, ...]
		// The pList is on the line vertex[id]~vertex[id+1]
		// pList: [{point, crossId}, ...]
		// point is the coordinate,
		// which is on line vertex[id]~vertex[id+1]
		// & line vertex[crossId]~vertex[crossId+1]
		// point in pList is arranged in ascending order of dis to vertex[id]

		let idList=[]; // contains the points with a following cross point
		for(let i=0;i<vArr.length;i++){
			// insert vArr[i] on line idArr[i].first & second
			let idItem=idArr[i];

			let v1=this.vertex[idItem.first];
			let k1;
			for(k1=0;k1<idList.length;k1++){
				if(idList[k1].id==idItem.first){
					break; // found vertex[first] in list
				}
			}
			if(k1<idList.length){ // line id already add in the list
				let pList=idList[k1].pList;
				let pMDis=PMath.mDis(v1,vArr[i]);
				let j; // index of where this point should place
				for(j=0;j<pList.length;j++){
					let pTmp=pList[j].point;
					if(PMath.mDis(v1,pTmp)>=pMDis){
						break; // Insert here
					}
				}
				pList.splice(j,0,{point:vArr[i],crossId:idItem.second});
			}
			else{ // not existing yet, add the key
				idList.push({
					id:idItem.first,
					pList:[{
						point:vArr[i],
						crossId:idItem.second
					}]
				});
			}

			let v2=this.vertex[idItem.second];
			let k2;
			for(k2=0;k2<idList.length;k2++){
				if(idList[k2].id==idItem.second){
					break; // found vertex[second] in list
				}
			}
			if(k2<idList.length){ // line id already add in the list
				let pList=idList[k2].pList;
				let pMDis=PMath.mDis(v2,vArr[i]);
				let j; // index of where this point should place
				for(j=0;j<pList.length;j++){
					let pTmp=pList[j].point;
					if(PMath.mDis(v2,pTmp)>=pMDis){
						break; // Insert here
					}
				}
				pList.splice(j,0,{point:vArr[i],crossId:idItem.first});
			}
			else{ // not existing yet, add the key
				idList.push({
					id:idItem.second,
					pList:[{
						point:vArr[i],
						crossId:idItem.first
					}]
				});
			}
		}
		return idList;
	}

	getLineSections(cpList){
		if(cpList.length==0){ // no need to split
			return [];
		}
		// get a topological graph of the polygon
		let cpLIdList=new Array(this.N); // reverse index list
		for(let i=0;i<this.N;i++){
			cpLIdList[i]=null;
		}
		for(let i=0;i<cpList.length;i++){
			cpLIdList[cpList[i].id]=i;
		}
		
		let edgeList=[];
		let nowPoint=0;
		for(let i=0;i<this.N;i++){
			if(cpLIdList[i]!==null){ // an intersection on i ~ i+1
				edgeList.push({start:nowPoint,end:i});
				nowPoint=i+1;
			}
		}
		if(nowPoint<this.N){ // connect the last section with the first
			edgeList[0].start=nowPoint;
		}
		return edgeList;
	}

	extendIntersection(){ // extend the vertices including the intersections
		
	}

	reduceVertex(){ // reduce the vertex but keep its shape
		// now use greedy algorithm
		// effect not good enough
		const ANGLE_THRESHOLD=0.05;
		const DIS_THRESHOLD=5; // reduce when angle < pi/2
		let tomb=new Array(this.N);
		for(let i=0;i<this.N;i++)tomb[i]=false;

		for(let i=0;i<this.N-2;i++)if(!tomb[i]){ // Window size = 2
			const j=i+1,k=i+2;
			// angle reduce first
			const v1=PMath.vecTo(this.vertex[i],this.vertex[j]);
			const v2=PMath.vecTo(this.vertex[j],this.vertex[k]);
			const v3=PMath.vecTo(this.vertex[i],this.vertex[k]);
			const theta=PMath.angle(v1,v2);
			if(theta<ANGLE_THRESHOLD||theta<Math.PI/2&&PMath.norm(v3)<DIS_THRESHOLD){
				// Too short or too flat
				tomb[j]=true;
			}
		}
		
		let newVertex=[];
		for(let i=0;i<this.N;i++)if(!tomb[i]){
			newVertex.push(this.vertex[i]);
		}
		this.N=newVertex.length;
		this.vertex=newVertex;
		//this.insIndex=null;
		//this.insDir=null;
	}

}

//==================== Math Tools =====================
let PMath={};

/*
	Check if line segment p1~p2 intersect with q1~q2
	If true, return the intersection
	{x:xCoord, y:yCoord, dir:+1 for q1~q2 crosses from the right, -1 elsewise}
	Line segment includes p1,q1, excludes p2,q2
 */
PMath.lineIntersection=function(p1,p2,q1,q2){
	// Cross Rect
	if(Math.min(p1.x,p2.x)>Math.max(q1.x,q2.x)
	|| Math.min(q1.x,q2.x)>Math.max(p1.x,p2.x)
	|| Math.min(p1.y,p2.y)>Math.max(q1.y,q2.y)
	|| Math.min(q1.y,q2.y)>Math.max(p1.y,p2.y)){
		return null;
	}

	// Intersection Point
	let g1=PMath.vecTo(p1,p2);
	let g2=PMath.vecTo(q1,q2);
	let t1=g2.x*(q1.y-p1.y)-g2.y*(q1.x-p1.x);
	let t2=g2.x*g1.y-g2.y*g1.x;
	let t=t1/t2;
	let pS={x:p1.x+t*g1.x,y:p1.y+t*g1.y};

	// Check cross later
	if(PMath.dot(PMath.vecTo(pS,p1),PMath.vecTo(pS,p2))<=0
	&& PMath.dot(PMath.vecTo(pS,q1),PMath.vecTo(pS,q2))<=0){
		return pS;
	}
	else{ // not on both intersections
		return null;
	}
}

// Useful Functions

PMath.dot=(v1,v2)=>v1.x*v2.x+v1.y*v2.y;
PMath.cross=(v1,v2)=>v1.x*v2.y-v1.y*v2.x;
PMath.vecTo=(v1,v2)=>({x:v2.x-v1.x,y:v2.y-v1.y});
PMath.norm=v1=>Math.sqrt(v1.x*v1.x+v1.y*v1.y);
PMath.angle=(v1,v2)=>{
	let n1=PMath.norm(v1);
	let n2=PMath.norm(v2);
	let a=Math.acos(PMath.dot(v1,v2)/(n1*n2));
	return PMath.cross(v1,v2)>0 ? a : -a;
};
PMath.dis=(v1,v2)=>PMath.norm(PMath.vecTo(v1,v2));
PMath.mDis=(v1,v2)=>(Math.abs(v2.x-v1.x)+Math.abs(v2.y-v1.y)); // Manhattan Dis
