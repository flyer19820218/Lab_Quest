(function(){
  'use strict';
  const BLUE='#4dd2ff',RED='#ff4d4d',WHITE='#f2ecd9';
  function create(canvas){
    const c=canvas.getContext('2d');let kind='',state=null,prior=null,started=0;
    const text=(s,x,y,size=24,color=WHITE)=>{c.fillStyle=color;c.font=`600 ${size}px system-ui`;c.textAlign='center';c.fillText(s,x,y);};
    function rect(x,y,w,h,fill,r=12){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
    function charge(x,y,negative=true){c.fillStyle=negative?BLUE:RED;c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill();text(negative?'−':'+',x,y+5,15,'#11261f');}
    function wire(points){c.strokeStyle='#e8c383';c.lineWidth=5;c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
    function rod(x,y,sign){const g=c.createLinearGradient(x,y-14,x,y+14);g.addColorStop(0,'#809197');g.addColorStop(.4,'#34494c');g.addColorStop(1,'#1a3335');rect(x,y-20,158,40,g,20);for(let i=0;i<4;i++)text(sign<0?'−':'+',x+26+i*34,y+7,26,sign<0?BLUE:RED);text(sign<0?'負電棒':'正電棒',x+79,y-35,24,sign<0?BLUE:RED);}
    function sphere(x,y,net,name){const g=c.createRadialGradient(x-25,y-25,2,x,y,66);g.addColorStop(0,'#e9f2ef');g.addColorStop(.5,'#9faead');g.addColorStop(1,'#405757');c.fillStyle=g;c.beginPath();c.arc(x,y,66,0,Math.PI*2);c.fill();rect(x-10,y+65,20,60,'#b9caca',4);rect(x-50,y+123,100,12,'#263c40',6);text(name,x,y-88);text(net===0?'中性':`${net>0?'+':''}${net}`,x,y+29,26,net===0?'#173331':net<0?BLUE:RED);}
    function inductionSites(s){
      const near=s.near,x=s.rod<0?440:300;
      return Array.from({length:10},(_,i)=>i>=s.electrons?[840,310]:near?[x+(i%2)*27,146+Math.floor(i/2)*23]:[305+(i%2)*126,146+Math.floor(i/2)*23]);
    }
    function pointOn(points,t){const lens=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remain=lens.reduce((a,b)=>a+b,0)*t;for(let i=0;i<lens.length;i++){if(remain<=lens[i]||i===lens.length-1){const q=Math.min(1,remain/(lens[i]||1));return [points[i][0]+(points[i+1][0]-points[i][0])*q,points[i][1]+(points[i+1][1]-points[i][1])*q];}remain-=lens[i];}return points.at(-1);}
    function draw(now){
      if(!state||canvas.hidden)return;
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;
      const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      c.setTransform(w/1080,0,0,h/440,0,0);c.clearRect(0,0,1080,440);
      const backdrop=c.createLinearGradient(0,0,0,440);backdrop.addColorStop(0,'#233f3b');backdrop.addColorStop(1,'#0e2523');rect(0,0,1080,440,backdrop,16);
      rect(45,348,990,24,'#b89866',7);rect(58,373,964,37,'#305d57',3);
      const t=Math.min(1,(now-started)/1100),lerp=(a,b,q=t)=>[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
      if(kind==='induction'){
        const s=state;rod(s.near?60:12,189,s.rod);
        const g=c.createLinearGradient(0,115,0,272);g.addColorStop(0,'#b7c8c3');g.addColorStop(.35,'#5f7b78');g.addColorStop(1,'#375653');rect(272,117,218,155,g,18);rect(365,272,30,61,'#b8c9c3',4);rect(331,333,98,14,'#203b39',5);
        for(let i=0;i<6;i++)charge(307+(i%3)*63,147+Math.floor(i/3)*65,false);
        wire([[490,198],[574,198],[574,310],[820,310]]);if(!s.grounded){rect(620,301,34,20,'#142e2a',0);wire([[620,310],[649,280]]);}wire([[840,285],[840,338]]);wire([[812,337],[868,337]]);wire([[822,349],[858,349]]);wire([[832,359],[848,359]]);
        const to=inductionSites(s),from=inductionSites(prior||s);
        for(let i=0;i<10;i++){
          if(i>=s.electrons&&i>=(prior||s).electrons)continue;
          if(i>=s.electrons&&t===1)continue;
          const transit=i>=s.electrons||i>=(prior||s).electrons;
          const points=transit?[from[i],...(i>=s.electrons?[[485,198],[574,198],[574,310]]:[[574,310],[574,198],[485,198]]),to[i]]:[from[i],to[i]];
          charge(...pointOn(points,t));
        }
        text('金屬（絕緣支座）',380,87,26);text('地球',840,264);text(`金屬：${6-s.electrons>0?'+':''}${6-s.electrons}　地球：${s.earthQ>0?'+':''}${s.earthQ}　合計：0`,565,49,24,'#ffe08c');
      }else if(kind==='contact'){
        const s=state,old=prior||s,moveT=Math.min(1,t/.3),a=lerp([old.touching?443:320,202],[s.touching?443:320,202],moveT),b=lerp([old.touching?575:728,202],[s.touching?575:728,202],moveT);
        const transferring=t<1&&s.flow,qa=transferring?old.a:s.a,qb=transferring?old.b:s.b;
        sphere(...a,qa,'等大金屬球 A');sphere(...b,qb,'等大金屬球 B');
        const sign=s.sign,nA=Math.abs(qa),nB=Math.abs(qb);
        for(let i=0;i<nA+nB;i++){
          const left=i<nA,center=left?a:b,p=[center[0]-28+(i%4)*19,center[1]-22];
          // Charge labels remain fixed for positive charge; only BLUE electrons
          // traverse the contact, including B -> A when A starts positive.
          if(t<1&&s.flow&&i>=4&&t>=.35){const start=s.flow.from==='a'?a:b,end=s.flow.to==='a'?a:b;charge(...lerp([start[0],start[1]-18],[end[0],end[1]-18],Math.max(0,Math.min(1,(t-.35)/.65))));}
          else if(sign<0)charge(...p);
        }
        text(transferring?'兩球先接觸，再讓電子跨接點移動':`A：${s.a>0?'+':''}${s.a}　B：${s.b>0?'+':''}${s.b}　合計：${s.a+s.b}`,535,49,24,'#ffe08c');
        if(sign>0){text('正電區以紅色淨電荷表示；只有藍色電子跨接點',540,390,22);}
      }else if(kind==='balloon'){
        const s=state,old=prior||s,distances=[310,495,677],bx=lerp([distances[old.distance],206],[distances[s.distance],206])[0];
        rect(759,77,226,228,'#ba9860');rect(768,86,208,210,'#17352e',2);text('中性黑板',872,57,24);text('總電荷：0',872,324,24,'#ffe08c');
        const g=c.createRadialGradient(bx-24,166,5,bx,202,83);g.addColorStop(0,'#f8d88f');g.addColorStop(1,'#ce834c');c.fillStyle=g;c.beginPath();c.ellipse(bx,201,82,105,0,0,Math.PI*2);c.fill();wire([[bx,307],[bx-10,340]]);
        if(s.rubbed)for(let i=0;i<4;i++)charge(bx-42+i*27,205);
        rect(95,271,126,63,'#6b9496',8);rect(79,264,38,46,'#6b9496',6);rect(201,264,38,46,'#6b9496',6);text('羊毛衣物',161,251,22);if(s.rubbed)for(let i=0;i<4;i++)charge(113+i*29,299,false);
        // Polarization is a diagram of bound charge, not a free-current animation.
        for(let i=0;i<4;i++){const x=i<2?796:895,y=153+(i%2)*83;charge(x,y,false);charge(x+19+(s.rubbed?s.distance*4:0),y);}
        text(s.rubbed?'氣球 −4　衣物 +4　黑板仍中性':'先摩擦，再靠近黑板觀察',521,40,24,'#ffe08c');
        if(s.rubbed&&s.distance===2)text('質性吸附示意',555,316,23);
      }
      charge(359,428);text('藍：電子／負電',454,435,20);charge(604,428,false);text('紅：固定正電區',708,435,20);
    }
    function set(nextKind,nextState,reset=false){if(kind!==nextKind||reset){prior=nextState;}else prior=state;kind=nextKind;state=nextState;started=performance.now()-(reset?1100:0);}
    return {set,draw};
  }
  window.LabInquiryView=Object.freeze({create});
})();
