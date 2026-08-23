// One-maze overlay visualizer for the A* vs Dijkstra article.
(() => {
  const canvas=document.querySelector("#single-grid-canvas");
  const newButton=document.querySelector("#single-grid-new");
  const runButton=document.querySelector("#single-grid-run");
  if(!canvas||!newButton||!runButton)return;
  const stats={astar:document.querySelector("#single-grid-astar"),dijkstra:document.querySelector("#single-grid-dijkstra"),path:document.querySelector("#single-grid-path")};
  const COLS=19,ROWS=8,TOTAL=COLS*ROWS,N=1,E=2,S=4,W=8,VISITED=16;
  const directions=[{dx:0,dy:-1,path:N,opposite:S},{dx:1,dy:0,path:E,opposite:W},{dx:0,dy:1,path:S,opposite:N},{dx:-1,dy:0,path:W,opposite:E}];
  const point=index=>({x:index%COLS,y:Math.floor(index/COLS)});
  const indexOf=(x,y)=>y*COLS+x;
  let maze=[],comparison=null,animation=0,running=false;

  function generate(){
    const cells=new Uint8Array(TOTAL),stack=[Math.floor(Math.random()*TOTAL)];cells[stack[0]]|=VISITED;
    while(stack.length){
      const current=stack[stack.length-1],{x,y}=point(current);
      const options=directions.filter(({dx,dy})=>{const nx=x+dx,ny=y+dy;return nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!(cells[indexOf(nx,ny)]&VISITED);});
      if(!options.length){stack.pop();continue;}
      const direction=options[Math.floor(Math.random()*options.length)],next=indexOf(x+direction.dx,y+direction.dy);
      cells[current]|=direction.path;cells[next]|=direction.opposite|VISITED;stack.push(next);
    }
    for(let count=0;count<Math.floor(TOTAL/8);count+=1){
      if(Math.random()<.5){const x=Math.floor(Math.random()*(COLS-1)),y=Math.floor(Math.random()*ROWS);cells[indexOf(x,y)]|=E;cells[indexOf(x+1,y)]|=W;}
      else{const x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*(ROWS-1));cells[indexOf(x,y)]|=S;cells[indexOf(x,y+1)]|=N;}
    }
    return Array.from(cells);
  }
  function neighbours(cells,node){const{x,y}=point(node),result=[];if((cells[node]&N)&&y>0)result.push(node-COLS);if((cells[node]&E)&&x<COLS-1)result.push(node+1);if((cells[node]&S)&&y<ROWS-1)result.push(node+COLS);if((cells[node]&W)&&x>0)result.push(node-1);return result;}
  function solve(cells,useHeuristic){
    const goal=TOTAL-1,distance=new Float64Array(TOTAL).fill(Infinity),previous=new Int32Array(TOTAL).fill(-1),closed=new Uint8Array(TOTAL),open=[{index:0,priority:0}],visited=[];distance[0]=0;
    while(open.length){open.sort((a,b)=>a.priority-b.priority);const current=open.shift().index;if(closed[current])continue;closed[current]=1;visited.push(current);if(current===goal)break;for(const next of neighbours(cells,current)){if(closed[next])continue;const candidate=distance[current]+1;if(candidate>=distance[next])continue;distance[next]=candidate;previous[next]=current;const{x,y}=point(next),heuristic=useHeuristic?(COLS-1-x)+(ROWS-1-y):0;open.push({index:next,priority:candidate+heuristic});}}
    const path=[];for(let cursor=goal;cursor!==-1;cursor=previous[cursor])path.push(cursor);path.reverse();return{visited,path};
  }
  function sizeCanvas(){const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.width*(ROWS/COLS)*ratio);return{width:rect.width,height:rect.width*(ROWS/COLS),ratio};}
  function draw(visible=0,finished=false){
    const{width,height,ratio}=sizeCanvas(),ctx=canvas.getContext("2d"),cellW=width/COLS,cellH=height/ROWS;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle="#0b0c0b";ctx.fillRect(0,0,width,height);
    if(comparison){
      const radius=Math.max(1.8,Math.min(cellW,cellH)*.11);
      const paintVisited=(nodes,color,offset)=>{ctx.fillStyle=color;nodes.slice(0,visible).forEach(index=>{const{x,y}=point(index);ctx.beginPath();ctx.arc((x+.5)*cellW+offset,(y+.5)*cellH,radius,0,Math.PI*2);ctx.fill();});};
      paintVisited(comparison.astar.visited,"rgba(72,181,255,.78)",-cellW*.13);paintVisited(comparison.dijkstra.visited,"rgba(255,84,196,.72)",cellW*.13);
      if(finished){const paintPath=(path,color,offset)=>{ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,cellW*.12);ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();path.forEach((index,position)=>{const{x,y}=point(index),px=(x+.5)*cellW+offset,py=(y+.5)*cellH+offset;if(!position)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.stroke();};paintPath(comparison.astar.path,"#57d9ff",-cellW*.09);paintPath(comparison.dijkstra.path,"#ffd35c",cellW*.09);}
    }
    ctx.strokeStyle="rgba(241,240,233,.58)";ctx.lineWidth=1;ctx.beginPath();maze.forEach((paths,index)=>{const{x,y}=point(index),left=x*cellW,top=y*cellH,right=left+cellW,bottom=top+cellH;if(!(paths&N)){ctx.moveTo(left,top);ctx.lineTo(right,top);}if(!(paths&E)){ctx.moveTo(right,top);ctx.lineTo(right,bottom);}if(!(paths&S)){ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);}if(!(paths&W)){ctx.moveTo(left,top);ctx.lineTo(left,bottom);}});ctx.stroke();
    [0,TOTAL-1].forEach((index,position)=>{const{x,y}=point(index);ctx.fillStyle=position?"#f1f0e9":"#c9ff4a";ctx.beginPath();ctx.arc((x+.5)*cellW,(y+.5)*cellH,Math.max(3,cellW*.17),0,Math.PI*2);ctx.fill();});
  }
  function reset(){cancelAnimationFrame(animation);running=false;runButton.disabled=false;runButton.textContent="Run both";maze=generate();comparison=null;Object.values(stats).forEach(node=>node.textContent="—");draw();}
  function run(){if(running)return;comparison={astar:solve(maze,true),dijkstra:solve(maze,false)};const maximum=Math.max(comparison.astar.visited.length,comparison.dijkstra.visited.length);stats.astar.textContent=comparison.astar.visited.length;stats.dijkstra.textContent=comparison.dijkstra.visited.length;stats.path.textContent=(comparison.astar.path.length-1)+" steps";if(matchMedia("(prefers-reduced-motion: reduce)").matches){draw(maximum,true);return;}running=true;runButton.disabled=true;runButton.textContent="Searching…";const started=performance.now();const frame=time=>{const visible=Math.floor((time-started)/20);draw(visible,false);if(visible>=maximum+8){draw(maximum,true);running=false;runButton.disabled=false;runButton.textContent="Run both";}else animation=requestAnimationFrame(frame);};animation=requestAnimationFrame(frame);}
  newButton.addEventListener("click",reset);runButton.addEventListener("click",run);addEventListener("resize",()=>draw(comparison?Infinity:0,Boolean(comparison)));reset();
})();
