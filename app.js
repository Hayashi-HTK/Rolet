var WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
var RED=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
var N=37;

function parse(s){
  return s.split(/[\s,]+/).map(function(v){return parseInt(v.trim());}).filter(function(n){return !isNaN(n)&&n>=0&&n<=36;});
}

// Encontra todos os clusters consecutivos no cilindro
function findAllClusters(hotIdx, minC){
  var visited={};
  var clusters=[];
  for(var i=0;i<N;i++){
    if(!hotIdx.has(i)||visited[i])continue;
    var cluster=[i];
    visited[i]=true;
    var j=(i+1)%N;
    while(hotIdx.has(j)&&!visited[j]){
      cluster.push(j);visited[j]=true;j=(j+1)%N;
    }
    clusters.push(cluster);
  }
  return clusters.filter(function(c){return c.length>=minC;});
}

// Pontua cada cluster: soma de frequências dos números + bônus por tamanho
function scoreCluster(cluster, freq){
  var score=0;
  cluster.forEach(function(i){score+=freq[WHEEL[i]]*2;});
  score+=cluster.length; // bônus por ter mais números consecutivos
  return score;
}

function getMirrors(idxSet){
  var mirrors=new Set();
  idxSet.forEach(function(i){
    [18,19].forEach(function(offset){
      var mi=(i+offset)%N;
      if(!idxSet.has(mi))mirrors.add(mi);
    });
  });
  return mirrors;
}

function render(){
  var hist=parse(document.getElementById('hist').value);
  var nbrCount=Math.max(1,Math.min(4,parseInt(document.getElementById('nbrs').value)||2));
  var minC=Math.max(1,parseInt(document.getElementById('minc').value)||2);

  var freq={};
  WHEEL.forEach(function(n){freq[n]=0;});
  hist.forEach(function(n){if(freq[n]!==undefined)freq[n]++;});

  var hotIdx=new Set();
  WHEEL.forEach(function(n,i){if(freq[n]>0)hotIdx.add(i);});

  var allClusters=findAllClusters(hotIdx,minC);

  // Seleciona APENAS o cluster com maior score
  var bestCluster=null, bestScore=-1;
  allClusters.forEach(function(c){
    var s=scoreCluster(c,freq);
    if(s>bestScore){bestScore=s;bestCluster=c;}
  });

  var clusterIdx=new Set();
  if(bestCluster)bestCluster.forEach(function(i){clusterIdx.add(i);});

  // Ignorados = todos os quentes que não estão no cluster principal
  var ignoredIdx=new Set();
  hotIdx.forEach(function(i){if(!clusterIdx.has(i))ignoredIdx.add(i);});

  // Vizinhos apenas do cluster principal
  var nbrIdx=new Set();
  clusterIdx.forEach(function(i){
    for(var d=-nbrCount;d<=nbrCount;d++){
      var ni=(i+d+N)%N;
      if(!clusterIdx.has(ni))nbrIdx.add(ni);
    }
  });

  // Espelho do cluster principal
  var mirrorIdx=getMirrors(clusterIdx);
  // Remove sobreposição com vizinhos
  mirrorIdx.forEach(function(i){if(nbrIdx.has(i))nbrIdx.delete(i);});

  // Vizinhos do espelho
  var mirNbrIdx=new Set();
  mirrorIdx.forEach(function(i){
    for(var d=-nbrCount;d<=nbrCount;d++){
      var ni=(i+d+N)%N;
      if(!clusterIdx.has(ni)&&!nbrIdx.has(ni)&&!mirrorIdx.has(ni))mirNbrIdx.add(ni);
    }
  });

  drawWheel(clusterIdx,ignoredIdx,nbrIdx,mirrorIdx,mirNbrIdx);
  buildStats(hist,clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx,allClusters.length);
  buildAposta(clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx,ignoredIdx,freq,minC,bestCluster);
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
    else if(ignoredIdx.has(i)){fill='#333';stroke='#444';}
    else if(mirrorIdx.has(i)){fill='#3B82F6';stroke='#1D4ED8';}
    else if(nbrIdx.has(i)){fill='#EF9F27';stroke='#BA7517';}
    else if(mirNbrIdx.has(i)){fill='#7C3AED';stroke='#5B21B6';}
    else if(RED.indexOf(num)>=0){fill='#6B1818';stroke='#4a0f0f';}
    else{fill='#111827';stroke='#1f2937';}
    drawCell(i,fill,stroke);
    drawNum(i);
  });

  // Centro
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

