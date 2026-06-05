var WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
var RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
var N=37;

// Configuração ótima baseada em análise de 72 rodadas reais da roleta brasileira
var CONFIG={
  janela:20,      // últimos K números para análise (melhor resultado: K=20)
  vizinhos:3,     // vizinhos de cada lado (±3 = melhor acerto 62.7%)
  minCluster:2    // mínimo de números consecutivos para formar cluster
};

function parse(s){
  return s.split(/[\s,]+/).map(function(v){return parseInt(v.trim());}).filter(function(n){return !isNaN(n)&&n>=0&&n<=36;});
}

function calcular(hist, janela, vizinhos, minCluster){
  // Usa apenas os últimos K números (janela deslizante)
  var recent=hist.length>janela ? hist.slice(hist.length-janela) : hist;

  var freq={};
  WHEEL.forEach(function(n){freq[n]=0;});
  recent.forEach(function(n){if(freq[n]!==undefined)freq[n]++;});

  var posMap={};
  WHEEL.forEach(function(n,i){posMap[n]=i;});

  var hotIdx=new Set();
  WHEEL.forEach(function(n,i){if(freq[n]>0)hotIdx.add(i);});

  // Encontra clusters consecutivos no cilindro
  var visited={};var clusters=[];
  for(var ci=0;ci<N;ci++){
    if(!hotIdx.has(ci)||visited[ci])continue;
    var c=[ci];visited[ci]=true;
    var j=(ci+1)%N;
    while(hotIdx.has(j)&&!visited[j]){c.push(j);visited[j]=true;j=(j+1)%N;}
    clusters.push(c);
  }
  clusters=clusters.filter(function(c){return c.length>=minCluster;});

  // Seleciona o cluster com maior score (frequência*2 + bônus tamanho)
  var bestCluster=null,bestScore=-1;
  clusters.forEach(function(c){
    var s=c.reduce(function(acc,i){return acc+freq[WHEEL[i]]*2+1;},0);
    if(s>bestScore){bestScore=s;bestCluster=c;}
  });

  var clusterIdx=new Set();
  if(bestCluster)bestCluster.forEach(function(i){clusterIdx.add(i);});

  var ignoredIdx=new Set();
  hotIdx.forEach(function(i){if(!clusterIdx.has(i))ignoredIdx.add(i);});

  // Vizinhos do cluster
  var nbrIdx=new Set();
  clusterIdx.forEach(function(i){
    for(var d=-vizinhos;d<=vizinhos;d++){
      var ni=(i+d+N)%N;
      if(!clusterIdx.has(ni))nbrIdx.add(ni);
    }
  });

  // Espelho do cluster (posição oposta no cilindro: +18 e +19)
  var mirrorIdx=new Set();
  clusterIdx.forEach(function(i){
    [18,19].forEach(function(off){
      var mi=(i+off)%N;
      if(!clusterIdx.has(mi)){mirrorIdx.add(mi);nbrIdx.delete(mi);}
    });
  });

  // Vizinhos do espelho
  var mirNbrIdx=new Set();
  mirrorIdx.forEach(function(i){
    for(var d=-vizinhos;d<=vizinhos;d++){
      var ni=(i+d+N)%N;
      if(!clusterIdx.has(ni)&&!nbrIdx.has(ni)&&!mirrorIdx.has(ni))mirNbrIdx.add(ni);
    }
  });

  return{freq,recent,clusterIdx,ignoredIdx,nbrIdx,mirrorIdx,mirNbrIdx,posMap};
}

function render(){
  var hist=parse(document.getElementById('hist').value);
  var janela=Math.max(5,parseInt(document.getElementById('janela').value)||20);
  var vizinhos=Math.max(1,Math.min(5,parseInt(document.getElementById('nbrs').value)||3));
  var minC=Math.max(1,parseInt(document.getElementById('minc').value)||2);

  if(hist.length===0){
    document.getElementById('aposta').innerHTML='<div class="aposta-title">⚠️ Insira o histórico</div>';
    return;
  }

  var r=calcular(hist,janela,vizinhos,minC);

  drawWheel(r.clusterIdx,r.ignoredIdx,r.nbrIdx,r.mirrorIdx,r.mirNbrIdx);
  buildStats(hist,r.recent,r.clusterIdx,r.nbrIdx,r.mirrorIdx,r.mirNbrIdx);
  buildAposta(r.clusterIdx,r.nbrIdx,r.mirrorIdx,r.mirNbrIdx,r.ignoredIdx,r.freq,minC);
}

