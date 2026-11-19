'use strict';
const $ = id => document.getElementById(id);
const C = {ink:'#262b3d',muted:'#72798b',line:'#dfe3ec',purple:'#7150d3',pl:'#eee8ff',teal:'#13877d',tl:'#e5f5f0',amber:'#a67420',al:'#fff4df'};
const score = [[2,4,3,6,5],[4,2,1],[1,3,5,4,6,3],[4,3,2,1]];
const phases = [];
score.forEach((notes,t)=>{
  phases.push({t,kind:'predict',n:0,duration:1600},{t,kind:'prefix_predict',n:0,duration:3000},{t,kind:'inject',n:0,duration:1500});
  notes.forEach((_,n)=>phases.push({t,kind:'event',n:n+1,duration:850}));
  phases.push({t,kind:'stop',n:notes.length,duration:1400},{t,kind:'summary',n:notes.length,duration:1400},{t,kind:'feedback',n:notes.length,duration:2400},{t,kind:'receive',n:notes.length,duration:1300});
  if(t<score.length-1)phases.push({t,kind:'advance',n:notes.length,duration:1800});
});
phases.push({t:3,kind:'done',n:score[3].length,duration:2200});
let index=0, lang='en', playing=false, looping=false, timer=null, speed=1;
const initialEnglish = Object.fromEntries([...document.querySelectorAll('[data-i18n]')].map(e=>[e.dataset.i18n,e.innerHTML]));
const zh = {
  brand:'Decoder-in-Decoder',interactive:'交互式原理动画',kicker:'二维自回归音乐生成',title:'音乐，沿着<em>两个维度展开。</em>',subtitle:'两个维度，两个解码器，通过指导与反馈交替推进。',across:'跨小节 · 纵向推进',within:'小节内 · 横向展开',analogy:'打印机类比',printer:'一台打印乐谱的机器',sync:'同步演示',mechanism:'模型生成流程',decoder:'看见两个解码器之间的互动。',start:'已有历史',finish:'乐谱完成',speed:'速度',loop:'循环',takeaway:'<strong>关键依赖：</strong>下一小节必须等待当前小节生成结束。',schematic:'概念示意动画 · 乐谱仅作演示',details:'预测了什么？与实际代码如何对应？',detailTitle1:'隐藏状态，就是对下一小节的指导。',detailBody1:'在时间步 t，Time Decoder 根据可用历史产生面向第 t 小节的隐藏状态 hₜ。可学习的连接器将 hₜ 映射成 4 个隐状态前缀向量 Pₜ。此前缀被注入 Note Decoder，指导它自回归地生成第 t 小节的音乐事件。这些指导是隐空间表示，并不是已经生成的音符。',detailBody2:'“预测指导”指模型产生用于预测目标小节事件的隐空间表示，并不意味着代码另有一个针对未来隐藏状态的监督目标或独立损失函数。',detailTitle2:'有意保留的概念简化。',detailBody3:'主动画呈现概念循环：完成第 t 小节、得到总结、反馈给下一时间步。当前 main 分支把历史分成两路：第 t 小节的原始 NOTE 事件直接送入下一小节的 Note Decoder；其总结则延迟一个时间步，在生成 t+2 小节时进入 Time Decoder。主动画省略这项路由细节，以突出二维自回归。',detailBody4:'每行对应一个小节，每个横向步对应一个音乐事件，并不一定是单个音符。图中的音符仅用于示意；实际事件还可以表示节拍、乐器等结构。STO 表示小节结束。4 个小节及其事件数量只是演示，并非模型限制。',source1:'代码：隐藏状态与前缀',source2:'代码：历史更新',footer:'Decoder-in-Decoder · 可视化原理',shortcuts:'空格播放 · → 单步 · R 重新开始'
};
const tr = (en,cn)=>lang==='en'?en:cn;
const text = (x,y,s,fill=C.ink,size=18,extra='')=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${extra}>${s}</text>`;
const rect = (x,y,w,h,fill,stroke='none',rx=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const path = (d,color,width=1.5,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const arrow=(x1,y1,x2,y2,color,active=false)=>path(`M${x1} ${y1}L${x2} ${y2}`,color,1.6,`marker-end="url(#${color===C.teal?'at':color===C.amber?'aa':'ap'})" ${active?'class="flow-active"':''}`);
const definitions = `<defs>${[['ap',C.purple],['at',C.teal],['aa',C.amber]].map(([id,c])=>`<marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="${c}"/></marker>`).join('')}</defs>`;
const note=(x,y,p,color,scale=1)=>`<g transform="translate(${x} ${y-p*3}) scale(${scale})" fill="${color}" stroke="${color}" stroke-width="1.5"><ellipse rx="5.5" ry="3.8" transform="rotate(-23)"/><path d="M5 -1V-25" fill="none"/></g>`;
const sub=n=>String(n).split('').map(x=>'₀₁₂₃₄₅₆₇₈₉'[x]).join('');
function shownCount(row,s){return row<s.t||s.kind==='done'?score[row].length:row===s.t?s.n:0;}
function rowFinished(row,s){return row<s.t||s.kind==='done'||(row===s.t&&['stop','summary','feedback','receive','advance'].includes(s.kind));}
function summarized(row,s){return row<s.t||s.kind==='done'||(row===s.t&&['summary','feedback','receive','advance'].includes(s.kind));}

function initPrinter(){
  let out=`<svg viewBox="0 0 400 528" role="img" aria-label="${tr('A printer moves horizontally to print each musical row, then advances vertically.','打印头横向打印当前行，完成后才纵向进入下一行。')}"><defs><linearGradient id="machine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4f5f9"/><stop offset="1" stop-color="#e4e7ef"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#29324e" flood-opacity=".08"/></filter></defs>`;
  out+=rect(43,38,314,383,'url(#machine)','#d9dee8',17,'filter="url(#shadow)"');
  out+=rect(62,65,276,324,'#d7dce6','none',8);
  out+=rect(76,48,248,369,'#fff','#dde1ea',3,'filter="url(#shadow)"');
  out+=text(96,77,'DID',C.ink,12,'letter-spacing="3" font-weight="600"');
  out+=text(304,77,tr('AN UNFOLDING SCORE','正在生成的乐谱'),C.muted,8,'letter-spacing=".5" text-anchor="end"');
  for(let r=0;r<4;r++){
    const y=125+r*69;
    out+=`<g id="paper-row-${r}">`+rect(85,y-24,230,55,'transparent','none',4)+text(95,y+18,String(r+1),'#9ca3b4',10);
    for(let k=0;k<5;k++)out+=path(`M111 ${y+k*6}H306`,'#d5dae4',.8);
    out+=path(`M111 ${y}v24M306 ${y}v24`,'#b7becd',1);
    out+=`<g id="paper-notes-${r}"></g></g>`;
  }
  // A gantry provides a literal print-head mechanism, following the same row index.
  out+=`<g id="gantry" class="head" transform="translate(0 125)">`;
  out+=rect(48,-31,303,7,'#bac2d1','none',3)+rect(48,-28,303,2,'#e8ebf2','none',0);
  out+=`<g id="printhead" class="head" transform="translate(127 0)">`+rect(-16,-47,32,35,C.ink,'none',6)+rect(-8,-39,16,8,'#5d6378','none',2)+rect(-6,-12,12,10,C.teal,'none',2)+path('M0 -1V24',C.teal,1.5,'stroke-dasharray="3 3" opacity=".7"')+`<circle cx="0" cy="24" r="3" fill="${C.teal}"/></g></g>`;
  out+=rect(43,400,314,49,'url(#machine)','#d4dae5',11)+rect(119,411,163,7,'#b9c1d0','none',3)+rect(126,412,148,3,'#656e82','none',1);
  out+=`<circle cx="68" cy="423" r="4" fill="${C.teal}"/>`+text(80,427,'DID / 2D',C.muted,10,'letter-spacing="1"');
  out+=text(200,480,tr('Print a row. Then advance.','一行打印完，再进入下一行。'),C.ink,17,'text-anchor="middle"');
  out+=text(200,505,tr('Horizontal events · vertical bars','横向生成事件 · 纵向推进小节'),C.muted,13,'text-anchor="middle"');
  out+='</svg>';
  $('printer-stage').innerHTML=out;
}
function renderPrinter(s){
  score.forEach((notes,r)=>{
    const count=shownCount(r,s),y=125+r*69;
    $('paper-notes-'+r).innerHTML=notes.slice(0,count).map((p,n)=>note(134+n*28,y+23,p,C.teal,.85)).join('')+(rowFinished(r,s)?path(`M301 ${y}v24`,C.teal,2):'');
    $('paper-row-'+r).firstChild.setAttribute('fill',r===s.t&&s.kind!=='done'?'#f0ebff':'transparent');
  });
  const x=['predict','prefix_predict','inject','advance'].includes(s.kind)?125:Math.min(300,134+Math.max(0,s.n-1)*28);
  $('gantry').setAttribute('transform',`translate(0 ${125+(s.kind==='advance'?s.t+1:s.t)*69})`);
  $('printhead').setAttribute('transform',`translate(${x} 0)`);
  $('gantry').style.opacity=s.kind==='done'?'.35':'1';
}

