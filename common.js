const API_BASE=window.IEC_V4_API_BASE||"";
let IEC_CONFIG=null;
function qp(name){return String(new URLSearchParams(location.search).get(name)||"").trim()}
function requireContext(){const ctx={classId:qp("class"),studentId:qp("student"),runId:qp("run"),token:qp("token")};if(!ctx.classId||!ctx.studentId||!ctx.runId||!ctx.token)throw new Error("Liên kết không đầy đủ. Hãy mở đúng liên kết cá nhân được gửi trong email.");return ctx}
function jsonp(url,timeoutMs){timeoutMs=Number(timeoutMs||(IEC_CONFIG&&IEC_CONFIG.CLIENT_API_TIMEOUT_MS)||60000);return new Promise((resolve,reject)=>{const cb="__iec4_"+Date.now()+"_"+Math.floor(Math.random()*1e6),s=document.createElement("script"),t=setTimeout(()=>done(new Error("Hệ thống phản hồi quá chậm. Hãy thử lại sau ít phút.")),timeoutMs);function done(err,data){clearTimeout(t);try{delete window[cb]}catch(e){}s.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);s.onerror=()=>done(new Error("Không tải được dữ liệu từ hệ thống"));s.src=url+(url.includes("?")?"&":"?")+"callback="+encodeURIComponent(cb)+"&_="+Date.now();document.head.appendChild(s)})}
async function loadClientConfig(){if(IEC_CONFIG)return IEC_CONFIG;if(!API_BASE||API_BASE.includes("PASTE_"))throw new Error("V4 chưa cấu hình URL hệ thống");const d=await jsonp(API_BASE+"?api=client-config",60000);if(!d||d.ok===false)throw new Error(d&&d.error||"Không tải được cấu hình");IEC_CONFIG=d;return d}
function postPayload(payload){const f=document.createElement("form");f.method="POST";f.action=API_BASE;f.target="submitFrame";const i=document.createElement("input");i.type="hidden";i.name="payload";i.value=JSON.stringify(payload);f.appendChild(i);document.body.appendChild(f);f.submit();f.remove()}
function clientKey(prefix){return prefix+"-"+Date.now()+"-"+Math.random().toString(36).slice(2)}
function setMsg(el,text,type){el.textContent=text||"";el.className="msg"+(type?" "+type:"")}
function fmtSec(v){v=Number(v||0);const m=Math.floor(v/60),s=Math.max(0,Math.floor(v%60));return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
const IEC_TTS_STORAGE_KEY='iec_v4_tts_preset';
let IEC_TTS_VOICES=[];
let IEC_TTS_VOICES_READY=false;
let IEC_TTS_INIT_PROMISE=null;
let IEC_TTS_CANCEL_SEQ=0;

function ttsPresetLabel(code){
  const m={MALE_US:'Nam – Mỹ',FEMALE_UK:'Nữ – Anh'};
  return m[String(code||'').toUpperCase()]||String(code||'');
}

function ttsAllowedPresets(){
  let v=IEC_CONFIG&&IEC_CONFIG.TTS_STUDENT_PRESETS;
  if(!Array.isArray(v))v=String(v||'MALE_US,FEMALE_UK').split(',');
  v=v.map(x=>String(x||'').trim().toUpperCase()).filter(x=>['MALE_US','FEMALE_UK'].includes(x));
  return v.length?v:['MALE_US','FEMALE_UK'];
}

function getTtsPreset(){
  const allowed=ttsAllowedPresets();
  const def=String((IEC_CONFIG&&IEC_CONFIG.TTS_DEFAULT_PRESET)||'MALE_US').toUpperCase();
  let saved='';
  try{saved=String(localStorage.getItem(IEC_TTS_STORAGE_KEY)||'').toUpperCase()}catch(e){}
  return allowed.includes(saved)?saved:(allowed.includes(def)?def:allowed[0]);
}

function setTtsPreset(code){
  const allowed=ttsAllowedPresets();
  const v=String(code||'').toUpperCase();
  if(!allowed.includes(v))return getTtsPreset();
  try{localStorage.setItem(IEC_TTS_STORAGE_KEY,v)}catch(e){}
  stopTts();
  return v;
}

function setupTtsPresetSelect(elOrId){
  const el=typeof elOrId==='string'?document.getElementById(elOrId):elOrId;
  if(!el)return;
  const allowed=ttsAllowedPresets(),selected=getTtsPreset();
  el.innerHTML='';
  allowed.forEach(code=>{
    const o=document.createElement('option');
    o.value=code;
    o.textContent=ttsPresetLabel(code);
    o.selected=code===selected;
    el.appendChild(o);
  });
  el.onchange=()=>setTtsPreset(el.value);
  initTtsVoices();
}

function ttsVoiceGender(name){
  const n=String(name||'').toLowerCase();
  const female=['female','samantha','victoria','serena','karen','moira','tessa','fiona','ava','allison','susan','zira','hazel','salli','joanna','amy','emma','olivia','aria','jenny','sonia','libby'];
  const male=['male','alex','daniel','fred','tom','aaron','rishi','guy','david','mark','george','james','oliver','ryan','liam','matthew','andrew','arthur','albert','brian','joey','justin','eric'];
  if(female.some(x=>n.includes(x)))return 'FEMALE';
  if(male.some(x=>n.includes(x)))return 'MALE';
  return 'UNKNOWN';
}

function ttsVoiceLang(v){
  return String(v&&v.lang||'').replace('_','-').toLowerCase();
}

function ttsIsEnglishVoice(v){
  const l=ttsVoiceLang(v);
  return l==='en'||l.startsWith('en-');
}

function ttsIsIOS(){
  const ua=String(navigator.userAgent||'');
  const p=String(navigator.platform||'');
  return /iPhone|iPad|iPod/i.test(ua)||(p==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
}

function ttsIsAndroid(){
  return /Android/i.test(String(navigator.userAgent||''));
}

function ttsHasApi(){
  return ('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
}

function refreshTtsVoices(){
  if(!ttsHasApi())return [];
  let v=[];
  try{v=window.speechSynthesis.getVoices()||[]}catch(e){}
  if(v.length){
    IEC_TTS_VOICES=v.slice();
    if(v.some(ttsIsEnglishVoice))IEC_TTS_VOICES_READY=true;
  }
  return IEC_TTS_VOICES;
}

function initTtsVoices(){
  if(!ttsHasApi())return Promise.resolve([]);
  refreshTtsVoices();
  if(IEC_TTS_VOICES_READY)return Promise.resolve(IEC_TTS_VOICES);
  if(IEC_TTS_INIT_PROMISE)return IEC_TTS_INIT_PROMISE;

  IEC_TTS_INIT_PROMISE=new Promise(resolve=>{
    let done=false,ticks=0,poll=null,limit=null;

    const finish=()=>{
      if(done)return;
      done=true;
      if(poll)clearInterval(poll);
      if(limit)clearTimeout(limit);
      try{window.speechSynthesis.removeEventListener('voiceschanged',changed)}catch(e){}
      refreshTtsVoices();
      resolve(IEC_TTS_VOICES);
    };

    const changed=()=>{
      refreshTtsVoices();
      if(IEC_TTS_VOICES.some(ttsIsEnglishVoice))finish();
    };

    try{window.speechSynthesis.addEventListener('voiceschanged',changed)}catch(e){}

    poll=setInterval(()=>{
      ticks++;
      refreshTtsVoices();
      if(IEC_TTS_VOICES.some(ttsIsEnglishVoice)||ticks>=40)finish();
    },100);

    limit=setTimeout(finish,4200);
  }).finally(()=>{IEC_TTS_INIT_PROMISE=null});

  return IEC_TTS_INIT_PROMISE;
}

function selectTtsVoice(preset){
  const english=(refreshTtsVoices()||[]).filter(ttsIsEnglishVoice);
  if(!english.length)return null;

  const p=String(preset||getTtsPreset()).toUpperCase();
  const target=p==='FEMALE_UK'?'en-gb':'en-us';
  const gender=p==='FEMALE_UK'?'FEMALE':'MALE';

  const exact=english.filter(v=>ttsVoiceLang(v).startsWith(target));
  const exactLocal=exact.filter(v=>v&&v.localService!==false);
  const englishLocal=english.filter(v=>v&&v.localService!==false);

  const byNames=(a,names)=>{
    for(const wanted of names){
      const hit=a.find(v=>String(v&&v.name||'').toLowerCase().includes(wanted));
      if(hit)return hit;
    }
    return null;
  };
  const desired=a=>a.find(v=>ttsVoiceGender(v.name)===gender);
  const def=a=>a.find(v=>!!v.default);

  // iPhone/iPad: ưu tiên giọng native English ổn định thay vì ép giọng nam.
  // Một số voice iOS nghe méo/robotic khi bị ép theo preset khác locale thực tế.
  if(ttsIsIOS()){
    const iosPreferred=p==='FEMALE_UK'
      ? ['serena','kate','martha','daniel']
      : ['samantha','ava','allison','susan','nicky'];
    return byNames(exactLocal,iosPreferred)||
           def(exactLocal)||
           exactLocal[0]||
           byNames(exact,iosPreferred)||
           def(exact)||
           exact[0]||
           def(englishLocal)||
           englishLocal[0]||
           def(english)||
           english[0]||
           null;
  }

  // Android: ưu tiên voice English đúng locale/default của hệ thống.
  // Không ép tên/gender nếu máy không có đúng voice đó vì dễ làm phát âm sai hoặc không phát.
  if(ttsIsAndroid()){
    const androidPreferred=p==='FEMALE_UK'
      ? ['google uk english female','english united kingdom','en-gb']
      : ['google us english','english united states','en-us'];
    return byNames(exactLocal,androidPreferred)||
           def(exactLocal)||
           exactLocal[0]||
           byNames(exact,androidPreferred)||
           def(exact)||
           exact[0]||
           def(englishLocal)||
           englishLocal[0]||
           def(english)||
           english[0]||
           null;
  }

  return desired(exactLocal)||
         def(exactLocal)||
         exactLocal[0]||
         desired(exact)||
         def(exact)||
         exact[0]||
         desired(englishLocal)||
         def(englishLocal)||
         englishLocal[0]||
         desired(english)||
         def(english)||
         english[0]||
         null;
}

function ttsUnsupportedMessage(){
  const ua=String(navigator.userAgent||'');
  if(/Android/i.test(ua)){
    return 'Trình duyệt đang mở liên kết này không hỗ trợ đọc tiếng Anh. Hãy mở đúng liên kết bằng Chrome trên Android.';
  }
  if(/iPhone|iPad|iPod/i.test(ua)){
    return 'Trình duyệt hiện tại không cung cấp chức năng đọc tiếng Anh. Hãy mở liên kết bằng Safari hoặc Chrome trên iPhone/iPad.';
  }
  return 'Trình duyệt hiện tại không hỗ trợ đọc văn bản tiếng Anh.';
}

async function ttsSpeak(text,rate=1,repeat=1){
  if(!ttsHasApi()){
    alert(ttsUnsupportedMessage());
    return false;
  }

  const content=String(text||'').trim();
  if(!content)return false;

  const seq=++IEC_TTS_CANCEL_SEQ;
  stopTts(false);

  await initTtsVoices();

  const preset=getTtsPreset();

  // iPhone/iPad: giữ NGUYÊN đúng hai voice của bản đầu tiên đã nghe hay.
  // Chỉ đảo preset nội bộ để vị trí chọn Nam/Nữ trên giao diện không còn bị ngược.
  const effectivePreset=ttsIsIOS()
    ? (preset==='MALE_US'?'FEMALE_UK':preset==='FEMALE_UK'?'MALE_US':preset)
    : preset;

  const voice=selectTtsVoice(effectivePreset);
  const targetLang=effectivePreset==='FEMALE_UK'?'en-GB':'en-US';

  if(!voice){
    alert('Thiết bị chưa tải được giọng English. Hãy kiểm tra giọng English trong cài đặt hệ thống hoặc mở lại trang bằng Chrome/Safari.');
    return false;
  }

  let left=Math.max(1,Number(repeat)||1);
  const requestedRate=Number(rate)||1;

  // Tốc độ phải phản ánh đúng lựa chọn của người dùng trên mọi thiết bị.
  // Trước đây iPhone/Android bị ép vào dải quá hẹp (.72-.90 / .78-1.0),
  // nên nhiều mức tốc độ khác nhau thực tế phát gần như giống nhau.
  const safeRate=Math.max(.5,Math.min(1.2,requestedRate));
  const actualLang=String(voice&&voice.lang||targetLang).replace('_','-')||targetLang;
  const startDelay=ttsIsIOS()?260:(ttsIsAndroid()?220:140);
  const repeatDelay=ttsIsIOS()?420:(ttsIsAndroid()?380:320);

  return new Promise(resolve=>{
    const say=()=>{
      if(seq!==IEC_TTS_CANCEL_SEQ||left<=0){
        resolve(seq===IEC_TTS_CANCEL_SEQ);
        return;
      }

      const u=new SpeechSynthesisUtterance(content);
      u.voice=voice;
      // Dùng đúng locale của voice thực tế; tránh ép en-US lên voice khác locale trên iOS.
      u.lang=actualLang;
      u.rate=safeRate;
      u.pitch=1;
      u.volume=1;

      u.onend=()=>{
        if(seq!==IEC_TTS_CANCEL_SEQ){
          resolve(false);
          return;
        }
        left--;
        if(left>0)setTimeout(say,repeatDelay);
        else resolve(true);
      };

      u.onerror=e=>{
        const err=String(e&&e.error||'');
        if(err!=='canceled'&&err!=='interrupted'){
          alert('Không phát được giọng English trên thiết bị này. Hãy thử Chrome/Safari và kiểm tra giọng English trong cài đặt hệ thống.');
        }
        resolve(false);
      };

      try{
        if(window.speechSynthesis.paused)window.speechSynthesis.resume();
        setTimeout(()=>{
          if(seq!==IEC_TTS_CANCEL_SEQ){resolve(false);return;}
          try{window.speechSynthesis.speak(u)}catch(e){resolve(false);}
        },startDelay);
      }catch(e){
        resolve(false);
      }
    };

    say();
  });
}

function stopTts(invalidate=true){
  if(invalidate)IEC_TTS_CANCEL_SEQ++;
  try{
    if(ttsHasApi())window.speechSynthesis.cancel();
  }catch(e){}
}

if(ttsHasApi()){
  try{window.speechSynthesis.addEventListener('voiceschanged',refreshTtsVoices)}catch(e){}
  refreshTtsVoices();
}
function normalizeSpeech(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/\b4\b/g,'four')
    .replace(/\b2\b/g,'two')
    .replace(/&/g,' and ')
    .replace(/[-/]/g,' ')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function speechTargetVariants(expected){
  const raw=String(expected||'').trim();
  const out=[];

  const add=v=>{
    const n=normalizeSpeech(v);
    if(n&&!out.includes(n))out.push(n);
  };

  add(raw);
  add(raw.replace(/\([^)]*\)/g,' '));

  const parens=[...raw.matchAll(/\(([^)]*)\)/g)].map(m=>m[1]);
  parens.forEach(p=>add(p));

  return out;
}

function speechEditDistance(a,b){
  a=String(a||'');
  b=String(b||'');

  const m=a.length,n=b.length;
  if(!m)return n;
  if(!n)return m;

  let prev=new Array(n+1);
  let cur=new Array(n+1);
  for(let j=0;j<=n;j++)prev[j]=j;

  for(let i=1;i<=m;i++){
    cur[0]=i;
    for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      cur[j]=Math.min(
        prev[j]+1,
        cur[j-1]+1,
        prev[j-1]+cost
      );
    }
    const tmp=prev;prev=cur;cur=tmp;
  }

  return prev[n];
}