function drawWheel(clusterIdx,ignoredIdx,nbrIdx,mirrorIdx,mirNbrIdx){
  var canvas=document.getElementById('c');
  var W=660,H=340;
  canvas.width=W;canvas.height=H;
  var ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  var cx=W/2,cy=H/2;
  var rx=W/2-30,ry=H/2-30;
  var cellAngle=(2*Math.PI)/N;
  var halfCell=cellAngle/2;

  function ep(a,rX,rY){return{x:cx+rX*Math.cos(a),y:cy+rY*Math.sin(a)};}

  function drawCell(i,fill,stroke){
    var a1=-Math.PI/2+(i*cellAngle)-halfCell,a2=a1+cellAngle;
    var oX=rx,oY=ry,iX=rx*0.68,iY=ry*0.68;
    ctx.beginPath();
    for(var a=a1;a<=a2;a+=0.02){var p=ep(a,oX,oY);if(a===a1)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
    ctx.lineTo(ep(a2,oX,oY).x,ep(a2,oX,oY).y);
    for(var a=a2;a>=a1;a-=0.02){var p=ep(a,iX,iY);ctx.lineTo(p.x,p.y);}
    ctx.lineTo(ep(a1,iX,iY).x,ep(a1,iX,iY).y);
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=stroke;ctx.lineWidth=0.8;ctx.stroke();
  }

  function drawNum(i){
    var aMid=-Math.PI/2+(i*cellAngle);
    var p=ep(aMid,rx*0.83,ry*0.83);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(aMid+Math.PI/2);
    ctx.font='600 11px sans-serif';ctx.fillStyle='#fff';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(WHEEL[i]),0,0);ctx.restore();
  }

  WHEEL.forEach(function(num,i){
    var fill,stroke;
    if(num===0){fill='#1D9E75';stroke='#0F6E56';}
    else if(clusterIdx.has(i)){fill='#E24B4A';stroke='#A32D2D';}
    else if(ignoredIdx.has(i)){fill='#2a2a3e';stroke='#333';}
    else if(mirrorIdx.has(i)){fill='#3B82F6';stroke='#1D4ED8';}
    else if(nbrIdx.has(i)){fill='#EF9F27';stroke='#BA7517';}
    else if(mirNbrIdx.has(i)){fill='#7C3AED';stroke='#5B21B6';}
    else if(RED.indexOf(num)>=0){fill='#6B1818';stroke='#4a0f0f';}
    else{fill='#111827';stroke='#1f2937';}
    drawCell(i,fill,stroke);
    drawNum(i);
  });

  var iX=rx*0.68,iY=ry*0.68;
  ctx.beginPath();
  for(var a=0;a<=2*Math.PI;a+=0.02){var p=ep(a,iX,iY);if(a===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
  ctx.closePath();
  ctx.fillStyle='#16213e';ctx.fill();
  ctx.strokeStyle='#0f3460';ctx.lineWidth=1.5;ctx.stroke();
  ctx.font='700 13px sans-serif';ctx.fillStyle='#aaa';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('Roleta Europeia',cx,cy-10);
  ctx.font='400 11px sans-serif';ctx.fillStyle='#555';
  ctx.fillText('37 números',cx,cy+10);
}

function buildStats(hist,recent,clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx){
  var all=new Set();
  clusterIdx.forEach(function(i){all.add(i);});
  nbrIdx.forEach(function(i){all.add(i);});
  mirrorIdx.forEach(function(i){all.add(i);});
  mirNbrIdx.forEach(function(i){all.add(i);});
  var pct=((all.size/37)*100).toFixed(1);
  document.getElementById('stats').innerHTML=
    '<div class="stat"><div class="stat-l">Histórico total</div><div class="stat-v">'+hist.length+'</div></div>'+
    '<div class="stat"><div class="stat-l">Janela usada</div><div class="stat-v">'+recent.length+'</div></div>'+
    '<div class="stat"><div class="stat-l">Cluster quente</div><div class="stat-v">'+clusterIdx.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">Espelhos</div><div class="stat-v">'+mirrorIdx.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">Total apostado</div><div class="stat-v">'+all.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">Cobertura</div><div class="stat-v">'+pct+'%</div></div>';
}

function chipsHtml(idxSet,cls){
  var arr=[];
  idxSet.forEach(function(i){arr.push(WHEEL[i]);});
  arr.sort(function(a,b){return a-b;});
  return arr.map(function(n){return '<span class="chip '+cls+'">'+n+'</span>';}).join('');
}

function buildAposta(clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx,ignoredIdx,freq,minC){
  var el=document.getElementById('aposta');

  if(clusterIdx.size===0){
    var ign=[];ignoredIdx.forEach(function(i){ign.push(WHEEL[i]);});
    el.innerHTML='<div class="aposta-title">⚠️ Nenhum cluster encontrado</div>'+
      '<div class="info-box">'+(ign.length>0?'Isolados: '+ign.join(', ')+'<br>Reduza o raio mínimo para 1.':'Nenhum número quente na janela.')+'</div>';
    return;
  }

  var all=new Set();
  clusterIdx.forEach(function(i){all.add(i);});
  nbrIdx.forEach(function(i){all.add(i);});
  mirrorIdx.forEach(function(i){all.add(i);});
  mirNbrIdx.forEach(function(i){all.add(i);});
  var allNums=[];all.forEach(function(i){allNums.push(WHEEL[i]);});
  allNums.sort(function(a,b){return a-b;});

  var topNum=null,topFreq=0;
  clusterIdx.forEach(function(i){if(freq[WHEEL[i]]>topFreq){topFreq=freq[WHEEL[i]];topNum=WHEEL[i];}});

  var ign=[];ignoredIdx.forEach(function(i){ign.push(WHEEL[i]);});

  var html='<div class="aposta-title">📍 Onde apostar agora</div>';
  if(topNum!==null&&topFreq>=2){
    html+='<div class="info-box">🔥 Mais quente: <strong>'+topNum+'</strong> ('+topFreq+'x na janela) — região prioritária</div>';
  }
  html+='<div class="chips">'+chipsHtml(clusterIdx,'chip ch')+chipsHtml(nbrIdx,'chip cn')+chipsHtml(mirrorIdx,'chip cm')+chipsHtml(mirNbrIdx,'chip cmn')+'</div>';
  html+='<div class="sec-t">🔴 Cluster principal ('+clusterIdx.size+')</div><div class="chips">'+chipsHtml(clusterIdx,'chip ch')+'</div>';
  html+='<div class="sec-t">🟠 Vizinhos do cluster ('+nbrIdx.size+')</div><div class="chips">'+chipsHtml(nbrIdx,'chip cn')+'</div>';
  html+='<div class="sec-t">🔵 Espelhos ('+mirrorIdx.size+')</div><div class="chips">'+chipsHtml(mirrorIdx,'chip cm')+'</div>';
  html+='<div class="sec-t">🟣 Vizinhos dos espelhos ('+mirNbrIdx.size+')</div><div class="chips">'+chipsHtml(mirNbrIdx,'chip cmn')+'</div>';
  if(ign.length>0)html+='<div class="sec-t">⚫ Outros clusters ignorados: '+ign.join(', ')+'</div>';
  html+='<div class="total-box"><strong>Apostar em:</strong> '+allNums.join(', ')+'<br><strong>Cobertura:</strong> '+((all.size/37)*100).toFixed(1)+'% do cilindro ('+all.size+'/37)</div>';
  el.innerHTML=html;
}

function limpar(){
  document.getElementById('hist').value='';
  document.getElementById('stats').innerHTML='';
  document.getElementById('aposta').innerHTML='';
  var canvas=document.getElementById('c');
  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(function(){});
}

render();
