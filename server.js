const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, pingInterval: 25000, pingTimeout: 20000 });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true, game: 'Spyfall Online' }));

const rooms = new Map();
const locations = [
  {name:'สนามบิน', roles:['นักบิน','พนักงานต้อนรับ','เจ้าหน้าที่รักษาความปลอดภัย','ผู้โดยสาร','ช่างอากาศยาน','พนักงานภาคพื้น']},
  {name:'โรงพยาบาล', roles:['ศัลยแพทย์','พยาบาล','คนไข้','เจ้าหน้าที่เวรเปล','ผู้อำนวยการ','เภสัชกร']},
  {name:'สถานีตำรวจ', roles:['ตำรวจสายตรวจ','นักสืบ','ผู้ต้องสงสัย','เจ้าหน้าที่พิสูจน์หลักฐาน','ผู้กำกับ','พนักงานสอบสวน']},
  {name:'เรือดำน้ำ', roles:['กัปตัน','ต้นหน','ช่างเครื่อง','นักประดาน้ำ','เจ้าหน้าที่โซนาร์','นักวิทยาศาสตร์']},
  {name:'โรงแรม', roles:['พนักงานต้อนรับ','แม่บ้าน','แขก VIP','พนักงานยกกระเป๋า','ผู้จัดการ','เชฟ']},
  {name:'ธนาคาร', roles:['ผู้จัดการ','เจ้าหน้าที่รักษาความปลอดภัย','พนักงานธนาคาร','ลูกค้า','เจ้าหน้าที่สินเชื่อ','พนักงานทำความสะอาด']},
  {name:'สถานีอวกาศ', roles:['ผู้บัญชาการ','นักบินอวกาศ','วิศวกร','นักวิจัย','แพทย์ประจำสถานี','เจ้าหน้าที่สื่อสาร']},
  {name:'คฤหาสน์', roles:['เจ้าของบ้าน','พ่อบ้าน','แม่บ้าน','แขก','คนสวน','พ่อครัว']},
  {name:'สวนสนุก', roles:['พนักงานขายตั๋ว','ช่างเครื่องเล่น','มาสคอต','เจ้าหน้าที่รักษาความปลอดภัย','นักท่องเที่ยว','ผู้จัดการ']},
  {name:'สถานีรถไฟ', roles:['นายสถานี','พนักงานขายตั๋ว','คนขับรถไฟ','พนักงานตรวจตั๋ว','ผู้โดยสาร','เจ้าหน้าที่รักษาความปลอดภัย']},
  {name:'พิพิธภัณฑ์', roles:['ภัณฑารักษ์','นักโบราณคดี','เจ้าหน้าที่รักษาความปลอดภัย','นักท่องเที่ยว','นักประวัติศาสตร์','ช่างภาพ']},
  {name:'ร้านอาหาร', roles:['เชฟ','บริกร','ลูกค้า','เจ้าของร้าน','พนักงานล้างจาน','นักวิจารณ์อาหาร']},
  {name:'สถานทูต', roles:['เอกอัครราชทูต','เลขานุการ','เจ้าหน้าที่รักษาความปลอดภัย','นักการทูต','ล่าม','ผู้มาติดต่อ']},
  {name:'ค่ายทหาร', roles:['ผู้บัญชาการ','ทหารใหม่','จ่า','แพทย์สนาม','พลขับ','เจ้าหน้าที่สื่อสาร']},
  {name:'โรงภาพยนตร์', roles:['ผู้กำกับ','นักแสดง','พนักงานขายตั๋ว','ผู้ชม','ช่างฉายภาพ','ผู้จัดการ']},
  {name:'เรือสำราญ', roles:['กัปตัน','พนักงานเสิร์ฟ','นักดนตรี','นักท่องเที่ยว','ช่างเครื่อง','พนักงานต้อนรับ']},
  {name:'มหาวิทยาลัย', roles:['อาจารย์','นักศึกษา','บรรณารักษ์','เจ้าหน้าที่ห้องแล็บ','อธิการบดี','ภารโรง']},
  {name:'ตลาดกลางคืน', roles:['พ่อค้า','แม่ค้า','นักท่องเที่ยว','พ่อครัว','เจ้าหน้าที่เทศกิจ','นักดนตรี']},
  {name:'สถานีข่าว', roles:['ผู้ประกาศข่าว','ช่างภาพ','นักข่าวภาคสนาม','บรรณาธิการ','ช่างเสียง','โปรดิวเซอร์']},
  {name:'ฐานวิจัยขั้วโลก', roles:['นักวิจัย','หัวหน้าทีม','แพทย์','ช่างเทคนิค','นักอุตุนิยมวิทยา','นักสำรวจ']}
];
const rand = arr => arr[crypto.randomInt(arr.length)];
const roomCode = () => { let c; do { c = crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase(); } while (rooms.has(c)); return c; };
const clean = s => String(s || '').trim().replace(/[<>]/g,'').slice(0,20);
const publicRoom = r => ({ code:r.code, name:r.name, hasPassword:!!r.passwordHash, maxPlayers:r.maxPlayers, talkMinutes:r.talkMinutes, phase:r.phase, players:r.players.map(p=>({id:p.id,name:p.name,host:p.id===r.hostId,online:!!p.socketId,score:p.score,active:r.round?.playerIds.includes(p.id) ?? false})), hostId:r.hostId, roundNumber:r.roundNumber, deadline:r.deadline });
function sendRoom(r) { io.to(r.code).emit('room:update', publicRoom(r)); }
function playerFor(r, socket) { return r.players.find(p=>p.socketId===socket.id); }
function sendPrivate(p, event, data) { if (p?.socketId) io.to(p.socketId).emit(event, data); }
function fail(socket, message) { socket.emit('app:error', {message}); }
function findRoom(socket, code) { const r=rooms.get(String(code||'').toUpperCase()); if(!r) fail(socket,'ไม่พบห้องนี้'); return r; }
function timer(r, ms, callback) { if(r.timer) clearTimeout(r.timer); r.deadline=Date.now()+ms; r.timer=setTimeout(()=>{r.timer=null; callback();},ms); }
function clearTimer(r) { if(r.timer) clearTimeout(r.timer); r.timer=null; r.deadline=null; }
function startRound(r) {
  clearTimer(r);
  const active = r.players.filter(p=>p.socketId);
  if(active.length<3){r.phase='WAITING';r.round=null;sendRoom(r);return;}
  const place=rand(locations), spy=rand(active);
  const shuffled=[...place.roles].sort(()=>Math.random()-.5);
  const assignments={}; let idx=0;
  for(const p of active){assignments[p.id]={isSpy:p.id===spy.id,role:p.id===spy.id?'สายลับ':shuffled[idx++%shuffled.length]};}
  r.roundNumber++;
  r.round={place:place.name,spyId:spy.id,playerIds:active.map(p=>p.id),assignments,votes:{},guessUsed:false};
  r.phase='DISCUSSION';
  for(const p of active){const a=assignments[p.id];sendPrivate(p,'game:card',{roundNumber:r.roundNumber,isSpy:a.isSpy,role:a.role,location:a.isSpy?null:place.name,talkMinutes:r.talkMinutes,deadline:Date.now()+r.talkMinutes*60000});}
  timer(r,r.talkMinutes*60000,()=>startVoting(r));
  sendRoom(r); io.to(r.code).emit('game:phase',{phase:r.phase,deadline:r.deadline,roundNumber:r.roundNumber});
}
function startVoting(r){
  if(r.phase!=='DISCUSSION')return;
  r.phase='VOTING';r.round.votes={};
  const eligible=r.players.filter(p=>r.round.playerIds.includes(p.id));
  eligible.forEach(p=>sendPrivate(p,'game:voting',{players:eligible.filter(x=>x.id!==p.id).map(x=>({id:x.id,name:x.name})),deadline:Date.now()+120000}));
  timer(r,120000,()=>finishVoting(r));
  io.to(r.code).emit('game:phase',{phase:r.phase,deadline:r.deadline});sendRoom(r);
}
function finishVoting(r){
  if(r.phase!=='VOTING')return;
  clearTimer(r);
  const counts={};Object.values(r.round.votes).forEach(id=>counts[id]=(counts[id]||0)+1);
  const max=Object.values(counts).length?Math.max(...Object.values(counts)):0;
  const leaders=Object.keys(counts).filter(id=>counts[id]===max);
  let winner, reason, caught=false;
  if(max===0){winner='SPY';reason='ไม่มีผู้เล่นลงคะแนน';}
  else if(leaders.length!==1){winner='SPY';reason='คะแนนโหวตเสมอกัน';}
  else if(leaders[0]===r.round.spyId){winner='PLAYERS';caught=true;reason='ผู้เล่นจับสายลับได้';}
  else {winner='SPY';reason='ผู้เล่นโหวตผิดคน';}
  const spy=r.players.find(p=>p.id===r.round.spyId);
  if(winner==='PLAYERS'){
    r.players.filter(p=>r.round.playerIds.includes(p.id)&&p.id!==spy.id).forEach(p=>p.score+=2);
    for(const [voter,target] of Object.entries(r.round.votes)) if(target===spy.id){const p=r.players.find(x=>x.id===voter);if(p)p.score+=1;}
  } else if(spy) spy.score+=2;
  const result={winner,reason,location:r.round.place,spy:spy?.name,spyId:r.round.spyId,caught,votes:r.players.filter(p=>r.round.playerIds.includes(p.id)).map(p=>({name:p.name,target:r.round.votes[p.id]?r.players.find(x=>x.id===r.round.votes[p.id])?.name||'ไม่พบผู้เล่น':'งดออกเสียง',count:counts[p.id]||0})),players:r.players.filter(p=>r.round.playerIds.includes(p.id)).map(p=>({name:p.name,role:r.round.assignments[p.id]?.role,isSpy:p.id===r.round.spyId,score:p.score})),scores:r.players.map(p=>({name:p.name,score:p.score}))};
  r.phase='RESULT';r.deadline=null;io.to(r.code).emit('game:result',result);sendRoom(r);
}

