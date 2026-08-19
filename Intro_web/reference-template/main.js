/* 에너지기술서비스(주) — 공용 스크립트 */

/* ---------- 모바일 메뉴 ---------- */
function initNav(){
  const burger=document.querySelector('.burger');
  const mnav=document.querySelector('.m-nav');
  const dim=document.querySelector('.m-dim');
  if(!burger||!mnav)return;
  const close=()=>{mnav.classList.remove('open');dim.classList.remove('show');};
  burger.addEventListener('click',()=>{mnav.classList.add('open');dim.classList.add('show');});
  dim.addEventListener('click',close);
  mnav.querySelector('.close').addEventListener('click',close);
}

/* ---------- 메인 히어로 슬라이더 ---------- */
function initHero(){
  const hero=document.querySelector('.hero');
  if(!hero)return;
  const slides=hero.querySelectorAll('.slide');
  const dotsWrap=hero.querySelector('.dots');
  let cur=0,timer;
  slides.forEach((s,i)=>{
    const b=document.createElement('button');
    if(i===0)b.classList.add('on');
    b.addEventListener('click',()=>{go(i);reset();});
    dotsWrap.appendChild(b);
  });
  const dots=dotsWrap.querySelectorAll('button');
  function go(i){
    slides[cur].classList.remove('on');dots[cur].classList.remove('on');
    cur=i;
    slides[cur].classList.add('on');dots[cur].classList.add('on');
  }
  function next(){go((cur+1)%slides.length);}
  function reset(){clearInterval(timer);timer=setInterval(next,5000);}
  reset();
}

/* ---------- 라이트박스 (인증서 등 이미지 확대) ---------- */
function initLightbox(){
  let lb=document.querySelector('.lb');
  if(!lb){
    lb=document.createElement('div');lb.className='lb';
    lb.innerHTML='<button class="x" aria-label="닫기">&times;</button><img alt=""><p class="cap"></p>';
    document.body.appendChild(lb);
  }
  const img=lb.querySelector('img'),cap=lb.querySelector('.cap');
  document.querySelectorAll('[data-full]').forEach(el=>{
    el.addEventListener('click',()=>{
      img.src=el.getAttribute('data-full');
      cap.textContent=el.getAttribute('data-cap')||'';
      lb.classList.add('show');
    });
  });
  lb.addEventListener('click',e=>{if(e.target!==img)lb.classList.remove('show');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('show');});
}

/* ---------- 게시판 ----------
   data/{board}.json 형식:
   [{"id":1,"title":"...","date":"YYYY-MM-DD","body":"문단\n문단",
     "images":["images/xxx.jpg"],"link":"","file":""}, ...]
   새 글 등록: JSON 배열 맨 앞에 항목을 추가하면 됩니다. */
const PAGE_SIZE=10;

function boardList(board){
  const wrap=document.querySelector('#board-list');
  if(!wrap)return;
  fetch('data/'+board+'.json').then(r=>r.json()).then(posts=>{
    const params=new URLSearchParams(location.search);
    let page=parseInt(params.get('page')||'1',10);
    const totalPages=Math.max(1,Math.ceil(posts.length/PAGE_SIZE));
    if(page>totalPages)page=totalPages;
    const slice=posts.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
    if(!posts.length){
      wrap.innerHTML='<li class="board-empty">등록된 게시물이 없습니다.</li>';
      return;
    }
    wrap.innerHTML=slice.map((p,i)=>{
      const no=posts.length-((page-1)*PAGE_SIZE+i);
      return '<li><a href="post.html?b='+board+'&id='+p.id+'">'+
        '<span class="no">'+no+'</span>'+
        '<span class="tit">'+esc(p.title)+'</span>'+
        '<span class="date">'+p.date+'</span></a></li>';
    }).join('');
    const pager=document.querySelector('#pager');
    if(pager&&totalPages>1){
      let html='';
      for(let i=1;i<=totalPages;i++){
        html+='<button class="'+(i===page?'on':'')+'" onclick="location.search=\'?page='+i+'\'">'+i+'</button>';
      }
      pager.innerHTML=html;
    }
  }).catch(()=>{wrap.innerHTML='<li class="board-empty">게시물을 불러오지 못했습니다.</li>';});
}

const BOARD_META={
  notice:{name:'공지사항',list:'notice.html'},
  news:{name:'뉴스',list:'news.html'},
  archive:{name:'자료실',list:'archive.html'}
};

function boardView(){
  const el=document.querySelector('#post-wrap');
  if(!el)return;
  const params=new URLSearchParams(location.search);
  const board=params.get('b')||'notice';
  const id=params.get('id');
  const meta=BOARD_META[board]||BOARD_META.notice;
  document.querySelector('#board-name').textContent=meta.name;
  document.querySelector('#back-btn').setAttribute('href',meta.list);
  fetch('data/'+board+'.json').then(r=>r.json()).then(posts=>{
    const p=posts.find(x=>String(x.id)===String(id));
    if(!p){el.innerHTML='<p class="board-empty">게시물을 찾을 수 없습니다.</p>';return;}
    document.title=p.title+' - 에너지기술서비스(주)';
    let body='';
    (p.body||'').split(/\n+/).forEach(t=>{t=t.trim();if(t)body+='<p>'+esc(t)+'</p>';});
    (p.images||[]).forEach(src=>{body+='<img src="'+src+'" alt="" loading="lazy">';});
    if(p.link)body+='<p><a class="btn" style="margin-top:14px" target="_blank" rel="noopener" href="'+p.link+'">원문 보기</a></p>';
    el.innerHTML='<div class="v-head"><h3>'+esc(p.title)+'</h3>'+
      '<div class="meta">'+meta.name+' · '+p.date+'</div></div>'+
      '<div class="v-body">'+body+'</div>'+
      '<div class="v-foot"><a class="btn" href="'+meta.list+'">목록으로</a></div>';
  });
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ---------- 문의 폼 (정적 사이트: 메일 앱 연동) ---------- */
function initContactForm(){
  const f=document.querySelector('#contact-form');
  if(!f)return;
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const d=new FormData(f);
    if(!d.get('agree')){alert('개인정보 수집·이용에 동의해 주세요.');return;}
    const body='성명: '+d.get('name')+'\n회사명: '+d.get('company')+'\n연락처: '+d.get('phone')+'\n이메일: '+d.get('email')+'\n\n문의내용:\n'+d.get('message');
    location.href='mailto:ets0404@naver.com?subject='+encodeURIComponent('[홈페이지 문의] '+d.get('name'))+'&body='+encodeURIComponent(body);
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  initNav();initHero();initLightbox();initContactForm();
  document.querySelectorAll('[data-board-list]').forEach(el=>boardList(el.getAttribute('data-board-list')));
  boardView();
});
