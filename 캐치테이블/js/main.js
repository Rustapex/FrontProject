document.addEventListener("DOMContentLoaded",()=>{

  /* 슬라이더 */
  const slides=document.getElementById("slides");
  let idx=0;
  setInterval(()=>{
    idx=(idx+1)%slides.children.length;
    slides.style.transform=`translateX(-${idx*100}%)`;
  },3000);

  /* 예약 오버레이 */
  const overlay=document.getElementById("reserveOverlay");
  document.getElementById("openReserve").onclick=()=>overlay.classList.add("show");
  document.getElementById("closeReserve").onclick=()=>overlay.classList.remove("show");

  /* 달력 */
  const daysEl=document.getElementById("days");
  let year=2026, month=1;

  function render(){
    daysEl.innerHTML="";
    const first=new Date(year,month,1).getDay();
    const last=new Date(year,month+1,0).getDate();
    for(let i=0;i<first;i++) daysEl.appendChild(document.createElement("span"));
    for(let d=1;d<=last;d++){
      const s=document.createElement("span");
      s.textContent=d;
      if(d===24) s.classList.add("active");
      s.onclick=()=>{
        document.querySelectorAll("#days span").forEach(x=>x.classList.remove("active"));
        s.classList.add("active");
        updateText();
      };
      daysEl.appendChild(s);
    }
  }

  let people="2";
  document.querySelectorAll("#people button").forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll("#people button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      people=b.dataset.p;
      updateText();
    };
  });

  function updateText(){
    const day=document.querySelector("#days .active")?.textContent||"1";
    document.getElementById("reserveText").textContent=
      `${year}년 ${month+1}월 ${day}일 · ${people}명`;
  }

  render();
  updateText();
});