io.on('connection', socket => {
  socket.on('room:create',(data={})=>{
    const name=clean(data.playerName)||'ผู้เล่น';const maxPlayers=[3,4,5,6,7,8].includes(+data.maxPlayers)?+data.maxPlayers:6;
    const talkMinutes=[3,5,7,10].includes(+data.talkMinutes)?+data.talkMinutes:5;
    const password=String(data.password||''); if(password.length>20)return fail(socket,'รหัสผ่านยาวเกินไป');
    const code=roomCode(), id=crypto.randomUUID(), token=crypto.randomBytes(24).toString('hex');
    const p={id,token,name,socketId:socket.id,score:0};
    const r={code,name:clean(data.roomName)||'ห้องลับ',passwordHash:password?crypto.createHash('sha256').update(password).digest('hex'):null,maxPlayers,talkMinutes,hostId:id,players:[p],phase:'WAITING',round:null,roundNumber:0,timer:null,deadline:null};
    rooms.set(code,r);socket.join(code);socket.emit('room:joined',{room:publicRoom(r),playerId:id,token});sendRoom(r);
  });
  socket.on('room:inspect',data=>{const r=findRoom(socket,data?.code);if(!r)return;socket.emit('room:info',{code:r.code,name:r.name,hasPassword:!!r.passwordHash,phase:r.phase,players:r.players.length,maxPlayers:r.maxPlayers});});
  socket.on('room:join',(data={})=>{
    const r=findRoom(socket,data.code);if(!r)return;
    const name=clean(data.playerName)||'ผู้เล่น';
    if(r.players.length>=r.maxPlayers)return fail(socket,'ห้องเต็มแล้ว');
    if(r.passwordHash){const h=crypto.createHash('sha256').update(String(data.password||'')).digest('hex');if(h!==r.passwordHash)return fail(socket,'รหัสผ่านไม่ถูกต้อง');}
    const id=crypto.randomUUID(),token=crypto.randomBytes(24).toString('hex');const p={id,token,name,socketId:socket.id,score:0};r.players.push(p);socket.join(r.code);socket.emit('room:joined',{room:publicRoom(r),playerId:id,token});sendRoom(r);
  });
  socket.on('room:rejoin',(data={})=>{
    const r=findRoom(socket,data.code);if(!r)return;const p=r.players.find(x=>x.id===data.playerId&&x.token===data.token);if(!p)return fail(socket,'ไม่พบข้อมูลผู้เล่นเดิม กรุณาเข้าห้องใหม่');
    p.socketId=socket.id;socket.join(r.code);socket.emit('room:joined',{room:publicRoom(r),playerId:p.id,token:p.token,reconnected:true});
    if(r.round&&r.round.playerIds.includes(p.id)){
      const a=r.round.assignments[p.id];if(r.phase==='DISCUSSION')sendPrivate(p,'game:card',{roundNumber:r.roundNumber,isSpy:a.isSpy,role:a.role,location:a.isSpy?null:r.round.place,talkMinutes:r.talkMinutes,deadline:r.deadline});
      if(r.phase==='VOTING')sendPrivate(p,'game:voting',{players:r.players.filter(x=>r.round.playerIds.includes(x.id)&&x.id!==p.id).map(x=>({id:x.id,name:x.name})),deadline:r.deadline});
    }
    sendRoom(r);
  });
  socket.on('room:start',()=>{const r=[...rooms.values()].find(x=>x.players.some(p=>p.socketId===socket.id));if(!r)return;const p=playerFor(r,socket);if(p.id!==r.hostId)return fail(socket,'เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้');if(r.phase!=='WAITING'&&r.phase!=='RESULT')return fail(socket,'เกมกำลังดำเนินอยู่');if(r.players.filter(x=>x.socketId).length<3)return fail(socket,'ต้องมีผู้เล่นออนไลน์อย่างน้อย 3 คน');startRound(r);});
  socket.on('game:guess',(data={})=>{const r=[...rooms.values()].find(x=>x.players.some(p=>p.socketId===socket.id));if(!r||r.phase!=='DISCUSSION')return;const p=playerFor(r,socket);if(!r.round.playerIds.includes(p.id)||p.id!==r.round.spyId)return fail(socket,'เฉพาะสายลับเท่านั้นที่เดาสถานที่ได้');if(r.round.guessUsed)return fail(socket,'คุณใช้สิทธิ์เดาสถานที่ไปแล้ว');r.round.guessUsed=true;const correct=clean(data.location).toLowerCase()===r.round.place.toLowerCase();clearTimer(r);if(correct){p.score+=3;r.phase='RESULT';io.to(r.code).emit('game:result',{winner:'SPY',reason:'สายลับเดาสถานที่ถูกต้อง',location:r.round.place,spy:p.name,spyId:p.id,caught:false,guess:true,votes:[],players:r.players.filter(x=>r.round.playerIds.includes(x.id)).map(x=>({name:x.name,role:r.round.assignments[x.id]?.role,isSpy:x.id===p.id,score:x.score})),scores:r.players.map(x=>({name:x.name,score:x.score}))});sendRoom(r);}else{r.phase='RESULT';r.players.filter(x=>r.round.playerIds.includes(x.id)&&x.id!==p.id).forEach(x=>x.score+=2);io.to(r.code).emit('game:result',{winner:'PLAYERS',reason:'สายลับเดาสถานที่ผิด',location:r.round.place,spy:p.name,spyId:p.id,caught:false,guess:true,votes:[],players:r.players.filter(x=>r.round.playerIds.includes(x.id)).map(x=>({name:x.name,role:r.round.assignments[x.id]?.role,isSpy:x.id===p.id,score:x.score})),scores:r.players.map(x=>({name:x.name,score:x.score}))});sendRoom(r);}});
  socket.on('game:vote',(data={})=>{const r=[...rooms.values()].find(x=>x.players.some(p=>p.socketId===socket.id));if(!r||r.phase!=='VOTING')return;const p=playerFor(r,socket),target=String(data.targetId||'');if(!r.round.playerIds.includes(p.id))return fail(socket,'คุณไม่ได้อยู่ในรอบนี้');if(!r.round.playerIds.includes(target)||target===p.id)return fail(socket,'เลือกผู้เล่นที่ถูกต้อง');r.round.votes[p.id]=target;sendPrivate(p,'game:vote:ack',{ok:true});const eligible=r.round.playerIds.filter(id=>r.players.some(x=>x.id===id&&x.socketId));if(eligible.every(id=>r.round.votes[id]))finishVoting(r);});
  socket.on('room:next',()=>{const r=[...rooms.values()].find(x=>x.players.some(p=>p.socketId===socket.id));if(!r)return;const p=playerFor(r,socket);if(p.id!==r.hostId)return fail(socket,'เฉพาะเจ้าของห้องเท่านั้น');if(r.phase!=='RESULT')return fail(socket,'รอบนี้ยังไม่จบ');startRound(r);});
  socket.on('room:leave',()=>leave(socket));
  function leave(s){for(const [code,r] of rooms){const p=playerFor(r,s);if(!p)continue;p.socketId=null;s.leave(code);if(r.hostId===p.id){const next=r.players.find(x=>x.socketId);if(next)r.hostId=next.id;}if(r.phase==='DISCUSSION'||r.phase==='VOTING'){const active=r.round?.playerIds.filter(id=>r.players.some(x=>x.id===id&&x.socketId))||[];if(active.length<3){clearTimer(r);r.phase='WAITING';r.round=null;io.to(code).emit('game:cancelled',{message:'ผู้เล่นเหลือน้อยกว่า 3 คน รอบนี้ถูกยกเลิกโดยไม่คิดคะแนน'});}}sendRoom(r);if(r.players.every(x=>!x.socketId)){clearTimer(r);rooms.delete(code);}break;}}
  socket.on('disconnect',()=>leave(socket));
});
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log(`Spyfall Online running on http://localhost:${PORT}`));
