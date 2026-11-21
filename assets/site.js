/* TalentSupplier — site behaviour. Every piece degrades to plain, readable HTML. */
(function(){
  var d=document.documentElement; d.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s));}
  var COL={paper:'#F7F5F2',stone:'#E4DED4',mint:'#CADBD3',green:'#0F5C4D',deep:'#0A3F35',ink:'#1F1F1F'};
  var INK={paper:'#1F1F1F',stone:'#1F1F1F',mint:'#1F1F1F',green:'#F7F5F2',deep:'#F7F5F2',ink:'#F7F5F2'};

  /* ---------- entrances ---------- */
  var io=('IntersectionObserver' in window)&&!reduce?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);if(e.target._field) e.target._field.play();}});},{threshold:.12,rootMargin:'0px 0px -6% 0px'}):null;
  $$('.rv, .lift').forEach(function(el){io?io.observe(el):el.classList.add('in');});

  /* ---------- the bar takes the colour of the chapter beneath it ---------- */
  var bar=$('#bar'), chapters=$$('[data-c]'), hideUntil=bar&&bar.getAttribute('data-hide-until')?$(bar.getAttribute('data-hide-until')):null;
  function frame(){
    if(!bar) return;
    var y=(bar.offsetHeight||64)/2, cur=null;
    for(var i=0;i<chapters.length;i++){var r=chapters[i].getBoundingClientRect(); if(r.top<=y&&r.bottom>y){cur=chapters[i];break;}}
    if(cur){var k=cur.getAttribute('data-c'); bar.style.setProperty('--bar-bg',COL[k]); bar.style.setProperty('--bar-ink',INK[k]); bar.setAttribute('data-tone',k);}
    var ft=$('.foot'), inFoot=ft&&ft.getBoundingClientRect().top<bar.offsetHeight;
    bar.classList.toggle('is-hidden',!!(inFoot||(hideUntil&&hideUntil.getBoundingClientRect().bottom>bar.offsetHeight+4)));
    if(stage.length){var mid=innerHeight*.5,on=0; swaps.forEach(function(s,i){if(s.getBoundingClientRect().top<mid) on=i;}); stage.forEach(function(el,i){el.classList.toggle('on',i===on);}); swaps.forEach(function(s,i){s.classList.toggle('now',i===on);});}
  }
  var swaps=$$('[data-swap]'), stage=$$('.stage > *');
  var ticking=false; addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){frame();ticking=false;});}},{passive:true});
  addEventListener('resize',frame); frame();

  /* ---------- menu ---------- */
  var mb=$('#menuBtn'), sh=$('#sheet');
  function closeSheet(){sh.classList.remove('open');mb.setAttribute('aria-expanded','false');mb.textContent='Menu';document.body.style.overflow='';}
  if(mb&&sh){
    mb.addEventListener('click',function(){var o=sh.classList.toggle('open');mb.setAttribute('aria-expanded',o);mb.textContent=o?'Close':'Menu';document.body.style.overflow=o?'hidden':'';});
    $$('a',sh).forEach(function(a){a.addEventListener('click',closeSheet);});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&sh.classList.contains('open')){closeSheet();mb.focus();}});
  }

  /* ---------- Madrid, now ---------- */
  var clocks=$$('[data-clock]');
  function tick(){
    var t; try{t=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date());}catch(e){return;}
    clocks.forEach(function(c){c.textContent='Madrid '+t;});
  }
  if(clocks.length){tick();setInterval(tick,20000);}

  /* ---------- THE FIELD ----------
     A grid of points stands for the market. On play, points fall away until `keep` remain,
     and one grows into the window. data-n  points · data-keep  points kept · data-win  window size (share of the short side)
     data-at  "x,y" where the one sits (0–1) · data-dot / data-one  colours · data-img  a render seen through the window
     data-mode="map"  draws the world from window.TS_MAP and lights the markets */
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function Field(cv){
    var ctx=cv.getContext('2d'), A=cv.dataset, self=this, pts=[], one=null, W=0,H=0,dpr=1, t=0, raf=0, from=0, target=1, img=null, start=0, dur=+A.dur||1800;
    var dot=A.dot||'#1F1F1F', oneC=A.one||'#0F5C4D', mode=A.mode||'grid';
    var keep=+A.keep||1, win=+A.win||.08;
    if(A.img){img=new Image(); img.src=A.img; img.onload=function(){draw();};}
    function build(){
      var r=cv.getBoundingClientRect(); W=r.width; H=r.height; if(!W||!H) return;
      dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
      pts=[]; var R=rng(+A.seed||7);
      if(mode==='map'&&window.TS_MAP){
        var M=window.TS_MAP, s=Math.min(W/M.cols,H/M.rows), ox=(W-s*M.cols)/2, oy=(H-s*M.rows)/2;
        self.s=s;
        var mx=ox+(M.mad[0]+.5)*s, my=oy+(M.mad[1]+.5)*s;
        for(var i=0;i<M.p.length;i+=2){var x=ox+(M.p[i]+.5)*s,y=oy+(M.p[i+1]+.5)*s; pts.push({x:x,y:y,o:Math.hypot(x-mx,y-my)/Math.hypot(W,H),k:true});}
        self.marks=[]; for(var k in M.mk){self.marks.push({x:ox+(M.mk[k][0]+.5)*s,y:oy+(M.mk[k][1]+.5)*s,name:k});}
        one={x:mx,y:my};
      } else {
        var n=+A.n||400, s2=Math.sqrt(W*H/n), cols=Math.max(1,Math.floor(W/s2)), rows=Math.max(1,Math.floor(H/s2));
        var gx=W/cols, gy=H/rows; self.s=Math.min(gx,gy);
        var at=(A.at||'.62,.58').split(','), ax=+at[0]*W, ay=+at[1]*H, best=1e9, bi=0;
        for(var rr=0;rr<rows;rr++)for(var cc=0;cc<cols;cc++){var px=(cc+.5)*gx,py=(rr+.5)*gy,dd=Math.hypot(px-ax,py-ay); if(dd<best){best=dd;bi=pts.length;} pts.push({x:px,y:py,o:R(),k:false});}
        one=pts[bi]; pts.splice(bi,1);
        self.setKeep(keep,true);
      }
      draw();
    }
    this.setKeep=function(k,silent){
      keep=k; var R=rng(+A.seed||7), order=pts.map(function(p,i){return i;});
      for(var i=order.length-1;i>0;i--){var j=Math.floor(R()*(i+1));var tmp=order[i];order[i]=order[j];order[j]=tmp;}
      var keepN=Math.max(0,Math.min(pts.length,Math.round(k<1?k*pts.length:k-1)));
      // keep the points nearest the one: a shortlist is a neighbourhood, not a lottery
      var byDist=pts.map(function(p,i){return {i:i,d:Math.hypot(p.x-one.x,p.y-one.y)+R()*self.s*2};}).sort(function(a,b){return a.d-b.d;});
      pts.forEach(function(p){p.k=false;}); for(var q=0;q<keepN;q++) pts[byDist[q].i].k=true;
      for(var oi=0;oi<order.length;oi++) pts[order[oi]].o=oi/pts.length;
      if(!silent) draw();
    };
    function ease(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
    function draw(){
      if(!W) return; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      var e=ease(Math.max(0,Math.min(1,t))), s=self.s, r=Math.max(1.1,s*(+A.r||.17));
      ctx.fillStyle=dot;
      if(mode==='map'){
        for(var i=0;i<pts.length;i++){var p=pts[i], a=Math.max(0,Math.min(1,(e*1.6-p.o*1.4)*4)); if(a<=0) continue; ctx.globalAlpha=a*.9; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.2832); ctx.fill();}
        ctx.globalAlpha=1; var mE=Math.max(0,Math.min(1,(e-.55)/.45));
        ctx.fillStyle=oneC; (self.marks||[]).forEach(function(m,ix){var z=s*1.25*Math.max(0,Math.min(1,mE*1.6-ix*.15)); ctx.fillRect(m.x-z/2,m.y-z/2,z,z);});
        var mz=s*2.1*mE; ctx.fillStyle=A.home||oneC; ctx.fillRect(one.x-mz/2,one.y-mz/2,mz,mz);
        return;
      }
      for(var j=0;j<pts.length;j++){
        var q=pts[j], a2=q.k?1:1-Math.max(0,Math.min(1,(e*1.4-q.o)*4));
        if(a2<=0) continue; ctx.globalAlpha=a2; ctx.beginPath(); ctx.arc(q.x,q.y,r*(q.k?1:.6+.4*a2),0,6.2832); ctx.fill();
      }
      ctx.globalAlpha=1;
      var z0=r*2.2, z1=Math.min(W,H)*win, z=z0+(z1-z0)*ease(Math.max(0,Math.min(1,(t-.35)/.65)));
      var cx=Math.max(z/2,Math.min(W-z/2,one.x)), cy=Math.max(z/2,Math.min(H-z/2,one.y));
      if(img&&img.complete&&z>z0*3){
        var ir=img.width/img.height, sw, sh2; if(ir>1){sh2=img.height;sw=sh2;}else{sw=img.width;sh2=sw;}
        ctx.drawImage(img,(img.width-sw)/2,(img.height-sh2)/2,sw,sh2,cx-z/2,cy-z/2,z,z);
      } else { ctx.fillStyle=oneC; ctx.fillRect(cx-z/2,cy-z/2,z,z); }
    }
    this.play=function(){
      if(reduce){t=1;draw();return;}
      cancelAnimationFrame(raf); from=0; t=0; start=performance.now();
      (function step(now){t=Math.min(1,(now-start)/dur); draw(); if(t<1) raf=requestAnimationFrame(step);})(start);
    };
    this.run=function(k,w){keep=k; if(w) win=w; self.setKeep(k,true); self.play();};
    build();
    if('ResizeObserver' in window){var ro=new ResizeObserver(function(){var keepT=t;build();t=keepT;draw();}); ro.observe(cv);}
    if(reduce||!io){t=1;draw();}
    cv._field=this;
  }
  $$('canvas.fld').forEach(function(cv){var f=new Field(cv); if(io){io.observe(cv);} });

  /* ---------- the hero: the market as a living field; one point opens into the window ----------
     Points arrive in a wave from the window, settle into a halo around it, and a search pulse
     leaves the window every few seconds. The pointer is a lens: points near it wake up. */
  var hf=$('#heroField'), hero=$('#hero'), hw=$('#heroWin');
  if(hf&&hero&&hw){
    var hc=hf.getContext('2d'), HW=0,HH=0,hd=1, P=[], wx=0,wy=0,wr=null, mx=-1e4,my=-1e4, t0=performance.now(), live=true, raf2=0;
    function hbuild(){
      var r=hf.getBoundingClientRect(); HW=r.width; HH=r.height; hd=Math.min(2,devicePixelRatio||1);
      hf.width=Math.round(HW*hd); hf.height=Math.round(HH*hd);
      var pr=hero.querySelector('.panel').getBoundingClientRect(), b=hw.getBoundingClientRect();
      wr={x:b.left-pr.left,y:b.top-pr.top,w:b.width,h:b.height}; wx=wr.x+wr.w/2; wy=wr.y+wr.h/2;
      var s=HW<700?15:19, cols=Math.ceil(HW/s), rows=Math.ceil(HH/s), maxd=Math.hypot(Math.max(wx,HW-wx),Math.max(wy,HH-wy));
      P=[]; for(var y=0;y<rows;y++)for(var x=0;x<cols;x++){var px=(x+.5)*s,py=(y+.5)*s;
        if(px>wr.x-6&&px<wr.x+wr.w+6&&py>wr.y-6&&py<wr.y+wr.h+6) continue;
        var dd=Math.hypot(px-wx,py-wy)/maxd; P.push({x:px,y:py,d:dd,j:Math.random()});}
      hs=s;
    }
    var hs=19;
    function hdraw(now){
      var t=(now-t0)/1000; hc.setTransform(hd,0,0,hd,0,0); hc.clearRect(0,0,HW,HH);
      var wave=reduce?9:t*0.9, pulse=reduce?-1:((t-1.6)%5.2)/5.2*1.25, r0=Math.max(1,hs*.075);
      hc.fillStyle='#CADBD3';
      for(var i=0;i<P.length;i++){
        var p=P[i]; if(p.d>wave) continue;
        var arrive=Math.min(1,(wave-p.d)*5);
        var near=Math.pow(1-p.d,3), a=.08+.7*near;              // halo: the search is densest near the one
        var pd=Math.abs(p.d-pulse); if(pulse>0&&pd<.06) a+=.45*(1-pd/.06);  // the pulse passing
        var ld=Math.hypot(p.x-mx,p.y-my), lens=ld<140?1-ld/140:0;          // the pointer's lens
        a=Math.min(.95,a+lens*.6)*arrive;
        var r=r0*(1+near*1.1+lens*1.3+(arrive<1?(1-arrive)*1.5:0));
        hc.globalAlpha=a; hc.beginPath(); hc.arc(p.x,p.y,r,0,6.2832); hc.fill();
      }
      hc.globalAlpha=1;
      if(!reduce&&live) raf2=requestAnimationFrame(hdraw);
    }
    hbuild();
    // every pulse is a new search: the window changes what it shows
    var shots=$$('.pane > video, .pane > img',hw), wn=$('#winName'), si=0;
    if(!reduce&&shots.length>1){setTimeout(function(){setInterval(function(){if(!live) return; shots[si].classList.remove('on'); si=(si+1)%shots.length; shots[si].classList.add('on'); if(wn) wn.textContent=shots[si].getAttribute('data-name');},5200);},1600);}
    if(reduce){hero.classList.add('open'); hdraw(performance.now());}
    else{ raf2=requestAnimationFrame(hdraw); setTimeout(function(){hero.classList.add('open');},900); }
    hero.addEventListener('pointermove',function(e){var r=hf.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top;});
    hero.addEventListener('pointerleave',function(){mx=my=-1e4;});
    addEventListener('resize',function(){hbuild(); if(reduce) hdraw(performance.now());});
    if('IntersectionObserver' in window&&!reduce){new IntersectionObserver(function(es){live=es[0].isIntersecting&&!document.hidden; cancelAnimationFrame(raf2); if(live) raf2=requestAnimationFrame(hdraw);}).observe(hero);}
    document.addEventListener('visibilitychange',function(){live=!document.hidden; cancelAnimationFrame(raf2); if(live&&!reduce) raf2=requestAnimationFrame(hdraw);});
  }

  /* ---------- who do you need: choose a role, watch the field narrow, start the brief ---------- */
  var roles=$$('.role'), brief=$('#brief'), bt=$('#briefText'), bm=$('#briefMail'), rf=$('#roleField');
  if(roles.length&&brief){
    roles.forEach(function(a){
      a.setAttribute('role','button'); a.setAttribute('aria-pressed','false');
      a.addEventListener('click',function(ev){
        ev.preventDefault();
        var on=a.getAttribute('aria-pressed')==='true';
        roles.forEach(function(b){b.setAttribute('aria-pressed','false');});
        if(on){brief.classList.remove('open');return;}
        a.setAttribute('aria-pressed','true');
        var name=a.getAttribute('data-role'), how=a.getAttribute('data-how');
        bt.innerHTML=''; var s=document.createElement('strong'); s.textContent=name+'. '; bt.appendChild(s); bt.appendChild(document.createTextNode(how));
        var body='Role: '+name+'\nMarket(s): \nTeam size and scope: \nWhat success looks like in the first year: \nTiming: \n';
        bm.href='mailto:info@talentsupplier.eu?subject='+encodeURIComponent('Search brief: '+name)+'&body='+encodeURIComponent(body);
        var g=a.closest('.group'); g.parentNode.insertBefore(brief,g.nextSibling);
        requestAnimationFrame(function(){brief.classList.add('open');});
        var cap=$('#roleCap'); if(cap) cap.textContent=a.getAttribute('data-cap')||'';
        if(rf&&rf._field) rf._field.run(+a.getAttribute('data-keep')||6);
      });
    });
  }

  /* ---------- contact: compose a confidential brief in one sentence ---------- */
  var form=$('#composer');
  if(form){
    var go=$('#composeMail'), out=$('#composeLine');
    function fit(sel){if(CSS.supports&&CSS.supports('field-sizing','content')) return; var m=document.createElement('span'),cs=getComputedStyle(sel); m.style.cssText='position:absolute;visibility:hidden;white-space:pre;font:'+cs.font+';letter-spacing:'+cs.letterSpacing; m.textContent=sel.options[sel.selectedIndex].text; document.body.appendChild(m); sel.style.width=(m.offsetWidth+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+2)+'px'; m.remove();}
    function compose(){
      $$('select',form).forEach(fit);
      var lvl=form.level.value, mk=form.market.value, tm=form.timing.value, line='We are looking for '+lvl+' in '+mk+', '+tm+'.';
      var body='Hello,\n\n'+line+'\n\nThe role: \nThe challenge: \nThe kind of person who would change the outcome: \n';
      go.href='mailto:info@talentsupplier.eu?subject='+encodeURIComponent('Confidential search: '+lvl.replace(/^an? /,''))+'&body='+encodeURIComponent(body);
      if(out) out.textContent=line;
    }
    form.addEventListener('change',compose); form.addEventListener('submit',function(e){e.preventDefault();location.href=go.href;});
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(compose); compose();
  }
})();
