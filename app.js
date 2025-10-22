// Canvas Studio v7 — Fill style equalized, default color black, stronger mobile layout
const ADMIN_PASSWORD = "5023";

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function fillInitialBackground() {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  ctx.restore();
}
fillInitialBackground();

let isDrawing = false;
let tool = 'airbrush';
let color = document.getElementById('colorPicker').value; // now #000000
let alpha = parseFloat(document.getElementById('alphaRange').value);
let size = parseInt(document.getElementById('sizeRange').value, 10);
let fillShape = document.getElementById('fillShape').checked;

let lastX = 0, lastY = 0, lastT = performance.now();
let startX = 0, startY = 0;
let snapshot = null;
let isAdmin = false;

const statusTool = document.getElementById('statusTool');
const statusColor = document.getElementById('statusColor');
const statusSize  = document.getElementById('statusSize');
const statusAlpha = document.getElementById('statusAlpha');
function updateStatus(){
  statusTool.textContent = '도구: ' + toolName(tool);
  statusColor.textContent = '색상: ' + color;
  statusSize.textContent  = '두께: ' + size + 'px';
  statusAlpha.textContent = '투명도: ' + alpha.toFixed(2);
}
function toolName(k){
  const map = {airbrush:'에어브러시',calligraphy:'캘리그래피',dotted:'점묘',splatter:'스플래터',glow:'글로우',crayon:'크레용',chalk:'초크',hatch:'해칭',eraser:'지우개',line:'직선',rect:'사각형',circle:'원',star:'별',arrow:'화살표'};
  return map[k]||k;
}
updateStatus();

function takeSnapshot(){ snapshot = ctx.getImageData(0,0,canvas.width, canvas.height); }
function restoreSnapshot(){ if(snapshot) ctx.putImageData(snapshot,0,0); }
function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1, y2-y1); }

function getPos(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return {x, y};
}

function setCommon(){
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
}

