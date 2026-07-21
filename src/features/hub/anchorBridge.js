/* Anchor bridge — the hub's link into the sandboxed prototype iframe.

   Prototypes render in an iframe without allow-same-origin, so the hub can
   never touch their DOM. But the hub composes the srcDoc, so it appends this
   script, and the two sides speak postMessage:

   hub → prototype
     { eon:1, type:"eon-anchor-mode", on }        toggle pin-placement mode
     { eon:1, type:"eon-anchor-query", selectors } selectors to track
     { eon:1, type:"eon-anchor-reveal", selector, doc_x, doc_y } show + scroll pin into view
   prototype → hub
     { eon:1, type:"eon-anchor-ready" }            bridge is live (iframe mounted)
     { eon:1, type:"eon-anchor-click", selector, rel_x, rel_y, x_pct, y_pct, doc_x, doc_y }
     { eon:1, type:"eon-anchor-cancel" }           Esc pressed inside the iframe
     { eon:1, type:"eon-anchor-rects", rects, scroll } selector → {x,y,w,h} | {hidden} | null

   Multi-screen prototypes (stepped flows toggling [hidden] or display:none)
   report anchors on inactive screens as {hidden:true} — the hub draws no pin
   for them — and reveal switches the screen before scrolling.

   Rects are iframe CSS pixels (the viewport space); the hub scales them by the
   canvas frame scale. The script is inert until the hub speaks to it. */

const BRIDGE_SCRIPT = `<script>(function(){
var mode=false,watched=[],queued=false,hl=null;
function post(m){m.eon=1;parent.postMessage(m,"*");}
function selectorFor(el){
  var parts=[];
  while(el&&el.nodeType===1&&el.tagName!=="BODY"&&el.tagName!=="HTML"){
    var tag=el.tagName.toLowerCase(),i=1,sib=el;
    while((sib=sib.previousElementSibling))if(sib.tagName===el.tagName)i++;
    parts.unshift(tag+":nth-of-type("+i+")");
    el=el.parentElement;
  }
  return parts.join(" > ");
}
function resolve(sel){try{return sel?document.querySelector(sel):null;}catch(e){return null;}}
function rectOf(el){var r=el.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}
function shown(el){return el.getClientRects().length>0;}
function sendRects(){
  queued=false;
  var rects={};
  watched.forEach(function(sel){
    var el=resolve(sel);
    rects[sel]=el?(shown(el)?rectOf(el):{hidden:true}):null;
  });
  post({type:"eon-anchor-rects",rects:rects,scroll:{x:pageXOffset,y:pageYOffset}});
}
/* Walk hidden ancestors and show them, hiding whichever sibling "screen" was
   visible instead — supports stepped flows that switch screens with [hidden]
   or inline display:none. */
function forceShow(el){
  for(var a=el;a&&a.nodeType===1;a=a.parentElement){
    if(a.hasAttribute("hidden")){
      var cls=a.classList[0],sibs=a.parentElement?a.parentElement.children:[];
      for(var i=0;i<sibs.length;i++){
        var s=sibs[i];
        if(s===a||s.hasAttribute("hidden"))continue;
        if(cls?s.classList.contains(cls):s.tagName===a.tagName)s.setAttribute("hidden","");
      }
      a.removeAttribute("hidden");
    }else if(a.style.display==="none"){
      a.style.display="";
    }
  }
}
function queueRects(){if(queued||!watched.length)return;queued=true;requestAnimationFrame(sendRects);}
function highlight(el){
  if(!hl){hl=document.createElement("div");hl.style.cssText="position:fixed;pointer-events:none;z-index:2147483646;border:1.5px solid #7C5CFF;border-radius:4px;background:rgba(124,92,255,.08);transition:all 60ms linear";document.documentElement.appendChild(hl);}
  if(!el){hl.style.display="none";return;}
  var r=el.getBoundingClientRect();
  hl.style.display="block";hl.style.left=r.left+"px";hl.style.top=r.top+"px";hl.style.width=r.width+"px";hl.style.height=r.height+"px";
}
function onMove(e){if(!mode)return;highlight(e.target===document.documentElement||e.target===document.body?null:e.target);}
function onClick(e){
  if(!mode)return;
  e.preventDefault();e.stopPropagation();
  var el=e.target===document.documentElement?document.body:e.target;
  var r=el.getBoundingClientRect();
  post({type:"eon-anchor-click",selector:selectorFor(el),
    rel_x:r.width?(e.clientX-r.left)/r.width:.5,rel_y:r.height?(e.clientY-r.top)/r.height:.5,
    x_pct:innerWidth?e.clientX/innerWidth*100:0,y_pct:innerHeight?e.clientY/innerHeight*100:0,
    doc_x:e.pageX,doc_y:e.pageY});
}
function onKey(e){if(mode&&e.key==="Escape")post({type:"eon-anchor-cancel"});}
function setMode(on){
  mode=on;
  document.documentElement.style.cursor=on?"crosshair":"";
  if(!on)highlight(null);
}
addEventListener("message",function(e){
  var m=e.data;
  if(!m||m.eon!==1)return;
  if(m.type==="eon-anchor-mode")setMode(!!m.on);
  else if(m.type==="eon-anchor-query"){watched=Array.isArray(m.selectors)?m.selectors:[];sendRects();}
  else if(m.type==="eon-anchor-reveal"){
    var el=resolve(m.selector);
    if(el){
      if(!shown(el))forceShow(el);
      var r=el.getBoundingClientRect();
      scrollTo(pageXOffset+r.left+r.width/2-innerWidth/2,pageYOffset+r.top+r.height/2-innerHeight/2);
    }
    else if(typeof m.doc_x==="number"&&typeof m.doc_y==="number")scrollTo(m.doc_x-innerWidth/2,m.doc_y-innerHeight/2);
    queueRects();
  }
});
addEventListener("click",onClick,true);
addEventListener("mousemove",onMove,true);
addEventListener("keydown",onKey,true);
addEventListener("scroll",queueRects,true);
addEventListener("resize",queueRects);
addEventListener("load",queueRects);
post({type:"eon-anchor-ready"});
})();</script>`;

