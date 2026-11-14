(function(){
  var d=document.documentElement; d.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return [].slice.call((c||document).querySelectorAll(s));}

  /* entrances, once per element */
  var rv=$$('.rv');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1,rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(el){io.observe(el);});
  } else rv.forEach(function(el){el.classList.add('in');});

  /* the bar takes the colour of the chapter beneath it; scroll-linked picture; sticky picture swap */
  var bar=$('#bar');
  var C={cream:['#F7F5F2','#1F1F1F'],step:['#ECE8E1','#1F1F1F'],ink:['#1F1F1F','#F7F5F2'],green:['#0F5C4D','#F7F5F2']};
  var ch=$$('[data-bar]'), band=$('#bandImg'), swaps=$$('[data-swap]'), stage=$$('.stage > *');
  function frame(){
    var y=(bar.offsetHeight||64)/2, cur=ch[0];
    for(var i=0;i<ch.length;i++){var r=ch[i].getBoundingClientRect(); if(r.top<=y&&r.bottom>y){cur=ch[i];break;}}
    if(cur){var key=cur.getAttribute('data-bar'), c=C[key]; bar.style.setProperty('--bar-bg',c[0]); bar.style.setProperty('--bar-ink',c[1]); bar.setAttribute('data-tone',key);}
    if(band&&!reduce){var b=band.parentNode.getBoundingClientRect(), p=Math.min(1,Math.max(0,1-(b.top+b.height)/(innerHeight+b.height))); band.style.setProperty('--z',(1.12-0.12*p).toFixed(4));}
    if(swaps.length&&stage.length){
      var mid=innerHeight*.5, on=0;
      swaps.forEach(function(s,i){if(s.getBoundingClientRect().top<mid) on=i;});
      stage.forEach(function(img,i){img.classList.toggle('on',i===on);});
      swaps.forEach(function(s,i){s.classList.toggle('now',i===on);});
    }
  }
  var t=false; addEventListener('scroll',function(){if(!t){t=true;requestAnimationFrame(function(){frame();t=false;});}},{passive:true});
  addEventListener('resize',frame); frame();

  /* mobile menu */
  var mb=$('#menuBtn'), sh=$('#sheet');
  function closeSheet(){sh.classList.remove('open');mb.setAttribute('aria-expanded','false');mb.textContent='Menu';document.body.style.overflow='';}
  if(mb&&sh){
    mb.addEventListener('click',function(){var o=sh.classList.toggle('open'); mb.setAttribute('aria-expanded',o); mb.textContent=o?'Close':'Menu'; document.body.style.overflow=o?'hidden':'';});
    $$('a',sh).forEach(function(a){a.addEventListener('click',closeSheet);});
    addEventListener('keydown',function(e){if(e.key==='Escape'&&sh.classList.contains('open')){closeSheet();mb.focus();}});
  }

  /* homepage: choose a role, read how we would search, start the brief */
  var roles=$$('.role'), brief=$('#brief'), bt=$('#briefText'), bm=$('#briefMail');
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
        a.parentNode.parentNode.insertBefore(brief, a.parentNode.nextSibling);
        requestAnimationFrame(function(){brief.classList.add('open');});
      });
    });
  }

  /* contact: compose a confidential brief from three choices */
  var form=$('#composer');
  if(form){
    var go=$('#composeMail');
    function fit(sel){if('fieldSizing' in sel.style) return; var m=document.createElement('span'); var cs=getComputedStyle(sel); m.style.cssText='position:absolute;visibility:hidden;white-space:pre;font:'+cs.font; m.textContent=sel.options[sel.selectedIndex].text; document.body.appendChild(m); sel.style.width=(m.offsetWidth+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+4)+'px'; m.remove();}
    function compose(){
      $$('select',form).forEach(fit);
      var lvl=form.level.value, mk=form.market.value, tm=form.timing.value;
      var line='We are looking for '+lvl+' in '+mk+', '+tm+'.';
      var body='Hello,\n\n'+line+'\n\nThe role: \nThe challenge: \nThe kind of person who would change the outcome: \n';
      go.href='mailto:info@talentsupplier.eu?subject='+encodeURIComponent('Confidential search: '+lvl.replace(/^an? /,''))+'&body='+encodeURIComponent(body);
    }
    form.addEventListener('change',compose); form.addEventListener('submit',function(e){e.preventDefault();location.href=go.href;}); compose();
  }

  /* one name lit at a time */
  var ns=$$('.lit-list .n'), k=0;
  if(ns.length){ns[0].classList.add('lit'); if(!reduce) setInterval(function(){ns[k].classList.remove('lit'); k=(k+1)%ns.length; ns[k].classList.add('lit');},2000);}
})();