function speechSimilarity(a,b){
  a=normalizeSpeech(a).replace(/\s+/g,'');
  b=normalizeSpeech(b).replace(/\s+/g,'');

  if(!a||!b)return 0;
  if(a===b)return 1;

  const maxLen=Math.max(a.length,b.length);
  return Math.max(0,1-(speechEditDistance(a,b)/maxLen));
}

function speechAssistLevel(profile){
  return Math.max(0,Math.min(10,Number(profile&&profile.boost)||0));
}

function speechThreshold(profile,target){
  const assist=speechAssistLevel(profile);

  // Dùng chính STT_*_BOOST trong CONFIG làm mức hỗ trợ IEC khi browser-context tạm tắt.
  // boost càng cao -> máy càng khoan dung hơn. Không cần sửa code khi muốn chỉnh độ khó.
  let threshold=.93-(assist*.015);

  const len=normalizeSpeech(target).replace(/\s+/g,'').length;
  if(len<=4)threshold=Math.max(threshold,.96);
  else if(len<=7)threshold=Math.max(threshold,.91);
  else if(len<=11)threshold=Math.max(threshold,.87);

  return Math.max(.75,Math.min(.97,threshold));
}

function speechMatchDetail(expected,cands,profile){
  const targets=speechTargetVariants(expected);
  const candidates=(cands||[])
    .map(x=>String(x||'').trim())
    .filter(Boolean);

  let best=0,bestCandidate='',bestTarget='';

  for(const cand of candidates){
    const nc=normalizeSpeech(cand);

    for(const target of targets){
      if(nc===target){
        return {
          pass:true,
          exact:true,
          score:1,
          threshold:1,
          candidate:cand,
          target:target
        };
      }

      const score=speechSimilarity(target,nc);
      if(score>best){
        best=score;
        bestCandidate=cand;
        bestTarget=target;
      }
    }
  }

  const threshold=speechThreshold(profile,bestTarget||expected);

  return {
    pass:best>=threshold,
    exact:false,
    score:best,
    threshold:threshold,
    candidate:bestCandidate,
    target:bestTarget||normalizeSpeech(expected)
  };
}

