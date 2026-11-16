/* Anchor bridge connects the hub to the sandboxed prototype iframe.

   Prototypes render in an iframe without allow-same-origin, so the hub can
   never touch their DOM. But the hub composes the srcDoc, so it appends this
   script, and the two sides speak postMessage:

   hub → prototype
     { eon:1, type:"eon-anchor-mode", on }        toggle pin-placement mode
     { eon:1, type:"eon-anchor-query", targets }   pins to track: [{ key, selector, text?, heading? }]
     { eon:1, type:"eon-anchor-reveal", selector, text?, heading?, doc_x, doc_y, flash } show + scroll pin into view;
                                                   flash outlines the element for a moment (check findings)
     { eon:1, type:"eon-shot", code, scale }         render the viewport to a PNG (code is html-to-image)
     { eon:1, type:"eon-sync", on }                 report what the user does (phone mirror)
     { eon:1, type:"eon-sync-apply", event }        replay what the other screen reported
   prototype → hub
     { eon:1, type:"eon-anchor-ready" }            bridge is live (iframe mounted)
     { eon:1, type:"eon-anchor-click", selector, text, heading, rel_x, rel_y, x_pct, y_pct, doc_x, doc_y }
     { eon:1, type:"eon-anchor-cancel" }           Esc pressed inside the iframe
     { eon:1, type:"eon-anchor-rects", rects, scroll } key → {x,y,w,h} | {hidden} | null
     { eon:1, type:"eon-anchor-zoom", delta }      trackpad pinch over the prototype
     { eon:1, type:"eon-shot-result", blob | error }
     { eon:1, type:"eon-sync-event", event }        a tap, typed value, or scroll: { kind, selector, ... }
     { eon:1, type:"eon-frame-pointer" }            any press inside (split view makes this pane active)

   Multi-screen prototypes (stepped flows toggling [hidden] or display:none)
   report anchors on inactive screens as {hidden:true}. The hub draws no pin
   for them. Reveal switches the screen before scrolling.

   A pin belongs to the variation it was placed on, not just the DOM node. A
   stepped popup reuses one title node and swaps its text, so each pin carries
   a fingerprint: the element's own text and the nearest visible heading. When
   the node at the selector no longer matches, the bridge looks for the same
   tag with the same fingerprint elsewhere (edits and reorders move things),
   and otherwise reports {hidden:true}. Pins saved before fingerprints track
   the selector alone, as they always did. Rects are re-sent on DOM changes,
   so a step change needs no scroll to move or hide its pins.

   Rects are iframe CSS pixels (the viewport space); the hub scales them by the
   canvas frame scale. The script is inert until the hub speaks to it.

   Sync only reports trusted events, and replays are synthetic, so a replayed
   tap never echoes back. Scrolls fired by a replay are muted for a moment. */

