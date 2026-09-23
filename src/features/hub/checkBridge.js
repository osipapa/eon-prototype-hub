/* Check bridge measures a rendered prototype for the problems a phone shows up.

   Like the anchor bridge, it rides in the srcDoc the hub composes, because the
   sandboxed iframe's DOM is off limits to the hub. The runner (checks.js)
   renders each state hidden at phone width and asks this script to measure:

   prototype → hub  { eon:1, type:"eon-check-ready" }     loaded, fonts pending
   hub → prototype  { eon:1, type:"eon-check-run" }
   prototype → hub  { eon:1, type:"eon-check-result", issues }

   Each issue is { kind, selector, label, detail, value }, where kind is:
     overflow  sticks out past the screen edge and makes the page scroll sideways
     target    tap target under 44px (links inside a sentence don't count)
     contrast  text under 4.5:1, or 3:1 when large (text on images is skipped)
     field     form field under 16px, which makes iOS Safari zoom in on focus
   Selectors use the anchor bridge's format, so the hub can reveal them. */

export const CHECK_VERSION = 1;
export const CHECK_WIDTH = 360;
export const CHECK_HEIGHT = 780;

const CHECK_SCRIPT = `<script>(function(){
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
function shown(el){
  var r=el.getBoundingClientRect();
  if(r.width<2||r.height<2)return false;
  for(var n=el;n&&n.nodeType===1;n=n.parentElement){
    var cs=getComputedStyle(n);
    if(cs.display==="none"||cs.visibility==="hidden"||cs.opacity==="0"||n.getAttribute("aria-hidden")==="true")return false;
  }
  return true;
}
function labelOf(el){
  var t=el.getAttribute("aria-label")||el.getAttribute("alt")||el.innerText||el.textContent||el.value||el.getAttribute("placeholder")||el.getAttribute("title")||"";
  t=String(t).replace(/\\s+/g," ").trim();
  return (t||"<"+el.tagName.toLowerCase()+">").slice(0,60);
}
function clippedBy(el){
  for(var p=el.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){
    if(getComputedStyle(p).overflowX!=="visible"){
      var r=p.getBoundingClientRect();
      if(r.right<=innerWidth+1&&r.left>=-1)return true;
    }
  }
  return false;
}
function overflow(out){
  var root=document.scrollingElement||document.documentElement,extra=root.scrollWidth-innerWidth;
  if(extra<=1)return;
  var found=[],els=document.body.getElementsByTagName("*");
  for(var i=0;i<els.length&&found.length<6;i++){
    var el=els[i];
    var r=el.getBoundingClientRect();
    if(r.right<=innerWidth+1&&r.left>=-1)continue;
    if(getComputedStyle(el).position==="fixed"||!shown(el)||clippedBy(el))continue;
    var inside=false;
    for(var k=0;k<found.length;k++)if(found[k].contains(el)){inside=true;break;}
    if(inside)continue;
    found.push(el);
    var past=Math.round(r.right>innerWidth?r.right-innerWidth:-r.left);
    out.push({kind:"overflow",selector:selectorFor(el),label:labelOf(el),detail:past+"px past the edge",value:past});
  }
  if(!found.length)out.push({kind:"overflow",selector:"",label:"The page",detail:Math.round(extra)+"px wider than the screen",value:Math.round(extra)});
}
var TARGETS="a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[onclick]";
function inSentence(el){
  if(el.tagName!=="A"||getComputedStyle(el).display.indexOf("inline")!==0||!el.parentElement)return false;
  for(var n=el.parentElement.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.textContent.trim())return true;
  return false;
}
function targets(out){
  var els=document.querySelectorAll(TARGETS),count=0;
  for(var i=0;i<els.length&&count<30;i++){
    var el=els[i];
    if(el.disabled||!shown(el)||inSentence(el))continue;
    if(el.parentElement&&el.parentElement.closest(TARGETS))continue;
    var r=el.getBoundingClientRect(),w=r.width,h=r.height;
    if(el.type==="checkbox"||el.type==="radio"){
      var lab=el.closest("label")||(el.id&&document.querySelector("label[for=\\""+CSS.escape(el.id)+"\\"]"));
      if(lab){var lr=lab.getBoundingClientRect();w=Math.max(w,lr.width);h=Math.max(h,lr.height);}
    }
    if(Math.min(w,h)>=44)continue;
    count++;
    out.push({kind:"target",selector:selectorFor(el),label:labelOf(el),detail:Math.round(w)+"×"+Math.round(h),value:Math.round(Math.min(w,h))});
  }
}
function rgba(c){
  var m=String(c).match(/rgba?\\(([^)]+)\\)/);
  if(!m)return null;
  var p=m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
  return [p[0],p[1],p[2],p.length>3?p[3]:1];
}
function lum(c){
  function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
  return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);
}
function blend(fg,bg){return [fg[0]*fg[3]+bg[0]*(1-fg[3]),fg[1]*fg[3]+bg[1]*(1-fg[3]),fg[2]*fg[3]+bg[2]*(1-fg[3]),1];}
function backdrop(el){
  var layers=[];
  for(var n=el;n&&n.nodeType===1;n=n.parentElement){
    var cs=getComputedStyle(n);
    if(cs.backgroundImage&&cs.backgroundImage!=="none")return null;
    var c=rgba(cs.backgroundColor);
    if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break;}
  }
  var out=[255,255,255,1];
  for(var i=layers.length-1;i>=0;i--)out=blend(layers[i],out);
  return out;
}
function contrast(out){
  var els=document.body.getElementsByTagName("*"),count=0;
  for(var i=0;i<els.length&&count<30;i++){
    var el=els[i],own=false;
    for(var n=el.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.textContent.trim()){own=true;break;}
    if(!own||!shown(el)||el.closest("button:disabled,input:disabled,[aria-disabled=true]"))continue;
    var cs=getComputedStyle(el),fg=rgba(cs.color),bg=backdrop(el);
    if(!fg||!bg)continue;
    var op=1;
    for(var a=el;a&&a.nodeType===1;a=a.parentElement)op*=parseFloat(getComputedStyle(a).opacity)||0;
    var c=blend([fg[0],fg[1],fg[2],fg[3]*op],bg),L1=lum(c),L2=lum(bg);
    var ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    var size=parseFloat(cs.fontSize),large=size>=24||(size>=18.66&&parseInt(cs.fontWeight,10)>=700);
    if(ratio>=(large?3:4.5))continue;
    count++;
    out.push({kind:"contrast",selector:selectorFor(el),label:labelOf(el),detail:(Math.floor(ratio*10)/10)+":1",value:Math.round(ratio*100)/100});
  }
}
var SKIP_INPUTS=/^(hidden|checkbox|radio|color|range|file|submit|button|image|reset)$/;
function fields(out){
  var els=document.querySelectorAll("input,textarea,select");
  for(var i=0;i<els.length;i++){
    var el=els[i];
    if((el.tagName==="INPUT"&&SKIP_INPUTS.test(el.type))||!shown(el))continue;
    var size=parseFloat(getComputedStyle(el).fontSize);
    if(size>=16)continue;
    out.push({kind:"field",selector:selectorFor(el),label:labelOf(el),detail:size+"px",value:size});
  }
}
function run(){
  // A frame that hasn't been given its size yet (a hidden tab) would measure
  // nothing and pass. Wait for a real viewport; the runner times out.
  if(!innerWidth||!innerHeight){setTimeout(run,120);return;}
  var issues=[];
  [overflow,targets,contrast,fields].forEach(function(check){try{check(issues);}catch(e){}});
  post({type:"eon-check-result",issues:issues});
}
addEventListener("message",function(e){
  var m=e.data;
  if(!m||m.eon!==1||m.type!=="eon-check-run")return;
  var go=function(){setTimeout(run,0);};
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go,go);else go();
});
function ready(){post({type:"eon-check-ready"});}
if(document.readyState==="complete")ready();else addEventListener("load",ready);
})();</script>`;

export function injectCheckBridge(html) {
  if (!html) return html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, () => `${CHECK_SCRIPT}</body>`);
  return html + CHECK_SCRIPT;
}