function speechMatches(expected,cands,profile){
  return speechMatchDetail(expected,cands,profile).pass;
}

function iosSpeechHelpMessage(){
  return 'Trên iPhone/iPad, phần THI NÓI phải mở bằng ứng dụng Safari thật (không mở trong cửa sổ bên trong Gmail/ChatGPT/Facebook/Zalo hoặc app khác). Hãy bấm dấu … ở góc trên → Mở trong Safari. Nếu Safari vẫn báo lỗi, vào Cài đặt → Cài đặt chung → Bàn phím → bật Bật đọc chính tả (Enable Dictation), rồi mở lại bài thi.';
}

function buildRecognition(profile){
  const SR=window.webkitSpeechRecognition||window.SpeechRecognition;

  if(!SR){
    if(ttsIsIOS())throw new Error(iosSpeechHelpMessage());
    throw new Error(
      'Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome/Edge phiên bản mới.'
    );
  }

  const r=new SR();

  r.lang=String(
    (profile&&profile.language) ||
    (IEC_CONFIG&&IEC_CONFIG.STT_LANG) ||
    'en-US'
  );

  r.continuous=false;
  r.interimResults=true;

  r.maxAlternatives=Math.max(
    1,
    Math.min(5,Number(profile&&profile.alternatives)||1)
  );

  // Tạm thời không dùng SpeechRecognitionPhrase/r.phrases:
  // API contextual biasing của browser chưa ổn định trên các thiết bị đã test.
  r.__iecContextApplied=false;

  return r;
}