export function injectAnchorBridge(html) {
  if (!html) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${BRIDGE_SCRIPT}</body>`);
  return html + BRIDGE_SCRIPT;
}

// A message really coming from our bridge inside the given iframe.
export function isBridgeMessage(event, iframe) {
  return Boolean(event.data && event.data.eon === 1 && iframe && event.source === iframe.contentWindow);
}

// Does an anchor belong to the canvas state currently on screen?
export function anchorMatchesState(anchor, viewport, args, theme) {
  if (!anchor) return false;
  if (anchor.viewport !== viewport || anchor.theme !== theme) return false;
  const a = anchor.args || {};
  const b = args || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => String(a[key]) === String(b[key]));
}

// Pin position in iframe CSS pixels: tracked element rect + stored offset,
// else the stored document point shifted by the prototype's current scroll,
// else the stored viewport percentages (pre-scroll-capture pins).
// An anchor on a hidden screen ({hidden:true}) gets no pin at all — jumping
// to its comment switches the prototype to that screen first.
export function anchorPoint(anchor, rects, vpWidth, vpHeight, scroll) {
  const rect = anchor?.selector ? rects?.[anchor.selector] : null;
  if (rect?.hidden) return null;
  if (rect) return { x: rect.x + rect.w * (anchor.rel_x ?? 0.5), y: rect.y + rect.h * (anchor.rel_y ?? 0.5), tracked: true };
  if (Number.isFinite(anchor?.doc_x) && Number.isFinite(anchor?.doc_y) && scroll) {
    return { x: anchor.doc_x - scroll.x, y: anchor.doc_y - scroll.y, tracked: false };
  }
  if (Number.isFinite(anchor?.x_pct)) return { x: (anchor.x_pct / 100) * vpWidth, y: (anchor.y_pct / 100) * vpHeight, tracked: false };
  return null;
}

// Human label for the state a pin was placed in, e.g. "Mobile · empty · light".
export function anchorStateLabel(anchor) {
  if (!anchor) return "";
  const parts = [anchor.viewport && anchor.viewport[0].toUpperCase() + anchor.viewport.slice(1)];
  Object.values(anchor.args || {}).forEach((value) => parts.push(String(value)));
  if (anchor.theme) parts.push(anchor.theme);
  return parts.filter(Boolean).join(" · ");
}