const BRIDGE_SCRIPT = `<script>(function(){
var mode=false,watched=[],queued=false,hl=null,lastSent="",moTimer=0;
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
function norm(s){return String(s||"").slice(0,2000).replace(/\\s+/g," ").trim().slice(0,120);}
var HEAD="h1,h2,h3,h4,h5,h6,[role=heading],[class*=title i],[class*=heading i],[class*=headline i]";
function headingOf(el){
  for(var a=el;a&&a.nodeType===1&&a.tagName!=="HTML";a=a.parentElement){
    try{
      if(a.matches(HEAD)&&shown(a)){var own=norm(a.textContent);if(own)return own;}
      var hs=a.querySelectorAll(HEAD);
      for(var i=0;i<hs.length&&i<40;i++)if(shown(hs[i])){var t=norm(hs[i].textContent);if(t)return t;}
    }catch(e){return "";}
  }
  return "";
}
function matches(el,t){return norm(el.textContent)===t.text&&headingOf(el)===(t.heading||"");}
/* The element a pin belongs to right now. Fingerprinted pins must match the
   variation they were placed on: the node at the selector, else the same tag
   with the same text and heading somewhere else, else nothing. */
function locate(t){
  var el=resolve(t.selector);
  if(typeof t.text!=="string")return el;
  if(el&&matches(el,t))return el;
  if(!t.text)return null;
  var tag=String(t.selector||"").split(" > ").pop().split(":")[0];
  if(!tag)return null;
  var all=document.getElementsByTagName(tag);
  for(var i=0;i<all.length&&i<600;i++)if(all[i]!==el&&shown(all[i])&&matches(all[i],t))return all[i];
  return null;
}
function rectOf(el){var r=el.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}
function shown(el){return el.getClientRects().length>0;}
function sendRects(force){
  queued=false;
  var rects={};
  watched.forEach(function(t){
    var el=locate(t);
    rects[t.key]=el?(shown(el)?rectOf(el):{hidden:true}):(typeof t.text==="string"?{hidden:true}:null);
  });
  var scroll={x:pageXOffset,y:pageYOffset},sig=JSON.stringify([rects,scroll]);
  if(!force&&sig===lastSent)return;
  lastSent=sig;
  post({type:"eon-anchor-rects",rects:rects,scroll:scroll});
}
/* Walk hidden ancestors and show them, hiding whichever sibling "screen" was
   visible instead. This supports stepped flows that switch screens with [hidden]
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
function queueRects(){if(queued||!watched.length)return;queued=true;requestAnimationFrame(function(){sendRects(false);});}
function highlight(el){
  if(!hl){hl=document.createElement("div");hl.setAttribute("data-eon-overlay","");hl.style.cssText="position:fixed;pointer-events:none;z-index:2147483646;border:1.5px solid #7C5CFF;border-radius:4px;background:rgba(124,92,255,.08);transition:all 60ms linear";document.documentElement.appendChild(hl);}
  if(!el){hl.style.display="none";return;}
  var r=el.getBoundingClientRect();
  hl.style.display="block";hl.style.left=r.left+"px";hl.style.top=r.top+"px";hl.style.width=r.width+"px";hl.style.height=r.height+"px";
}
var fl=null,flTimer=0;
function flash(el){
  if(!fl){fl=document.createElement("div");fl.setAttribute("data-eon-overlay","");fl.style.cssText="position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #F5C451;border-radius:6px;box-shadow:0 0 0 4px rgba(245,196,81,.3);transition:opacity 400ms ease";document.documentElement.appendChild(fl);}
  var r=el.getBoundingClientRect();
  fl.style.left=(r.left-3)+"px";fl.style.top=(r.top-3)+"px";fl.style.width=(r.width+6)+"px";fl.style.height=(r.height+6)+"px";
  fl.style.display="block";fl.style.opacity="1";
  clearTimeout(flTimer);flTimer=setTimeout(function(){fl.style.opacity="0";},2400);
}
function onMove(e){if(!mode)return;highlight(e.target===document.documentElement||e.target===document.body?null:e.target);}
function onClick(e){
  if(!mode)return;
  e.preventDefault();e.stopPropagation();
  var el=e.target===document.documentElement?document.body:e.target;
  var r=el.getBoundingClientRect();
  post({type:"eon-anchor-click",selector:selectorFor(el),text:norm(el.textContent),heading:headingOf(el),
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
  else if(m.type==="eon-anchor-query"){watched=Array.isArray(m.targets)?m.targets.filter(function(t){return t&&t.key&&t.selector;}):[];sendRects(true);}
  else if(m.type==="eon-anchor-reveal"){
    var pinned=typeof m.text==="string",el=locate(m);
    if(!el&&pinned){
      /* The pinned screen may just be hidden: show it, then look again. A pin
         on another step of the same node stays put, with nothing to flash. */
      var at=resolve(m.selector);
      if(at&&!shown(at)){forceShow(at);el=locate(m);}
    }
    if(el){
      if(!shown(el))forceShow(el);
      var r=el.getBoundingClientRect();
      scrollTo(pageXOffset+r.left+r.width/2-innerWidth/2,pageYOffset+r.top+r.height/2-innerHeight/2);
      if(m.flash)flash(el);
    }
    else if(!pinned&&typeof m.doc_x==="number"&&typeof m.doc_y==="number")scrollTo(m.doc_x-innerWidth/2,m.doc_y-innerHeight/2);
    queueRects();
  }
  else if(m.type==="eon-shot"){
    var fail=function(err){post({type:"eon-shot-result",error:String(err&&err.message||err)});};
    try{
      if(!window.htmlToImage)(new Function(m.code))();
      window.htmlToImage.toBlob(document.documentElement,{width:innerWidth,height:innerHeight,pixelRatio:m.scale||2,
        filter:function(n){return !(n.hasAttribute&&n.hasAttribute("data-eon-overlay"));}})
        .then(function(blob){if(blob)post({type:"eon-shot-result",blob:blob});else fail("empty image");},fail);
    }catch(err){fail(err);}
  }
  else if(m.type==="eon-sync")sync=!!m.on;
  else if(m.type==="eon-sync-apply")replay(m.event);
});
var sync=false,quiet={},scrollTimers={};
function report(ev){if(sync)post({type:"eon-sync-event",event:ev});}
function onSyncClick(e){
  if(!sync||mode||!e.isTrusted||!e.target||e.target.nodeType!==1)return;
  report({kind:"click",selector:selectorFor(e.target)});
}
function onSyncValue(e){
  var el=e.target;
  if(!sync||!e.isTrusted||!el||el.type==="checkbox"||el.type==="radio")return;
  if(e.type==="change"&&el.tagName!=="SELECT")return;
  report({kind:"value",selector:selectorFor(el),value:el.value});
}
function onSyncScroll(e){
  if(!sync)return;
  var root=document.scrollingElement||document.documentElement;
  var el=e.target===document?root:e.target,key=el===root?"":selectorFor(el);
  if((quiet[key]||0)>Date.now())return;
  clearTimeout(scrollTimers[key]);
  scrollTimers[key]=setTimeout(function(){report({kind:"scroll",selector:key,x:el.scrollLeft,y:el.scrollTop});},60);
}
function replay(ev){
  if(!ev)return;
  if(ev.kind==="scroll"){
    var target=ev.selector?resolve(ev.selector):(document.scrollingElement||document.documentElement);
    if(target){quiet[ev.selector]=Date.now()+300;target.scrollTo(ev.x||0,ev.y||0);}
    return;
  }
  var el=resolve(ev.selector);
  if(!el)return;
  if(ev.kind==="value"){
    el.value=ev.value;
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
    return;
  }
  var r=el.getBoundingClientRect(),o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
  try{el.dispatchEvent(new PointerEvent("pointerdown",o));}catch(err){}
  el.dispatchEvent(new MouseEvent("mousedown",o));
  try{el.dispatchEvent(new PointerEvent("pointerup",o));}catch(err){}
  el.dispatchEvent(new MouseEvent("mouseup",o));
  el.dispatchEvent(new MouseEvent("click",o));
}
function onWheel(e){
  if(!e.ctrlKey&&!e.metaKey)return;
  e.preventDefault();
  post({type:"eon-anchor-zoom",delta:e.deltaY});
}
addEventListener("wheel",onWheel,{passive:false,capture:true});
addEventListener("pointerdown",function(){post({type:"eon-frame-pointer"});},true);
addEventListener("click",onClick,true);
addEventListener("click",onSyncClick,true);
addEventListener("input",onSyncValue,true);
addEventListener("change",onSyncValue,true);
addEventListener("scroll",onSyncScroll,true);
addEventListener("mousemove",onMove,true);
addEventListener("keydown",onKey,true);
addEventListener("scroll",queueRects,true);
addEventListener("resize",queueRects);
addEventListener("load",queueRects);
addEventListener("transitionend",queueRects,true);
addEventListener("animationend",queueRects,true);
/* A step change swaps text or nodes without scrolling, so DOM changes re-check
   the pins too. Batched, and the hub's own overlays don't count. */
if(window.MutationObserver)new MutationObserver(function(list){
  if(moTimer||!watched.length)return;
  for(var i=0;i<list.length;i++){
    var n=list[i].target;
    if(n.nodeType===1&&n.hasAttribute("data-eon-overlay"))continue;
    moTimer=setTimeout(function(){moTimer=0;queueRects();},80);
    return;
  }
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true});
post({type:"eon-anchor-ready"});
})();</script>`;