function oneShotSpeech(expected,profile,phrases,onStatus){
  return new Promise((resolve,reject)=>{
    let r=null;
    let finalTop='',alts=[],heard='';
    let settled=false;

    const finishError=(err)=>{
      if(settled)return;
      settled=true;
      reject(err);
    };

    const finishOk=()=>{
      if(settled)return;
      settled=true;
      const c=[finalTop].concat(alts).filter(Boolean);
      resolve({
        heard:finalTop||heard,
        alternatives:alts,
        pass:speechMatches(expected,c,profile)
      });
    };

    try{
      r=buildRecognition(profile);
    }catch(e){
      finishError(e);
      return;
    }

    r.onstart=()=>{
      if(onStatus)onStatus('ĐANG NGHE','');
    };

    r.onaudiostart=()=>{
      if(onStatus)onStatus('MIC ĐANG THU',heard);
    };

    r.onspeechstart=()=>{
      if(onStatus)onStatus('ĐÃ NHẬN GIỌNG NÓI',heard);
    };

    r.onresult=e=>{
      let interim='';

      for(let i=e.resultIndex;i<e.results.length;i++){
        const res=e.results[i];

        if(res.isFinal){
          finalTop=String(res[0]&&res[0].transcript||'').trim();
          alts=[];

          for(let j=0;j<res.length;j++){
            const t=String(res[j]&&res[j].transcript||'').trim();
            if(t&&!alts.includes(t))alts.push(t);
          }
        }else{
          interim+=String(res[0]&&res[0].transcript||'');
        }
      }

      heard=finalTop||interim.trim()||heard;
      if(onStatus)onStatus('ĐANG NGHE',heard);
    };

    r.onnomatch=()=>{
      if(onStatus)onStatus('CÓ TIẾNG NÓI – CHƯA NHẬN ĐƯỢC CHỮ',heard);
    };

    r.onerror=e=>{
      const code=String(e&&e.error||'');

      if(code==='no-speech'){
        if(onStatus)onStatus('KHÔNG PHÁT HIỆN TIẾNG NÓI',heard);
        return;
      }

      if(code==='aborted')return;

      let msg='Lỗi nhận diện giọng nói: '+code;

      if(code==='not-allowed'||code==='service-not-allowed'){
        msg=ttsIsIOS()?iosSpeechHelpMessage():'Micro hoặc dịch vụ nhận diện giọng nói chưa được cho phép.';
      }else if(code==='audio-capture'){
        msg='Không lấy được tín hiệu từ microphone.';
      }else if(code==='network'){
        msg='Lỗi kết nối dịch vụ nhận diện giọng nói.';
      }else if(code==='language-not-supported'){
        msg='Trình duyệt không hỗ trợ ngôn ngữ nhận diện đang cấu hình.';
      }

      if(onStatus)onStatus('LỖI STT: '+code,heard);
      finishError(new Error(msg));
    };

    r.onend=()=>{
      if(settled)return;
      finishOk();
    };

    try{
      r.start();
    }catch(e){
      finishError(e);
    }
  });
}

