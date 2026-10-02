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
function ttsPresetLabel(code){const m={MALE_US:'Nam – Mỹ',FEMALE_UK:'Nữ – Anh'};return m[String(code||'').toUpperCase()]||String(code||'')}
function ttsAllowedPresets(){let v=IEC_CONFIG&&IEC_CONFIG.TTS_STUDENT_PRESETS;if(!Array.isArray(v))v=String(v||'MALE_US,FEMALE_UK').split(',');v=v.map(x=>String(x||'').trim().toUpperCase()).filter(x=>['MALE_US','FEMALE_UK'].includes(x));return v.length?v:['MALE_US','FEMALE_UK']}
function getTtsPreset(){const allowed=ttsAllowedPresets(),def=String((IEC_CONFIG&&IEC_CONFIG.TTS_DEFAULT_PRESET)||'MALE_US').toUpperCase();let saved='';try{saved=String(localStorage.getItem(IEC_TTS_STORAGE_KEY)||'').toUpperCase()}catch(e){}return allowed.includes(saved)?saved:(allowed.includes(def)?def:allowed[0])}
function setTtsPreset(code){const allowed=ttsAllowedPresets(),v=String(code||'').toUpperCase();if(!allowed.includes(v))return getTtsPreset();try{localStorage.setItem(IEC_TTS_STORAGE_KEY,v)}catch(e){}stopTts();return v}
function setupTtsPresetSelect(elOrId){const el=typeof elOrId==='string'?document.getElementById(elOrId):elOrId;if(!el)return;const allowed=ttsAllowedPresets(),selected=getTtsPreset();el.innerHTML='';allowed.forEach(code=>{const o=document.createElement('option');o.value=code;o.textContent=ttsPresetLabel(code);o.selected=code===selected;el.appendChild(o)});el.onchange=()=>setTtsPreset(el.value);initTtsVoices()}
function ttsVoiceGender(name){const n=String(name||'').toLowerCase();const female=['female','samantha','victoria','serena','karen','moira','tessa','fiona','ava','allison','susan','zira','hazel','salli','joanna','amy','emma','olivia','aria','jenny','sonia','libby'];const male=['male','alex','daniel','fred','tom','aaron','rishi','guy','david','mark','george','james','oliver','ryan','liam','matthew','andrew','arthur','albert','brian','joey','justin','matthew','eric'];if(female.some(x=>n.includes(x)))return 'FEMALE';if(male.some(x=>n.includes(x)))return 'MALE';return 'UNKNOWN'}
function ttsVoiceLang(v){return String(v&&v.lang||'').replace('_','-').toLowerCase()}
function ttsIsEnglishVoice(v){const l=ttsVoiceLang(v);return l==='en'||l.startsWith('en-')}
function refreshTtsVoices(){if(!('speechSynthesis' in window))return [];let v=[];try{v=window.speechSynthesis.getVoices()||[]}catch(e){}if(v.length){IEC_TTS_VOICES=v.slice();if(v.some(ttsIsEnglishVoice))IEC_TTS_VOICES_READY=true}return IEC_TTS_VOICES}
function initTtsVoices(){if(!('speechSynthesis' in window))return Promise.resolve([]);refreshTtsVoices();if(IEC_TTS_VOICES_READY)return Promise.resolve(IEC_TTS_VOICES);if(IEC_TTS_INIT_PROMISE)return IEC_TTS_INIT_PROMISE;IEC_TTS_INIT_PROMISE=new Promise(resolve=>{let done=false,ticks=0,poll=null,limit=null;const finish=()=>{if(done)return;done=true;if(poll)clearInterval(poll);if(limit)clearTimeout(limit);try{window.speechSynthesis.removeEventListener('voiceschanged',changed)}catch(e){}refreshTtsVoices();resolve(IEC_TTS_VOICES)};const changed=()=>{refreshTtsVoices();if(IEC_TTS_VOICES.some(ttsIsEnglishVoice))finish()};try{window.speechSynthesis.addEventListener('voiceschanged',changed)}catch(e){}poll=setInterval(()=>{ticks++;refreshTtsVoices();if(IEC_TTS_VOICES.some(ttsIsEnglishVoice)||ticks>=25)finish()},100);limit=setTimeout(finish,2600)}).finally(()=>{IEC_TTS_INIT_PROMISE=null});return IEC_TTS_INIT_PROMISE}
function selectTtsVoice(preset){const english=(refreshTtsVoices()||[]).filter(ttsIsEnglishVoice);if(!english.length)return null;const p=String(preset||getTtsPreset()).toUpperCase(),target=p==='FEMALE_UK'?'en-gb':'en-us',gender=p==='FEMALE_UK'?'FEMALE':'MALE';const exact=english.filter(v=>ttsVoiceLang(v).startsWith(target));const desired=a=>a.find(v=>ttsVoiceGender(v.name)===gender);const unknown=a=>a.find(v=>ttsVoiceGender(v.name)==='UNKNOWN');return desired(exact)||unknown(exact)||desired(english)||exact[0]||unknown(english)||english[0]||null}
async function ttsSpeak(text,rate=1,repeat=1){if(!('speechSynthesis' in window)){alert('Thiết bị này không hỗ trợ đọc văn bản.');return false}const content=String(text||'').trim();if(!content)return false;stopTts();await initTtsVoices();const preset=getTtsPreset(),voice=selectTtsVoice(preset);if(!voice){alert('Thiết bị chưa có giọng đọc tiếng Anh. Vui lòng cài/bật giọng English trong cài đặt hệ thống rồi thử lại. Hệ thống không dùng giọng tiếng Việt thay thế.');return false}let left=Math.max(1,Number(repeat)||1),cancelled=false;const targetLang=preset==='FEMALE_UK'?'en-GB':'en-US';return new Promise(resolve=>{const say=()=>{if(cancelled||left<=0){resolve(!cancelled);return}const u=new SpeechSynthesisUtterance(content);u.voice=voice;u.lang=String(voice.lang||targetLang);u.rate=Math.max(.2,Math.min(2,Number(rate)||1));u.onend=()=>{left--;if(left>0)setTimeout(say,180);else resolve(true)};u.onerror=e=>{const err=String(e&&e.error||'');if(err!=='canceled'&&err!=='interrupted')alert('Không phát được giọng đọc tiếng Anh trên thiết bị này. Hãy thử đổi giọng hoặc kiểm tra cài đặt TTS.');resolve(false)};try{window.speechSynthesis.speak(u)}catch(e){resolve(false)}};say()})}
function stopTts(){try{window.speechSynthesis.cancel()}catch(e){}}
if('speechSynthesis' in window){try{window.speechSynthesis.addEventListener('voiceschanged',refreshTtsVoices)}catch(e){}refreshTtsVoices()}
function normalizeSpeech(value){return String(value||'').trim().toLowerCase().replace(/\b4\b/g,'four').replace(/\b2\b/g,'two').replace(/[-/]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'')}
function speechMatches(expected,cands){const t=normalizeSpeech(expected);return !!t&&(cands||[]).some(x=>normalizeSpeech(x)===t)}
function buildRecognition(profile,phrases){
  const SR=window.webkitSpeechRecognition||window.SpeechRecognition;

  if(!SR){
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

  return r;
}
function oneShotSpeech(expected,profile,phrases,onStatus){
  return new Promise((resolve,reject)=>{
    let r=null;
    let finalTop='',alts=[],heard='';
    let settled=false;
    let allowContext=true;

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
        pass:speechMatches(expected,c)
      });
    };

    const start=()=>{
      if(settled)return;

      try{
        r=buildRecognition(profile,phrases,allowContext);
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

        // Chrome có thể hỗ trợ property .phrases nhưng model nhận diện hiện tại
        // lại không hỗ trợ contextual biasing. Fallback ngay, không tính là lỗi.
        if(code==='phrases-not-supported' && r && r.__iecContextApplied && allowContext){
          allowContext=false;
          try{r.onend=null;r.abort()}catch(_){}
          r=null;
          if(onStatus)onStatus('ĐANG NGHE','');
          setTimeout(start,100);
          return;
        }

        if(code==='no-speech'){
          if(onStatus)onStatus('KHÔNG PHÁT HIỆN TIẾNG NÓI',heard);
          return;
        }

        if(code==='aborted')return;

        let msg='Lỗi nhận diện giọng nói: '+code;
        if(code==='not-allowed'||code==='service-not-allowed'){
          msg='Micro hoặc dịch vụ nhận diện giọng nói chưa được cho phép.';
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
    };

    start();
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

    // Contextual biasing có thể không được model Chrome hỗ trợ dù property .phrases tồn tại.
    // Bắt đầu có context; nếu Chrome báo không hỗ trợ / no-speech bất thường,
    // tự fallback sang recognition thường trong cùng lượt, không tính lỗi cho SV.
    let allowContext=true;

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
      }else if(word.english&&speechMatches(word.english,cands)){
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
        localRec=buildRecognition(profile,phrases,allowContext);
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

        // Đây là điểm lỗi chính của bản cũ:
        // contextual biasing là experimental và Chrome có thể trả phrases-not-supported.
        // Bản cũ bỏ qua lỗi này nên giao diện chờ hết giờ như thể micro không thu.
        if(err==='phrases-not-supported' && localRec.__iecContextApplied && allowContext){
          allowContext=false;
          stopRec(localRec);
          emit('ĐANG NGHE','');
          setTimeout(()=>start(mode),100);
          return;
        }

        // Nếu model có context nhưng phiên đầu trả no-speech, thử lại ngay một lần
        // bằng recognition chuẩn giống Google demo.
        if(err==='no-speech'){
          if(localRec.__iecContextApplied && allowContext){
            allowContext=false;
            stopRec(localRec);
            emit('ĐANG NGHE','');
            setTimeout(()=>start(mode),100);
          }
          return;
        }

        if(err==='aborted')return;

        if(['not-allowed','service-not-allowed','audio-capture','network','language-not-supported'].includes(err)){
          let viErr='lỗi nhận diện giọng nói: '+err;

          if(err==='audio-capture')viErr='không truy cập được micro';
          else if(err==='network')viErr='mất kết nối nhận diện giọng nói';
          else if(err==='not-allowed'||err==='service-not-allowed')viErr='micro/dịch vụ nhận diện chưa được cho phép';
          else if(err==='language-not-supported')viErr='ngôn ngữ nhận diện không được trình duyệt hỗ trợ';

          technicalFail(viErr.charAt(0).toUpperCase()+viErr.slice(1)+'. Lượt thi chưa bị tính.');
          return;
        }

        // Không được nuốt lỗi lạ. Nếu có lỗi mới của Chrome, phải hiện ra ngay.
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
        localRec.start();
      }catch(e){
        technicalFail('Không khởi động được micro/nhận diện giọng nói. Lượt thi chưa bị tính.');
      }
    };

    deadline=setTimeout(()=>finish('REACTION'),reactionLimit*1000);
    start('PRIMARY');
  });
}

