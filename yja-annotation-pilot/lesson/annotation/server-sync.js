/* v20: explicit, user-controlled server sync. No credentials in URLs or localStorage. */
(() => {
    'use strict';
    function start(){
        const node=document.getElementById('yja-server-config');
        if(!node)return;
        const engine=window.YJA_SERVER_ENGINE;
        const panel=document.createElement('aside');panel.className='yja-sync-panel';panel.setAttribute('aria-label','개인 판서 서버 저장');
        const title=document.createElement('strong');title.textContent='개인 판서 · 서버 저장';
        const note=document.createElement('span');note.setAttribute('role','status');
        const save=document.createElement('button'),load=document.createElement('button');save.type=load.type='button';save.textContent='서버 저장';load.textContent='서버 불러오기';
        const exportBtn=document.createElement('button'),remove=document.createElement('button');exportBtn.type=remove.type='button';exportBtn.textContent='서버 JSON 내보내기';remove.textContent='서버 판서 삭제';
        panel.append(title,save,load,exportBtn,remove,note);document.body.insertBefore(panel,document.body.firstChild);
        let config,version=null,baseline=null,busy=false,conflict=false,locked=false,hasRecord=false;
        const say=t=>note.textContent=t;
        try{config=JSON.parse(node.textContent);const url=new URL(config.endpoint,location.href);if(url.origin!==location.origin||url.protocol!=='https:'||typeof config.nonce!=='string'||!config.nonce||!engine)throw Error();config.endpoint=url.href;}
        catch{save.disabled=load.disabled=exportBtn.disabled=remove.disabled=true;say('설정 또는 엔진 오류 · 서버 사용 불가');return;}
        function refresh(){save.disabled=busy||locked||version===null||conflict;load.disabled=busy||locked;exportBtn.disabled=busy||locked;remove.disabled=busy||locked||conflict||!hasRecord;}
        function changed(){const raw=engine.snapshot();return raw===null||raw!==baseline;}
        async function request(body){
            const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
            try{
                const r=await fetch(config.endpoint,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json','X-YJA-Nonce':config.nonce},body:JSON.stringify(body),signal:ctrl.signal});
                if(r.status===401||r.status===403){locked=true;throw Error('로그인 또는 권한 만료 · 현재 판서 JSON 백업 후 다시 로그인');}
                if(r.status===409){conflict=true;throw Error('다른 세션의 저장과 충돌 · JSON 백업 후 서버 불러오기');}
                if(!r.ok)throw Error('서버 요청 실패 ('+r.status+') · JSON 백업 권장');
                const o=await r.json();if(!Number.isSafeInteger(o.version)||o.version<0)throw Error('서버 응답 오류');return o;
            }finally{clearTimeout(timer);}
        }
        async function read(initial=false){
            if(busy||locked)return;
            const before=engine.snapshot();if(before===null){say('필기 완료 후 다시 시도하세요');return;}
            if(!initial&&changed()&&!confirm('서버 판서로 교체할까요? 현재 판서는 먼저 JSON으로 백업하세요.'))return;
            busy=true;refresh();say('서버 읽는 중…');
            try{
                const r=await request({op:'load'});
                if((r.version===0&&r.payload!==null)||(r.payload!==null&&(!r.payload||typeof r.payload!=='object')))throw Error('서버 데이터 오류');
                if(engine.snapshot()!==before){say('읽기 중 판서 변경 · 적용하지 않음 · 다시 불러오기');return;}
                if(r.payload===null){
                    // No server record: never silently discard local ink. Explicit first save allowed.
                    baseline=initial?before:engine.clear();
                }else baseline=engine.restore(r.payload);
                version=r.version;hasRecord=r.payload!==null;conflict=false;say(r.payload===null?'서버 기록 없음 · 필요 시 저장':'서버 판서 복원 · 버전 '+version);
            }catch(e){say(e.message+' · 현재 판서 유지');}
            finally{busy=false;refresh();}
        }
        save.onclick=async()=>{
            if(busy||locked||version===null||conflict)return;const raw=engine.snapshot();if(raw===null){say('필기 완료 후 저장하세요');return;}
            busy=true;refresh();say('서버 저장 중…');
            try{const r=await request({op:'save',version,payload:JSON.parse(raw)});if(r.version!==version+1)throw Error('저장 응답 오류');version=r.version;hasRecord=true;baseline=raw;say(changed()?'저장 완료 · 추가 변경은 다시 저장':'서버 저장 완료 · 버전 '+version);}
            catch(e){say(e.message+' · 현재 판서 유지');}finally{busy=false;refresh();}
        };
        load.onclick=()=>read(false);
        // Export the committed server record, not the potentially divergent local copy.
        exportBtn.onclick=async()=>{
            if(busy||locked)return;busy=true;refresh();
            try{const r=await request({op:'load'});if(!r.payload){say('내보낼 서버 기록 없음');return;}
                const blob=new Blob([JSON.stringify(r.payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
                a.href=url;a.download='yja-server-annotation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);say('서버 JSON 내보내기 요청 완료');
            }catch(e){say(e.message+' · 현재 판서 유지');}finally{busy=false;refresh();}
        };
        remove.onclick=async()=>{
            if(busy||locked||conflict||!hasRecord)return;const before=engine.snapshot();if(before===null){say('필기 완료 후 다시 시도하세요');return;}
            if(!confirm('서버에 저장된 판서를 삭제할까요? 먼저 JSON 백업을 권장합니다. 현재 화면의 판서도 비웁니다.'))return;
            busy=true;refresh();say('서버 판서 삭제 중…');
            try{const r=await request({op:'delete',version});if(r.version!==version+1)throw Error('삭제 응답 오류');version=r.version;hasRecord=false;
                if(engine.snapshot()===before){baseline=engine.clear();say('서버 판서 삭제 완료 · 버전 '+version);}
                else{baseline=null;conflict=true;say('서버 판서 삭제 완료 · 추가 변경은 화면에 유지 · JSON 백업 후 불러오기');}
            }catch(e){say(e.message+' · 현재 판서 유지');}finally{busy=false;refresh();}
        };
        baseline=engine.snapshot();refresh();
        window.addEventListener('yja-server-change',()=>{if(!busy&&!locked&&!conflict&&changed())say(version===null?'서버 확인 전 · 현재 판서 JSON 백업 권장':'서버 미저장 변경 · 서버 저장 필요');});
        window.addEventListener('beforeunload',e=>{if(changed()||busy){e.preventDefault();e.returnValue='';}});
        read(true);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