function viState(s){const m={RED:'ĐỎ',YELLOW:'VÀNG',BLUE:'XANH',GREEN:'XANH LÁ',DONE:'ĐÃ XONG',PENDING:'CHỜ',COMPLETED:'ĐÃ HOÀN THÀNH',AWAIT_CLIP:'CHỜ VIDEO',CLIP_MISSING:'THIẾU VIDEO',MISSING:'THIẾU',MISSED:'BỎ LỠ',STARTED:'ĐANG LÀM',PLANNED:'ĐÃ LẬP KẾ HOẠCH',RELEASED:'ĐÃ PHÁT',CLOSED:'ĐÃ ĐÓNG',ACTIVE:'ĐANG HOẠT ĐỘNG',TEST:'KIỂM THỬ','N/A':'—'};return m[String(s||'').toUpperCase()]||String(s||'')}

async function runOfficialSpeechTest(words,profile,phrases,hooks){
  const results=[],started=performance.now();for(let i=0;i<words.length;i++){if(hooks&&hooks.beforeWord)hooks.beforeWord(words[i],i,words.length);const r=await runOfficialSpeechWord(words[i],profile,phrases,hooks);r.videoOffsetSec=(r.wordStartPerf-started)/1000;delete r.wordStartPerf;results.push(r);if(hooks&&hooks.afterWord)hooks.afterWord(r,words[i],i,words.length);await new Promise(res=>setTimeout(res,Number((IEC_CONFIG&&IEC_CONFIG.NEXT_DELAY_SEC)||1)*1000));}return results;
}
function runOfficialSpeechWord(word,profile,phrases,hooks){
  return new Promise((resolve,reject)=>{
    let rec=null;
    let locked=false;
    let wordStart=performance.now();
    let firstSpeech=null;
    let firstAnswer='';
    let finalAnswer='';
    let alternatives=[];
    let restartCount=0;
    let voice=false;
    let current='';
    let deadline=null;
    let maxTimer=null;
    let againTimer=null;

    const reactionLimit=Number(IEC_CONFIG.REACTION_LIMIT_SEC||20);
    const restartWord=String(IEC_CONFIG.RESTART_WORD||'AGAIN').trim().toLowerCase();
    const maxRestart=Number(IEC_CONFIG.MAX_RESTART||1);
    const silence=Number(IEC_CONFIG.SILENCE_END_SEC||5);
    const maxSpeech=Number(IEC_CONFIG.MAX_SPEECH_SEC||20);

    const emit=(status,heard)=>{
      if(hooks&&hooks.status){
        hooks.status(
          status,
          heard||current,
          {
            firstAnswer,
            finalAnswer,
            restartCount,
            elapsed:firstSpeech===null
              ?(performance.now()-wordStart)/1000
              :(firstSpeech-wordStart)/1000
          }
        );
      }
    };

    const stopRec=(r)=>{
      if(!r)return;
      try{r.onend=null;r.abort()}catch(e){}
      if(rec===r)rec=null;
    };

    const abort=()=>{
      stopRec(rec);
      clearTimeout(deadline);
      clearTimeout(maxTimer);
      clearTimeout(againTimer);
    };

    const technicalFail=(message)=>{
      if(locked)return;
      locked=true;
      abort();
      emit('LỖI KỸ THUẬT','');
      reject(new Error(message||'Lỗi kỹ thuật nhận diện giọng nói. Lượt thi chưa bị tính.'));
    };

    const finish=(reason)=>{
      if(locked)return;
      locked=true;
      abort();

      if(!finalAnswer&&current){
        finalAnswer=current;
        alternatives=alternatives.length?alternatives:[current];
      }

      const reaction=firstSpeech===null?null:(firstSpeech-wordStart)/1000;
      const cands=[finalAnswer].concat(alternatives||[]).filter(Boolean);

      let result='PENDING';
      let fail='';

      if(!voice||reaction===null){
        result='RED';
        fail='NO_VOICE';
      }else if(reaction>reactionLimit){
        result='RED';
        fail='REACTION';
      }else if(word.english&&speechMatches(word.english,cands,profile)){
        result='PASS';
      }else if(!word.english){
        result='RECORDED';
      }else{
        result='PENDING';
        fail=finalAnswer?'STT_MISMATCH':'VOICE_NO_TEXT';
      }

      resolve({
        contentId:word.contentId,
        source:word.source||'',
        reaction:reaction,
        firstAnswer:firstAnswer,
        finalAnswer:finalAnswer,
        alternatives:alternatives,
        restartCount:restartCount,
        voiceDetected:voice,
        failReason:fail,
        result:result,
        wordStartPerf:wordStart
      });
    };

    const start=(mode)=>{
      if(locked)return;

      let localRec;
      try{
        localRec=buildRecognition(profile);
      }catch(e){
        technicalFail(String(e.message||e));
        return;
      }

      rec=localRec;
      let finalTop='';
      let alts=[];

      localRec.onstart=()=>{
        emit(
          mode==='REANSWER'
            ?'ĐANG NGHE – TRẢ LỜI LẠI'
            :mode==='AGAIN_WINDOW'
              ?'NÓI AGAIN NẾU MUỐN SỬA'
              :'ĐANG NGHE',
          ''
        );
      };

      // Xác nhận trình duyệt đã thực sự mở luồng audio từ micro.
      localRec.onaudiostart=()=>{
        emit('MIC ĐANG THU',current);
      };

      localRec.onspeechstart=()=>{
        voice=true;
        if(firstSpeech===null)firstSpeech=performance.now();

        clearTimeout(deadline);
        clearTimeout(maxTimer);
        maxTimer=setTimeout(()=>finish('MAX_SPEECH'),maxSpeech*1000);

        emit('ĐÃ NHẬN GIỌNG NÓI',current);
      };

      localRec.onresult=e=>{
        let interim='';

        for(let i=e.resultIndex;i<e.results.length;i++){
          const rs=e.results[i];

          if(rs.isFinal){
            finalTop=String(rs[0]&&rs[0].transcript||'').trim();
            alts=[];

            for(let j=0;j<rs.length;j++){
              const t=String(rs[j]&&rs[j].transcript||'').trim();
              if(t&&!alts.includes(t))alts.push(t);
            }
          }else{
            interim+=String(rs[0]&&rs[0].transcript||'');
          }
        }

        current=finalTop||interim.trim()||current;
        emit('ĐANG NGHE',current);

        if(!finalTop)return;

        const n=String(finalTop).trim().toLowerCase();

        if(n===restartWord){
          if(
            restartCount<maxRestart &&
            (performance.now()-wordStart)<=reactionLimit*1000
          ){
            restartCount++;
            finalAnswer='';
            alternatives=[];
            current='';
            emit('AGAIN '+restartCount+'/'+maxRestart,'');

            clearTimeout(maxTimer);
            stopRec(localRec);
            setTimeout(()=>start('REANSWER'),100);
          }else{
            finish('AGAIN_INVALID');
          }
          return;
        }

        if(mode==='PRIMARY'){
          firstAnswer=finalTop;
          finalAnswer=finalTop;
          alternatives=alts.slice();

          clearTimeout(maxTimer);
          stopRec(localRec);

          setTimeout(()=>start('AGAIN_WINDOW'),100);
          clearTimeout(againTimer);
          againTimer=setTimeout(()=>finish('ANSWER'),silence*1000);
        }else if(mode==='REANSWER'){
          finalAnswer=finalTop;
          alternatives=alts.slice();
          finish('ANSWER');
        }else if(mode==='AGAIN_WINDOW'){
          finish('ANSWER');
        }
      };

      localRec.onerror=e=>{
        if(locked)return;

        const err=String(e&&e.error||'');

        if(err==='no-speech'){
          return;
        }

        if(err==='aborted')return;

        if(['not-allowed','service-not-allowed','audio-capture','network','language-not-supported'].includes(err)){
          let viErr='lỗi nhận diện giọng nói: '+err;

          if((err==='not-allowed'||err==='service-not-allowed')&&ttsIsIOS()){
            technicalFail(iosSpeechHelpMessage()+' Lượt thi chưa bị tính.');
            return;
          }

          if(err==='audio-capture')viErr='không truy cập được micro';
          else if(err==='network')viErr='mất kết nối nhận diện giọng nói';
          else if(err==='not-allowed'||err==='service-not-allowed')viErr='micro/dịch vụ nhận diện chưa được cho phép';
          else if(err==='language-not-supported')viErr='ngôn ngữ nhận diện không được trình duyệt hỗ trợ';

          technicalFail(viErr.charAt(0).toUpperCase()+viErr.slice(1)+'. Lượt thi chưa bị tính.');
          return;
        }

        technicalFail('Lỗi nhận diện giọng nói: '+(err||'không xác định')+'. Lượt thi chưa bị tính.');
      };

      localRec.onend=()=>{
        if(locked)return;
        if(rec===localRec)rec=null;

        if(mode==='PRIMARY'&&firstSpeech===null){
          if(((performance.now()-wordStart)/1000)<reactionLimit){
            setTimeout(()=>start('PRIMARY'),80);
          }else{
            finish('REACTION');
          }
        }else if(mode==='AGAIN_WINDOW'||mode==='REANSWER'){
          finish('ANSWER');
        }
      };

      try{
        // Dừng TTS trước khi mở STT để tránh xung đột audio session trên mobile.
        stopTts();
        localRec.start();
      }catch(e){
        technicalFail((ttsIsIOS()?iosSpeechHelpMessage():'Không khởi động được micro/nhận diện giọng nói.')+' Lượt thi chưa bị tính.');
      }
    };

    deadline=setTimeout(()=>finish('REACTION'),reactionLimit*1000);
    start('PRIMARY');
  });
}

