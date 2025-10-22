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
let tool = 'pencil';
let color = document.getElementById('colorPicker').value; // now #000000
let alpha = parseFloat(document.getElementById('alphaRange').value);
let size = parseInt(document.getElementById('sizeRange').value, 10);
let fillShape = document.getElementById('fillShape').checked;

let lastX = 0, lastY = 0, lastT = performance.now();
let startX = 0, startY = 0;
let snapshot = null;


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
  const map = {
    pencil:'연필',airbrush:'에어브러시',calligraphy:'캘리그래피',dotted:'점묘',splatter:'스플래터',glow:'글로우',crayon:'크레용',chalk:'초크',hatch:'해칭',eraser:'지우개',line:'직선',rect:'사각형',circle:'원',star:'별',arrow:'화살표'};
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
  // Pencil early handling
  try{
    if(typeof tool!=='undefined' && tool==='pencil'){
      e.preventDefault();
      if(!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches?e.touches[0].clientX:e.clientX;
      const clientY = e.touches?e.touches[0].clientY:e.clientY;
      const x = (clientX - rect.left) * (canvas.width/rect.width);
      const y = (clientY - rect.top)  * (canvas.height/rect.height);
      pencilStroke(ctx, lastX, lastY, x, y, color, size, alpha);
      lastX = x; lastY = y;
      return; // prevent default tool path
    }
  }catch(_e){}
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


// === PNG Export (Desktop & Mobile) ===
(function(){
  const btn = document.getElementById('savePngBtn');
  if(!btn) return;
  const canvas = document.getElementById('board');
  function timestamp(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return d.getFullYear()
      + pad(d.getMonth()+1) + pad(d.getDate()) + '_'
      + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function downloadBlob(blob, filename){
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  btn.addEventListener('click', ()=>{
    if(!canvas) return;
    try{
      if(canvas.toBlob){
        canvas.toBlob((blob)=>{
          if(blob){
            downloadBlob(blob, 'canvas_' + timestamp() + '.png');
          }
        }, 'image/png');
      }else{
        // Fallback (older browsers): use dataURL
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'canvas_' + timestamp() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }catch(e){
      // iOS Safari older fallback: open in new tab (user can long-press to save)
      const dataURL = canvas.toDataURL('image/png');
      window.open(dataURL, '_blank');
    }
  });
})();



// --- Pencil tool: graphite-like stroke with subtle jitter and lower alpha ---
function pencilStroke(ctx, x0, y0, x1, y1, color, size, alpha){
  // base stroke
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.max(0.15, alpha * 0.7);
  const w = Math.max(0.8, size * 0.6);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  // subtle graphite jitter overlays
  for(let i=0;i<2;i++){
    const jx = (Math.random()-0.5) * (w*0.6);
    const jy = (Math.random()-0.5) * (w*0.6);
    ctx.globalAlpha = Math.max(0.1, alpha * 0.35);
    ctx.beginPath();
    ctx.moveTo(x0 + jx, y0 + jy);
    ctx.lineTo(x1 - jx, y1 - jy);
    ctx.stroke();
  }
  ctx.restore();
}

// === 캔버스 초기화 (Reset) ===
(function(){
  const btn = document.getElementById('resetBtn');
  const canvas = document.getElementById('board');
  if(!btn || !canvas) return;
  const ctx = canvas.getContext('2d');
  btn.addEventListener('click', ()=>{
    try{
      // clear and repaint background (white)
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(typeof fillInitialBackground==='function'){
        fillInitialBackground();
      }else{
        ctx.save();
        ctx.globalCompositeOperation='source-over';
        ctx.fillStyle='#ffffff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
      }
      // if app has snapshot system, reset it safely
      if(typeof takeSnapshot==='function' && typeof restoreSnapshot==='function'){
        takeSnapshot();
        restoreSnapshot();
      }
    }catch(e){ console.warn('Reset failed', e); }
  });
})();

// === Mobile PNG Save: View-only override (no download UI) ===
(function(){
  const btn = document.getElementById('savePngBtn');
  const canvas = document.getElementById('board');
  if(!btn || !canvas) return;
  const isMobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  if(!isMobile) return;
  // Capture phase handler to stop existing download handlers on mobile
  btn.addEventListener('click', function(e){
    try{
      e.preventDefault();
      e.stopImmediatePropagation();
    }catch(_){};
    try{
      const dataURL = canvas.toDataURL('image/png');
      window.open(dataURL, '_blank'); // show only 'View' behavior
    }catch(err){}
    return false;
  }, true);
})();