function narration(s){
  const t=s.t+1, h=`h${sub(t)}`, p=`P${sub(t)}`, n=s.n;
  const all={
    predict:[tr('HISTORY','读取历史'),tr(`The Time Decoder forms ${h} from history.`,`Time Decoder 根据历史产生隐藏状态 ${h}。`),tr(`This hidden state is used to predict the guidance prefix for the next bar to be generated: bar ${t}.`,`这个隐藏状态将用于预测待生成的下一小节（第 ${t} 小节）的指导前缀。`),tr('The print head is positioned for a new row.','打印头就位，准备打印新的一行。'),tr(`<strong>${h} is ready; ${p} has not been predicted yet.</strong>`,`<strong>${h} 已就绪；${p} 尚未预测。</strong>`)],
    prefix_predict:[tr('PREDICT','预测前缀'),tr(`The Time Decoder predicts ${p} to guide the next bar.`,`Time Decoder 预测指导下一小节生成的前缀 ${p}。`),tr(`${h} → learned projection → ${p}. These four latent vectors guide bar ${t}; the Note Decoder is still waiting.`,`${h} → 可学习映射 → ${p}。这 4 个隐状态向量将指导第 ${t} 小节，Note Decoder 此时仍在等待。`),tr('The next row is being prepared. Printing has not started.','正在准备下一行，音符尚未开始打印。'),tr(`<strong>The prediction output is ${p}.</strong> All four prefix vectors are produced together from ${h}.`,`<strong>预测的产物是 ${p}。</strong>4 个前缀向量由 ${h} 一次映射产生。`)],
    inject:[tr('INJECT','注入前缀'),tr(`Inject ${p} before the first event.`,`先注入 ${p}，再生成第一个事件。`),tr(`Four latent vectors condition the Note Decoder for bar ${t}. This guidance remains available throughout the row.`,`4 个隐状态前缀向量指导第 ${t} 小节的 Note Decoder，并在整行生成过程中保持可用。`),tr('Ready to print. The paper stays on this row.','准备开始打印，纸张停留在当前行。'),tr(`<strong>${p} is a sequence of hidden vectors.</strong> It guides all events in this bar.`,`<strong>${p} 是一段隐状态向量前缀。</strong>它指导本小节内所有事件的生成。`)],
    event:[tr('GENERATE','生成事件'),tr(`Event ${n} in bar ${t}. The Time Decoder waits.`,`第 ${t} 小节的第 ${n} 个事件：Time Decoder 等待中。`),tr(`The Note Decoder predicts x${sub(t)},${sub(n)} from the latent guidance and preceding events. The bar index t does not advance.`,`Note Decoder 根据隐状态指导及此前事件预测 x${sub(t)},${sub(n)}。小节时间步 t 不前进。`),tr('<strong>Print left to right.</strong> Do not advance to the next row.','<strong>从左向右打印。</strong>当前行完成之前不换行。'),tr(`<strong>${p} stays in context.</strong> Each new event conditions the next event.`,`<strong>${p} 持续提供指导。</strong>每个新事件又参与下一事件的预测。`)],
    stop:[tr('END BAR','小节结束'),tr(`STO closes bar ${t}. Only now is the row complete.`,`STO 结束第 ${t} 小节，当前行此时才完成。`),tr('The Note Decoder emits the stop event. No events from the following bar were generated in parallel.','Note Decoder 输出小节结束事件。下一小节的事件尚未开始生成。'),tr('<strong>The row is finished.</strong> The next row can now be prepared.','<strong>当前行打印完成。</strong>现在才可以准备下一行。'),tr('<strong>STO is the boundary</strong> between within-bar generation and the next time step.','<strong>STO 是边界：</strong>当前小节的事件生成结束，才允许准备下一步。')],
    summary:[tr('SUMMARIZE','得到总结'),tr(`Completed events become one summary s${sub(t)}.`,`已完成的事件，汇总为 s${sub(t)}。`),tr('Compress the completed bar into a summary. Its internal encoder details are omitted here.','将完整小节压缩为一个总结；这里省略总结编码器的内部细节。'),tr('The completed row is held before advancing.','保留已经打印完成的这一行，等待进入下一行。'),tr('<strong>One completed bar → one summary.</strong> Only the information flow matters here.','<strong>一个完整小节 → 一个总结。</strong>这里仅展示信息如何流动。')],
    feedback:[tr('FEEDBACK','历史反馈'),t<4?tr(`Feed back the summary. Unlock bar ${t+1}.`,`总结反馈，允许进入第 ${t+1} 小节。`):tr('The final bar joins the completed history.','最后一个小节并入已完成的历史。'),t<4?tr(`In this conceptual cycle, s${sub(t)} updates the history used to predict guidance for the next bar.`,`在概念循环中，s${sub(t)} 更新历史，用于预测下一小节的隐藏状态指导。`):tr('The same cycle can continue for more bars. This demonstration ends after four.','同一个循环可以继续生成更多小节。本演示在四个小节后结束。'),tr('<strong>Advance only after finishing the row.</strong> The head returns to the left.','<strong>当前行完成后才能换行。</strong>随后打印头回到左端。'),tr('<strong>Vertical autoregression:</strong> completed music informs the next bar’s guidance.','<strong>纵向自回归：</strong>已生成音乐参与后续小节指导信息的预测。')],
    receive:[tr('RECEIVED','收到反馈'),tr(`Time Decoder receives s${sub(t)}.`,`Time Decoder 收到总结 s${sub(t)}。`),tr('The finished bar has returned to Time. Only this feedback opens the gate to the next time step.','完整小节的总结已回到 Time Decoder。只有收到反馈，才能打开下一时间步的门。'),tr('Row complete. The vertical mechanism is now unlocked.','这一行已完成，纵向换行机构现在才被解锁。'),tr('<strong>The feedback reaches Time Decoder itself.</strong> It becomes history for the next prediction.','<strong>反馈真正到达 Time Decoder。</strong>它成为下一次预测可用的历史。')],
    advance:[tr('ADVANCE','纵向推进'),tr(`Move from t = ${t} to t = ${t+1}; reset n to 1.`,`时间从 t = ${t} 推进到 t = ${t+1}，n 重置为 1。`),tr('The Time Decoder advances vertically only after receiving the completed row. It will now predict fresh latent guidance.','收到完整小节的反馈后，Time Decoder 才向下推进，并开始预测新的隐藏状态指导。'),tr('<strong>Advance one row; return the head to the left.</strong>','<strong>纵向换行，打印头回到最左端。</strong>'),tr('<strong>Two coordinates change at this boundary:</strong> t advances, and n resets.','<strong>边界处两个坐标各司其职：</strong>t 前进，n 归位。')],
    done:[tr('COMPLETE','生成完成'),tr('Two nested autoregressive loops. One score.','两个嵌套的自回归循环，完成一张乐谱。'),tr('Across bars: predict latent guidance. Within a bar: generate events until STO. Repeat, in order.','跨小节：预测隐状态指导。小节内：逐事件生成直到 STO。按此顺序循环。'),tr('The score is complete, one row at a time.','逐行完成，最终得到完整乐谱。'),tr('<strong>Time advances down. Events unfold across.</strong> Each bar has its own latent guidance.','<strong>时间向下推进，事件横向展开。</strong>每个小节都有自己的隐状态指导。')]
  };
  return all[s.kind];
}
function render(){
  const s=phases[index],copy=narration(s);
  renderDecoder(s);renderPrinter(s);
  ['phase-pill','narration-title','narration-text'].forEach((id,i)=>$(id).textContent=copy[i]);
  $('printer-caption').innerHTML=copy[3];$('decoder-caption').innerHTML=copy[4];
  $('coordinate').textContent=s.kind==='done'?'t = 4':`t = ${s.t+1}${s.kind==='event'?`, n = ${s.n}`:''}`;
  $('bar-counter').textContent=tr('BAR ','小节 ')+String(s.t+1).padStart(2,'0')+' / 04';
  $('timeline').value=index;$('timeline').setAttribute('aria-valuetext',copy[1]);
  updateControls();
}
function updateControls(){
  document.body.classList.toggle('paused',!playing);
  $('play-icon').textContent=playing?'Ⅱ':index===phases.length-1?'↻':'▶';
  $('play-label').textContent=playing?tr('Pause','暂停'):index===phases.length-1?tr('Replay','重播'):tr('Play','播放');
  $('play').setAttribute('aria-label',$('play-label').textContent);
  $('loop').setAttribute('aria-pressed',String(looping));
  for(const svg of document.querySelectorAll('svg[data-animation]')){if(playing)svg.unpauseAnimations?.();else svg.pauseAnimations?.();}
}
function schedule(){clearTimeout(timer);if(playing)timer=setTimeout(advance,phases[index].duration/speed);}
function advance(){
  if(index<phases.length-1){index++;render();if(index===phases.length-1&&!looping){playing=false;updateControls();}else schedule();}
  else if(looping){index=0;render();schedule();}else{playing=false;updateControls();}
}
function togglePlay(){const replay=!playing&&index===phases.length-1;if(replay)index=0;playing=!playing;if(replay)render();else updateControls();schedule();}
function restart(){index=0;render();schedule();}
function step(delta=1){playing=false;clearTimeout(timer);index=Math.max(0,Math.min(phases.length-1,index+delta));render();}
function setLanguage(){
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  for(const el of document.querySelectorAll('[data-i18n]'))el.innerHTML=(lang==='en'?initialEnglish:zh)[el.dataset.i18n];
  $('language').textContent=lang==='en'?'中文':'EN';$('language').setAttribute('aria-label',tr('Switch to Chinese','切换至英文'));
  const labels={restart:tr('Restart','重新开始'),step:tr('Next step','下一步'),fullscreen:tr('Toggle fullscreen','切换全屏'),timeline:tr('Animation progress','动画进度'),speed:tr('Playback speed','播放速度')};
  Object.entries(labels).forEach(([id,label])=>{$(id).setAttribute('aria-label',label);$(id).title=label;});
  initPrinter();render();
}
$('timeline').max=phases.length-1;
$('play').addEventListener('click',togglePlay);
$('restart').addEventListener('click',restart);
$('step').addEventListener('click',()=>step());
$('timeline').addEventListener('input',e=>{playing=false;clearTimeout(timer);index=Number(e.target.value);render();});
$('speed').addEventListener('change',e=>{speed=Number(e.target.value);render();schedule();});
$('loop').addEventListener('click',()=>{looping=!looping;updateControls();});
$('language').addEventListener('click',()=>{lang=lang==='en'?'zh':'en';setLanguage();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ $('fullscreen').title=tr('Fullscreen is unavailable in this viewer.','当前预览器不支持全屏。');}});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','A','SUMMARY'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();togglePlay();}else if(e.key==='ArrowRight'){e.preventDefault();step();}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}else if(e.key.toLowerCase()==='r')restart();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){playing=false;clearTimeout(timer);updateControls();}});
setLanguage();
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){playing=true;updateControls();schedule();}
