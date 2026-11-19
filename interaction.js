// Two orthogonal decoding clocks, coupled by explicit guidance and feedback.
function motionPacket(d, body, duration, extra='') {
  return `<g class="message-packet" ${extra}>${body}<animateMotion dur="${duration}s" path="${d}" fill="freeze" calcMode="paced"/></g>`;
}
function interactionState(s) {
  return {
    waiting:['inject','event','stop','summary','feedback'].includes(s.kind),
    received:['receive','advance','done'].includes(s.kind),
    returned:['feedback','receive','advance'].includes(s.kind),
    advance:s.kind==='advance',
    rowY:220+s.t*124,
    column:s.kind==='event'?s.n-1:['stop','summary','feedback','receive','advance','done'].includes(s.kind)?score[s.t].length:0,
  };
}
function renderDecoder(s) {
  const q=interactionState(s),y=q.rowY,t=s.t+1,done=s.kind==='done';
  const event=s.kind==='event',predict=s.kind==='predict',prefixPredict=s.kind==='prefix_predict',inject=s.kind==='inject',summary=s.kind==='summary';
  const X=j=>328+j*64,mid=j=>X(j)+24;
  const duration=(s.duration/1000)/speed;
  const tdState=done?tr('COMPLETE','完成'):prefixPredict?tr('PREDICT PREFIX P','预测前缀 P')+sub(t):predict?tr('COMPUTE h','计算 h')+sub(t):q.received?tr('FEEDBACK RECEIVED','已收到反馈'):tr('WAIT · t IS FIXED','等待 · t 不前进');
  const ndState=event?`n = ${s.n}  →  ${s.n+1}`:inject?tr('RECEIVE PREFIX','接收前缀'):predict||prefixPredict?tr('WAIT FOR PREFIX','等待预测前缀'):tr('BAR COMPLETE','小节已结束');
  let o=`<svg data-animation="interaction" data-phase="${s.kind}" data-time="${t}" viewBox="0 0 960 744" role="img" aria-label="${tr('A two-dimensional decoding lattice. Time Decoder moves vertically only after Note Decoder finishes the row and returns its summary.','二维解码网格：Note Decoder 横向完成整行并返回总结后，Time Decoder 才能纵向推进。')}">${definitions}`;
  // The model itself occupies the axes; there is no separate 1D pipeline.
  o+=rect(24,26,200,645,'#f5f1ff','#e4d9fc',18);
  o+=text(124,59,'Time Decoder',C.purple,24,'text-anchor="middle" font-weight="650"');
  o+=text(124,88,tr('BAR AXIS · t ↓','小节维度 · t ↓'),C.purple,17,'text-anchor="middle"');
  o+=rect(43,108,162,33,predict||prefixPredict||q.received?C.purple:'#e6dff6','none',6);
  o+=text(124,130,tdState,predict||prefixPredict||q.received?'#fff':C.purple,12,'text-anchor="middle" font-weight="700"');
  o+=rect(304,26,505,82,C.tl,'#c5e3dc',14);
  o+=text(328,59,'Note Decoder',C.teal,24,'font-weight="650"');
  o+=text(328,87,tr('EVENT AXIS · n →','事件维度 · n →'),C.teal,17);
  o+=text(789,63,ndState,C.teal,15,'text-anchor="end" font-weight="600"');
  o+=arrow(578,83,786,83,C.teal,event);
  o+=text(872,63,tr('Bar','小节'),C.amber,18,'text-anchor="middle"');
  o+=text(872,88,tr('summary','总结'),C.amber,18,'text-anchor="middle"');
  o+=text(266,132,tr('PREFIX','前缀'),C.purple,12,'text-anchor="middle" letter-spacing="1"');
  for(let j=0;j<7;j++)o+=text(mid(j),132,`n=${j+1}`,C.muted,14,'text-anchor="middle" class="math"');

  // Orthogonal grid and guide lines make the two independent indices visible.
  o+=rect(305,150,505,509,'#fcfdfd','#e9ecee',10);
  for(let j=0;j<7;j++)o+=path(`M${mid(j)} 151V657`,'#e4ebe9',1,'stroke-dasharray="3 6"');
  if(!done){
    o+=rect(305,y-33,505,67,event?'#e4f5ef':'#f1eefb','none',7);
    o+=path(`M${mid(q.column)} 146V${y+38}`,event?'#99cbbd':'#c5b6e5',1.5,'stroke-dasharray="4 5"');
  }
  // Time autoregression is an actual vertical connection, with a closed gate.
  for(let r=0;r<3;r++){
    const ry=220+r*124,completed=r<s.t||done,unlocked=r===s.t&&q.received;
    o+=path(`M157 ${ry+27}V${ry+96}`,completed?C.purple:'#d3c8e8',completed?3:2,'marker-end="url(#ap)"');
    if(r===s.t&&!done&&!unlocked){
      o+=rect(143,ry+50,28,21,'#f5f1ff',C.purple,4)+path(`M149 ${ry+50}v-5a8 8 0 0 1 16 0v5`,C.purple,2);
      o+=text(105,ry+64,tr('LOCKED','等待'),C.purple,12,'text-anchor="middle"');
    }
    if(unlocked){
      o+=path(`M157 ${ry+27}V${ry+96}`,C.purple,4,'marker-end="url(#ap)" class="flow-active"');
      if(q.advance)o+=motionPacket(`M157 ${ry+27}L157 ${ry+96}`,`<circle r="7" fill="${C.purple}"/>`,duration*.75,'data-transfer="time-advance"');
    }
  }
  score.forEach((notes,r)=>{
    const ry=220+r*124,active=r===s.t&&!done,past=r<s.t||done,count=shownCount(r,s),finished=rowFinished(r,s),hasSummary=summarized(r,s);
    o+=path(`M228 ${ry}H817`,'#e8e7ef',1);
    o+=text(45,ry+7,`t=${r+1}`,active?C.purple:C.muted,21,'class="math"');
    o+=`<circle cx="157" cy="${ry}" r="29" fill="${active?C.pl:past?'#ede6fc':'#faf8fe'}" stroke="${active?C.purple:'#d9ceec'}" stroke-width="${active?3:1.5}"/>`;
    if(past||active)o+=text(157,ry+8,`h${sub(r+1)}`,C.purple,29,'class="math" text-anchor="middle"');
    else o+=text(157,ry+7,'?', '#c4b7dc',22,'text-anchor="middle"');
    if(active&&predict){
      o+=`<circle cx="157" cy="${ry}" r="36" fill="none" stroke="${C.purple}" stroke-width="2" class="pulse"/>`;
      o+=text(155,ry-45,tr('history → hidden state','历史 → 隐藏状态'),C.purple,14,'text-anchor="middle"');
      o+=text(73,ry+43,t===1?tr('history','已有历史'):`+ s${sub(t-1)}`,C.purple,14,'text-anchor="middle"');
      o+=arrow(76,ry+32,132,ry+10,C.purple,true);
    }
    if(past||active){
      o+=arrow(190,ry,236,ry,C.purple,active&&prefixPredict);
      o+=text(213,ry-28,tr('Predict','预测'),C.purple,13,'text-anchor="middle" font-weight="700" data-link="predict-prefix"');
      o+=`<g data-prefix-state="${active&&predict?'pending':active&&prefixPredict?'predicting':'ready'}">`;
      for(let k=0;k<4;k++){
        if(active&&predict)o+=rect(242+k*11,ry-18,7,36,'#faf8fe','#c5b2e7',3,'stroke-dasharray="2 2"');
        else if(active&&prefixPredict)o+=`<rect x="${242+k*11}" y="${ry-18}" width="7" height="36" rx="3" fill="${C.purple}"><animate attributeName="fill" values="#e2d6f7;#e2d6f7;${C.purple};${C.purple}" keyTimes="0;.2;.6;1" dur="${duration}s" fill="freeze"/></rect>`;
        else o+=rect(242+k*11,ry-18,7,36,active?C.purple:'#b4a0df','none',3);
      }
      o+='</g>';
      o+=text(261,ry+43,`P${sub(r+1)}`,C.purple,20,'class="math" text-anchor="middle"');
      if(!active||(!predict&&!prefixPredict))o+=arrow(287,ry,319,ry,C.purple,active&&inject);
    }
    for(let j=0;j<7;j++){
      const x=X(j),exists=j<count,isStop=j===notes.length&&finished;
      if(exists||isStop){
        o+=`<g ${active&&event&&j===count-1?'class="event-appears"':''}>`;
        o+=rect(x,ry-26,48,52,isStop?C.al:C.tl,isStop?'#dfbc78':active&&j===count-1?C.teal:'#b0d8cd',7,`stroke-width="${active&&j===count-1?2:1}"`);
        if(isStop)o+=text(x+24,ry+6,'STO',C.amber,14,'text-anchor="middle" font-weight="650"');
        else{
          for(let k=0;k<5;k++)o+=path(`M${x+5} ${ry-2+k*5}h38`,'#b4d8cd',.75);
          o+=note(x+24,ry+19,notes[j],C.teal,1.05);
          o+=text(x+24,ry+47,`x${sub(r+1)},${sub(j+1)}`,C.teal,16,'text-anchor="middle" class="math"');
        }
        o+='</g>';
        if(j>0)o+=arrow(x-14,ry,x-3,ry,C.teal,active&&event&&j===count-1);
      }else{
        o+=rect(x,ry-26,48,52,'#fff','#ccd9d3',7,'stroke-dasharray="3 4"');
        if(j===count&&active&&inject)o+=text(x+24,ry+7,'…',C.teal,23,'text-anchor="middle"');
      }
    }
    if(hasSummary){
      o+=rect(845,ry-26,54,52,C.al,'#d7af66',11)+text(872,ry+9,`s${sub(r+1)}`,C.amber,28,'class="math" text-anchor="middle"');
      if(!active||!summary)o+=arrow(X(notes.length)+51,ry,837,ry,C.amber);
    }else o+=rect(845,ry-26,54,52,'#fff','#e7ded0',11,'stroke-dasharray="4 4"');
  });

  // A visible decoder head actually travels across the current row.
  if(!done&&!q.advance&&!predict&&!prefixPredict){
    const target=mid(q.column),previous=event&&s.n>1?mid(q.column-1):target;
    const headColor=event?C.teal:inject?C.purple:'#91aaa3';
    o+=`<g data-actor="note-decoder" transform="translate(${target} ${y-66})">`;
    if(target!==previous)o+=`<animateTransform attributeName="transform" type="translate" from="${previous} ${y-66}" to="${target} ${y-66}" dur="${.45/speed}s" fill="freeze"/>`;
    o+=rect(-70,-14,140,29,headColor,'none',6)+text(0,6,'Note Decoder','#fff',16,'text-anchor="middle" font-weight="600"');
    o+=path('M0 16V35',headColor,2,'marker-end="url(#at)"');
    o+='</g>';
    if(event||inject){
      const guidance=`M282 ${y-10}Q285 ${y-66} ${target-72} ${y-66}`;
      o+=path(guidance,C.purple,2,`marker-end="url(#ap)" ${inject?'class="flow-active"':''}`);
      if(inject){
        const vectors=[0,1,2,3].map(k=>rect(-15+k*9,-13,6,26,C.purple,'#fff',2)).join('');
        o+=motionPacket(guidance,vectors,duration*.8,'data-transfer="prefix-to-note"');
      }
    }
  }
  if(prefixPredict){
    // The connector predicts all four vectors together; this is not token AR.
    o+=motionPacket(`M190 ${y}L234 ${y}`,`<circle r="5" fill="${C.purple}"/>`,duration*.55,'data-transfer="hidden-to-prefix"');
    o+=`<circle cx="157" cy="${y}" r="35" fill="none" stroke="${C.purple}" stroke-width="2" class="pulse"/>`;
    o+=rect(316,y-37,487,94,'#f3edff','#c6b1ed',10,'data-callout="prefix-prediction"');
    o+=text(337,y-10,tr('Predict prefix for the next bar','预测指导下一小节生成的前缀'),C.purple,22,'font-weight="650"');
    o+=text(337,y+20,`P${sub(t)} = MLP(h${sub(t)})`,C.purple,25,'class="math"');
    o+=text(337,y+44,tr(`Target: bar ${t} · Note Decoder waits for P${sub(t)}`,`目标：第 ${t} 小节 · Note Decoder 等待 P${sub(t)}`),C.muted,16);
  }
  if(summary){
    // Events converge visually, without expanding the summary encoder.
    for(let j=0;j<s.n;j++){
      const d=`M${mid(j)} ${y+26}Q${mid(j)} ${y+66} 827 ${y+57}Q872 ${y+57} 872 ${y+28}`;
      o+=path(d,'#d1ab64',1.2,'opacity=".5"');
      o+=motionPacket(d,`<circle r="4" fill="${C.amber}"/>`,duration*.8);
    }
    o+=text(592,y+83,tr('completed events → one summary','完整小节的事件 → 一个总结'),C.amber,17,'text-anchor="middle"');
  }
  if(q.returned){
    const d=`M872 ${y+29}V${y+68}Q872 ${y+77} 862 ${y+77}H89Q78 ${y+77} 78 ${y+66}V${y+57}`;
    o+=path(d,C.amber,3,'marker-end="url(#aa)" class="feedback-route" data-route="summary-to-time"');
    o+=rect(366,y+65,388,24,'#fff','none',6)+text(560,y+83,tr('RETURN TO TIME DECODER','总结返回 TIME DECODER'),C.amber,17,'text-anchor="middle" font-weight="650"');
    if(s.kind==='feedback')o+=motionPacket(d,`<circle r="16" fill="${C.amber}" stroke="#fff" stroke-width="3"/>`+text(0,6,`s${sub(t)}`,'#fff',17,'class="math" text-anchor="middle"'),duration*.88,'data-transfer="summary-to-time"');
    if(q.received){
      o+=rect(53,y+20,49,36,C.amber,'#fff',7)+text(78,y+45,`s${sub(t)}`,'#fff',22,'class="math" text-anchor="middle"');
      o+=text(124,y-47,tr('summary received ✓','已收到总结 ✓'),C.amber,15,'text-anchor="middle"');
    }
  }
  if(q.advance){
    o+=rect(320,y+48,472,46,C.pl,'#d4c4f0',8)+text(556,y+77,`t: ${t} → ${t+1}   ·   n: ${s.n} → 1`,C.purple,25,'text-anchor="middle" class="math"');
  }
  o+=rect(25,694,875,36,'#f6f7fa','none',8);
  o+=text(462,718,done?tr('A 2D score, built by two interacting autoregressive loops.','两个相互反馈的自回归循环，共同生成二维乐谱。'):event||inject?tr('Horizontal generation is active. Vertical advancement is locked.','横向生成进行中，纵向时间步保持锁定。'):q.waiting?tr('The row is complete. Time still waits for the summary to return.','当前行已完成。Time 仍需等待总结返回，才能前进。'):q.advance?tr('Feedback unlocks the vertical step; the horizontal index resets.','收到反馈才允许纵向前进，同时重置横向事件位置。'):tr('Time predicts guidance. Note realizes it. The result returns to Time.','Time 预测指导，Note 生成事件，结果再反馈给 Time。'),C.muted,17,'text-anchor="middle"');
  o+='</svg>';
  $('decoder-stage').innerHTML=o;
  // Evaluate SMIL at its start before a paused single-step snapshot.
  const svg=$('decoder-stage').querySelector?.('svg');
  svg?.setCurrentTime?.(.001);
}