function startDraw(e){
  isDrawing = true;
  const {x, y} = getPos(e);
  lastX = startX = x; lastY = startY = y;
  lastT = performance.now();
  setCommon();

  if(['line','rect','circle','star','heart','arrow'].includes(tool)){
    takeSnapshot();
  }else{
    if(['airbrush','dotted','splatter'].includes(tool)){
      drawByTool(x,y,true);
    }else{
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }
  e.preventDefault();
}

function moveDraw(e){
  if(!isDrawing) return;
  const {x, y} = getPos(e);

  if(['line','rect','circle','star','heart','arrow'].includes(tool)){
    restoreSnapshot();
    setCommon();
    ctx.lineWidth = size;

    if(tool==='line'){
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }else if(tool==='rect'){
      const w = x - startX, h = y - startY;
      if(document.getElementById('fillShape').checked){
        ctx.fillRect(startX, startY, w, h);
      }else{
        ctx.strokeRect(startX, startY, w, h);
      }
    }else if(tool==='circle'){
      const r = dist(startX, startY, x, y);
      ctx.beginPath();
      ctx.arc(startX, startY, r, 0, Math.PI*2);
      if(document.getElementById('fillShape').checked){
        ctx.fill();
      }else{
        ctx.stroke();
      }
    }else if(tool==='star'){
      drawStarPreview(startX, startY, x, y);
    }else if(tool==='arrow'){
      drawArrowPreview(startX, startY, x, y);
    }
  }else{
    drawByTool(x, y, false);
  }
  lastX = x; lastY = y; lastT = performance.now();
  e.preventDefault();
}

function endDraw(e){
  if(!isDrawing) return;
  isDrawing = false;
  e.preventDefault();
}

// ==== Shapes ====
function drawStarPath(cx, cy, rOuter, rInner, points=5){
  const step = Math.PI / points;
  ctx.beginPath();
  for(let i=0;i<2*points;i++){
    const r = (i % 2 === 0) ? rOuter : rInner;
    const a = -Math.PI/2 + i*step;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
}
function drawStarPreview(x1,y1,x2,y2){
  const rOuter = dist(x1,y1,x2,y2);
  const rInner = rOuter * 0.5;
  drawStarPath(x1,y1,rOuter,rInner,5);
  if(document.getElementById('fillShape').checked){ ctx.fill(); } else { ctx.stroke(); }
}






// Soft, rounded heart with shallow notch and true rounded tip (arc)
// Fill or stroke preview with gentle glossy gradient when filled
function drawArrowPreview(x1,y1,x2,y2){
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(12, size*2);
  const a1 = angle + Math.PI * 0.85;
  const a2 = angle - Math.PI * 0.85;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 + Math.cos(a1)*headLen, y2 + Math.sin(a1)*headLen);
  ctx.lineTo(x2 + Math.cos(a2)*headLen, y2 + Math.sin(a2)*headLen);
  ctx.closePath();
  if(document.getElementById('fillShape').checked){ ctx.fill(); } else { ctx.stroke(); }
}

// ==== Brushes ====
function drawByTool(x, y, isStart){
  if(tool==='eraser'){
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(10, size * 1.4);
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  setCommon();

  switch(tool){
    case 'airbrush': {
      const radius = Math.max(8, size * 1.3);
      const dots = Math.ceil(radius * 1.0);
      for(let i=0;i<dots;i++){
        const r = radius * Math.sqrt(Math.random());
        const t = Math.random()*Math.PI*2;
        const dx = x + r*Math.cos(t);
        const dy = y + r*Math.sin(t);
        ctx.globalAlpha = Math.min(0.35, alpha*0.5);
        ctx.fillRect(dx, dy, 1.4, 1.4);
      }
      break;
    }
    case 'calligraphy': {
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      const angle = Math.atan2(y - lastY, x - lastX) + (20 * Math.PI/180);
      const w = Math.max(3, size * 1.3);
      const dx = Math.cos(angle) * w;
      const dy = Math.sin(angle) * w;
      ctx.beginPath();
      ctx.moveTo(lastX - dx, lastY - dy);
      ctx.lineTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.lineTo(lastX + dx, lastY + dy);
      ctx.closePath();
      ctx.globalAlpha = Math.max(0.9, alpha);
      ctx.fill();
      break;
    }
    case 'dotted': {
      const step = Math.max(4, size*1.1);
      if(Math.hypot(x-lastX,y-lastY) >= step || isStart){
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, size*0.7), 0, Math.PI*2);
        ctx.globalAlpha = Math.max(0.9, alpha);
        ctx.fill();
      }
      break;
    }
    case 'splatter': {
      const drops = Math.ceil(Math.max(6, size*0.9));
      for(let i=0;i<drops;i++){
        const r = Math.random()*size*0.9 + 1;
        const ang = Math.random()*Math.PI*2;
        const rr = Math.random()*size*1.6;
        ctx.globalAlpha = Math.min(alpha, 0.75) * (0.5 + Math.random()*0.5);
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang)*rr, y + Math.sin(ang)*rr, r, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }
    case 'glow': {
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(12, size*1.8);
      ctx.globalAlpha = Math.min(0.85, alpha);
      ctx.lineWidth = Math.max(4, size*1.2);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = Math.min(0.8, alpha);
      ctx.lineWidth = Math.max(2, size*0.7);
      ctx.lineTo(x, y);
      ctx.stroke();
      break;
    }
    case 'crayon': {
      ctx.globalAlpha = Math.min(0.95, alpha);
      ctx.lineWidth = Math.max(3, size*0.9);
      ctx.setLineDash([6, 3]);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      for(let i=0;i<3;i++){
        ctx.globalAlpha = Math.min(0.9, alpha);
        ctx.fillRect(x+(Math.random()-0.5)*2.2, y+(Math.random()-0.5)*2.2, 1, 1);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      for(let i=0;i<2;i++){
        ctx.fillRect(x+(Math.random()-0.5)*2.2, y+(Math.random()-0.5)*2.2, 1, 1);
      }
      ctx.restore();
      break;
    }
    case 'chalk': {
      ctx.globalAlpha = Math.min(0.6, alpha*0.7);
      ctx.lineWidth = Math.max(4, size*1.2);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      for(let i=0;i<4;i++){
        const ang = Math.random()*Math.PI*2;
        const rr = Math.random()*3.0;
        ctx.fillRect(x+Math.cos(ang)*rr, y+Math.sin(ang)*rr, 1, 1);
      }
      ctx.restore();
      break;
    }
    case 'hatch': {
      const step = Math.max(8, size*1.2);
      if(Math.hypot(x-lastX,y-lastY) >= step){
        const angle = Math.atan2(y-lastY, x-lastX) + Math.PI/2;
        const half = Math.max(3, size);
        const hx = Math.cos(angle) * half;
        const hy = Math.sin(angle) * half;
        ctx.beginPath();
        ctx.moveTo(x - hx, y - hy);
        ctx.lineTo(x + hx, y + hy);
        ctx.globalAlpha = Math.min(0.9, alpha);
        ctx.lineWidth = Math.max(2, size*0.8);
        ctx.stroke();
      }
      break;
    }
    default: {
      ctx.lineWidth = size;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}

// Events
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', startDraw, {passive:false});
canvas.addEventListener('touchmove', moveDraw, {passive:false});
canvas.addEventListener('touchend', endDraw);

// UI
document.querySelectorAll('input[name="tool"]').forEach(r=>{
  r.addEventListener('change', e=>{ tool = e.target.value; ctx.beginPath(); updateStatus(); });
});
document.getElementById('colorPicker').addEventListener('input', e=>{ color = e.target.value; updateStatus(); });
document.getElementById('alphaRange').addEventListener('input', e=>{ alpha = parseFloat(e.target.value); updateStatus(); });
const sizeEcho = document.getElementById('sizeEcho');
document.getElementById('sizeRange').addEventListener('input', e=>{
  size = parseInt(e.target.value,10);
  sizeEcho.textContent = size + " px";
  updateStatus();
});
document.getElementById('fillShape').addEventListener('change', e=>{ fillShape = e.target.checked; });

// Admin
const adminBtn = document.getElementById('adminBtn');
const resetBtn = document.getElementById('resetBtn');
resetBtn.hidden = true;

adminBtn.addEventListener('click', ()=>{
  if(isAdmin){
    isAdmin = false;
    resetBtn.hidden = true;
    adminBtn.textContent = '관리자 모드';
  }else{
    const pw = prompt('관리자 비밀번호를 입력하세요:');
    if(pw === ADMIN_PASSWORD){
      isAdmin = true;
      resetBtn.hidden = false;
      adminBtn.textContent = '관리자 모드 (ON)';
    }else if(pw !== null){
      alert('비밀번호가 올바르지 않습니다.');
    }
  }
});

resetBtn.addEventListener('click', ()=>{
  if(!isAdmin) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0,0,canvas.width, canvas.height);
  fillInitialBackground();
  ctx.restore();
  alert('캔버스를 초기화했습니다.');
});

/* === Realtime Sync (non-invasive) === */
(function(){
  try{
    if(!window.FIREBASE_CONFIG || !window.firebase){ console.warn('[CanvasStudio] Firebase missing.'); return; }
    firebase.initializeApp(window.FIREBASE_CONFIG);
    const db = firebase.database();
    console.log('[CanvasStudio] Firebase RTDB ready');

    // Room id
    const ROOM = new URLSearchParams(location.search).get('room') || '1';
    const opsRef = db.ref('rooms/'+ROOM+'/ops');
    const clientId = Math.random().toString(36).slice(2);

    const canvas = document.getElementById('board');
    if(!canvas){ console.warn('[CanvasStudio] no canvas#board'); return; }
    const ctx = canvas.getContext('2d');

    function getState(){
      const colorEl = document.getElementById('colorPicker');
      const alphaEl = document.getElementById('alphaRange');
      const sizeEl  = document.getElementById('sizeRange');
      const fillEl  = document.getElementById('fillShape');
      return {
        color: colorEl ? colorEl.value : '#000000',
        alpha: alphaEl ? parseFloat(alphaEl.value) : 1.0,
        size : sizeEl  ? parseInt(sizeEl.value,10) : 12,
        fill : fillEl  ? !!fillEl.checked : false
      };
    }

    const _move = window.moveDraw;
    const _end  = window.endDraw;

    let toolVal = (document.querySelector('input[name="tool"]:checked')||{}).value || 'airbrush';
    document.querySelectorAll('input[name="tool"]').forEach(r=>r.addEventListener('change', e=>toolVal=e.target.value));

    function emitPath(from,to){
      const s = getState();
      opsRef.push({kind:'path', tool: toolVal, from, to, ...s, clientId, ts: Date.now()});
    }
    function emitShape(shape,x1,y1,x2,y2){
      const s = getState();
      opsRef.push({kind:'shape', shape, x1,y1,x2,y2, fill:s.fill, color:s.color, alpha:s.alpha, size:s.size, clientId, ts: Date.now()});
    }

    function applyOp(op){
      if(!op || op.clientId===clientId) return;
      const color = op.color || '#000';
      const size  = op.size  || 12;
      const alpha = (typeof op.alpha==='number') ? op.alpha : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      if(op.kind==='path'){
        ctx.globalCompositeOperation = (op.tool==='eraser') ? 'destination-out' : 'source-over';
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(op.from.x, op.from.y);
        ctx.lineTo(op.to.x, op.to.y);
        ctx.stroke();
      }else if(op.kind==='shape'){
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = size;
        if(op.shape==='line'){
          ctx.beginPath(); ctx.moveTo(op.x1,op.y1); ctx.lineTo(op.x2,op.y2); ctx.stroke();
        }else if(op.shape==='rect'){
          const w=op.x2-op.x1, h=op.y2-op.y1;
          if(op.fill) ctx.fillRect(op.x1,op.y1,w,h); else ctx.strokeRect(op.x1,op.y1,w,h);
        }else if(op.shape==='circle'){
          const r=Math.hypot(op.x2-op.x1,op.y2-op.y1);
          ctx.beginPath(); ctx.arc(op.x1,op.y1,r,0,Math.PI*2);
          if(op.fill) ctx.fill(); else ctx.stroke();
        }else if(op.shape==='star'){
          const rO=Math.hypot(op.x2-op.x1,op.y2-op.y1), rI=rO*0.5;
          ctx.beginPath(); const step=Math.PI/5;
          for(let i=0;i<10;i++){ const r=(i%2===0)?rO:rI; const a=-Math.PI/2+i*step; const x=op.x1+r*Math.cos(a); const y=op.y1+r*Math.sin(a); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
          ctx.closePath(); if(op.fill) ctx.fill(); else ctx.stroke();
        }else if(op.shape==='arrow'){
          ctx.beginPath(); ctx.moveTo(op.x1,op.y1); ctx.lineTo(op.x2,op.y2); ctx.stroke();
          const ang=Math.atan2(op.y2-op.y1,op.x2-op.x1); const head=Math.max(12,size*2);
          const a1=ang+Math.PI*0.85, a2=ang-Math.PI*0.85;
          ctx.beginPath(); ctx.moveTo(op.x2,op.y2);
          ctx.lineTo(op.x2+Math.cos(a1)*head, op.y2+Math.sin(a1)*head);
          ctx.lineTo(op.x2+Math.cos(a2)*head, op.y2+Math.sin(a2)*head);
          ctx.closePath(); if(op.fill) ctx.fill(); else ctx.stroke();
        }
      }else if(op.kind==='clear'){
        ctx.globalCompositeOperation='source-over';
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      ctx.restore();
    }

    opsRef.on('child_added', snap=>applyOp(snap.val()));

    if(typeof _move==='function'){
      window.moveDraw = function(e){
        const prev = (window.lastX!=null && window.lastY!=null) ? {x:window.lastX, y:window.lastY} : null;
        _move.call(this,e);
        try{
          if(prev && (window.isDrawing || (e.buttons&1))) {
            const rect=canvas.getBoundingClientRect();
            const clientX = e.touches?e.touches[0].clientX:e.clientX;
            const clientY = e.touches?e.touches[0].clientY:e.clientY;
            const x = (clientX - rect.left) * (canvas.width/rect.width);
            const y = (clientY - rect.top)  * (canvas.height/rect.height);
            emitPath(prev,{x,y});
          }
        }catch(err){ console.warn('[CanvasStudio] emit path fail', err); }
      };
    }
    if(typeof _end==='function'){
      window.endDraw = function(e){
        try{
          const tool = (document.querySelector('input[name="tool"]:checked')||{}).value;
          if(['line','rect','circle','star','arrow'].includes(tool) &&
            window.startX!=null && window.startY!=null && window.lastX!=null && window.lastY!=null){
            emitShape(tool, window.startX, window.startY, window.lastX, window.lastY);
          }
        }catch(err){ console.warn('[CanvasStudio] emit shape fail', err); }
        _end.call(this,e);
      };
    }

    const resetBtn = document.getElementById('resetBtn');
    if(resetBtn){
      resetBtn.addEventListener('click', () => opsRef.push({kind:'clear', clientId, ts:Date.now()}));
    }
  }catch(e){
    console.warn('[CanvasStudio] Realtime wrapper error', e);
  }
})();