/* Full view on touch: a quick double-tap on anything that isn't a control asks
   the hub to leave. Taps on buttons, links, and fields are the prototype's own,
   so tapping a control twice fast never exits. manipulation keeps the browser
   from zooming on the same gesture. */
const FULL_EXIT_SCRIPT = `<script>(function(){
var last=0,lx=0,ly=0,CONTROLS="a,button,input,select,textarea,label,summary,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=slider],[onclick],[contenteditable=true]";
document.documentElement.style.touchAction="manipulation";
addEventListener("pointerup",function(e){
  if(e.target&&e.target.closest&&e.target.closest(CONTROLS)){last=0;return;}
  var now=Date.now();
  if(now-last<350&&Math.abs(e.clientX-lx)<40&&Math.abs(e.clientY-ly)<40){last=0;parent.postMessage({eon:1,type:"eon-full-exit"},"*");return;}
  last=now;lx=e.clientX;ly=e.clientY;
},true);
})();</script>`;

export function injectFullViewExit(html) {
  if (!html) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, () => `${FULL_EXIT_SCRIPT}</body>`);
  return html + FULL_EXIT_SCRIPT;
}

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

// Pin position in iframe CSS pixels: the pin's tracked rect + stored offset,
// else the stored document point shifted by the prototype's current scroll,
// else the stored viewport percentages (pre-scroll-capture pins).
// An anchor on a hidden screen with {hidden:true} gets no pin. Jumping
// to its comment switches the prototype to that screen first.
export function anchorPoint(anchor, tracked, vpWidth, vpHeight, scroll) {
  const rect = anchor?.selector ? tracked : null;
  if (rect?.hidden) return null;
  if (rect) return { x: rect.x + rect.w * (anchor.rel_x ?? 0.5), y: rect.y + rect.h * (anchor.rel_y ?? 0.5), tracked: true };
  if (Number.isFinite(anchor?.doc_x) && Number.isFinite(anchor?.doc_y) && scroll) {
    return { x: anchor.doc_x - scroll.x, y: anchor.doc_y - scroll.y, tracked: false };
  }
  if (Number.isFinite(anchor?.x_pct)) return { x: (anchor.x_pct / 100) * vpWidth, y: (anchor.y_pct / 100) * vpHeight, tracked: false };
  return null;
}

// Human label for the state a pin was placed in, e.g. "Mobile · empty · light".
// What the bridge needs to track one pin. `key` names its rect in the reply.
// Pins saved before fingerprints carry no text and track the selector alone.
export function anchorTarget(key, anchor) {
  if (!anchor?.selector) return null;
  return {
    key, selector: anchor.selector,
    ...(typeof anchor.text === "string" ? { text: anchor.text, heading: anchor.heading || "" } : {}),
  };
}

export function anchorStateLabel(anchor) {
  if (!anchor) return "";
  const parts = [anchor.viewport && anchor.viewport[0].toUpperCase() + anchor.viewport.slice(1)];
  Object.values(anchor.args || {}).forEach((value) => parts.push(String(value)));
  if (anchor.theme) parts.push(anchor.theme);
  return parts.filter(Boolean).join(" · ");
}