function buildStats(hist,clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx,totalClusters){
  var all=new Set();
  clusterIdx.forEach(function(i){all.add(i);});
  nbrIdx.forEach(function(i){all.add(i);});
  mirrorIdx.forEach(function(i){all.add(i);});
  mirNbrIdx.forEach(function(i){all.add(i);});
  var pct=((all.size/37)*100).toFixed(1);
  // Probabilidade real: chance de pelo menos 1 dos números sair
  var probAcerto=(1-Math.pow((37-all.size)/37,1))*100;
  document.getElementById('stats').innerHTML=
    '<div class="stat"><div class="stat-l">Rodadas</div><div class="stat-v">'+hist.length+'</div></div>'+
    '<div class="stat"><div class="stat-l">Cluster quente</div><div class="stat-v">'+clusterIdx.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">Espelhos</div><div class="stat-v">'+mirrorIdx.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">A apostar</div><div class="stat-v">'+all.size+' nums</div></div>'+
    '<div class="stat"><div class="stat-l">Cobertura</div><div class="stat-v">'+pct+'%</div></div>'+
    '<div class="stat"><div class="stat-l">Prob. acerto</div><div class="stat-v">'+probAcerto.toFixed(1)+'%</div></div>';
}

function chipsHtml(idxSet,cls){
  var arr=[];
  idxSet.forEach(function(i){arr.push(WHEEL[i]);});
  arr.sort(function(a,b){return a-b;});
  return arr.map(function(n){return '<span class="chip '+cls+'">'+n+'</span>';}).join('');
}

function buildAposta(clusterIdx,nbrIdx,mirrorIdx,mirNbrIdx,ignoredIdx,freq,minC,bestCluster){
  var el=document.getElementById('aposta');

  if(clusterIdx.size===0){
    var ign=[];ignoredIdx.forEach(function(i){ign.push(WHEEL[i]);});
    el.innerHTML='<div class="aposta-title">⚠️ Nenhum cluster encontrado</div>'+
      '<div class="info-box">'+(ign.length>0?'Números isolados ignorados: <strong>'+ign.join(', ')+'</strong><br>Tente reduzir o raio mínimo para 1.':'Insira o histórico e clique em Analisar.')+'</div>';
    return;
  }

  var all=new Set();
  clusterIdx.forEach(function(i){all.add(i);});
  nbrIdx.forEach(function(i){all.add(i);});
  mirrorIdx.forEach(function(i){all.add(i);});
  mirNbrIdx.forEach(function(i){all.add(i);});

  var allNums=[];
  all.forEach(function(i){allNums.push(WHEEL[i]);});
  allNums.sort(function(a,b){return a-b;});

  // Número mais quente do cluster
  var topNum=null, topFreq=0;
  clusterIdx.forEach(function(i){if(freq[WHEEL[i]]>topFreq){topFreq=freq[WHEEL[i]];topNum=WHEEL[i];}});

  var ign=[];ignoredIdx.forEach(function(i){ign.push(WHEEL[i]);});

  var html='<div class="aposta-title">📍 Onde apostar agora</div>';

  if(topNum!==null&&topFreq>1){
    html+='<div class="info-box">🔥 Número mais quente: <strong>'+topNum+'</strong> (caiu '+topFreq+'x) — priorize vizinhos dele</div>';
  }

  html+='<div class="chips">'+chipsHtml(clusterIdx,'chip ch')+chipsHtml(nbrIdx,'chip cn')+chipsHtml(mirrorIdx,'chip cm')+chipsHtml(mirNbrIdx,'chip cmn')+'</div>';

  html+='<div class="sec-t">🔴 Cluster principal ('+clusterIdx.size+')</div><div class="chips">'+chipsHtml(clusterIdx,'chip ch')+'</div>';
  html+='<div class="sec-t">🟠 Vizinhos do cluster ('+nbrIdx.size+')</div><div class="chips">'+chipsHtml(nbrIdx,'chip cn')+'</div>';
  html+='<div class="sec-t">🔵 Espelhos ('+mirrorIdx.size+')</div><div class="chips">'+chipsHtml(mirrorIdx,'chip cm')+'</div>';
  html+='<div class="sec-t">🟣 Vizinhos dos espelhos ('+mirNbrIdx.size+')</div><div class="chips">'+chipsHtml(mirNbrIdx,'chip cmn')+'</div>';

  if(ign.length>0){
    html+='<div class="sec-t">⚫ Outros clusters ignorados: '+ign.join(', ')+'</div>';
  }

  var prob=((all.size/37)*100).toFixed(1);
  html+='<div class="total-box"><strong>Total:</strong> '+allNums.join(', ')+'<br><strong>Cobertura:</strong> '+prob+'% do cilindro ('+all.size+' de 37 números)</div>';
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
