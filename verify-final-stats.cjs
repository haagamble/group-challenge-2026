const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const nodes=new Map();
function node(){return {children:[],classList:{toggle(name,value){this[name]=value;}},append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];}};}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node};
const ctx=vm.createContext({assert,document,window:{location:{search:'?test=1'}},localStorage:{getItem:()=>null},URLSearchParams,Date,Intl});
vm.runInContext(fs.readFileSync(path.join(__dirname,'group-challenge.js'),'utf8').replace(/init\(\);\s*$/,''),ctx);
vm.runInContext(`
 const realParts=getChallengeDateParts;
 getChallengeDateParts=()=>realParts(new Date('2026-10-01T06:59:59Z'));
 assert.equal(hasChallengeEnded(),false);
 loadState='ready';renderFinalStats();assert.equal(document.getElementById('finalStats').classList.hidden,true);
 getChallengeDateParts=()=>realParts(new Date('2026-10-01T07:00:00Z'));
 assert.equal(hasChallengeEnded(),true);
 participants=[];entriesByUid={};let stats=computeFinalStats();
 assert.equal(stats.total,0);assert.equal(stats.leaders.rows.length,0);assert.equal(stats.leastPopular.rows.length,0);
 participants=[{uid:'a',name:'A <test>'},{uid:'b',name:'B'}];entriesByUid={a:{},b:{}};
 getDoubleActivityId=()=> 'pushups';
 const full=()=>({selected:['pushups','walking','squats'],values:{pushups:100,walking:100,squats:150}});
 for (const uid of ['a','b']) for(const day of ['01','02']) entriesByUid[uid]['2026-09-'+day]=full();
 stats=computeFinalStats();assert.equal(stats.leaders.rows.length,2);assert.equal(stats.leaders.value,800);
 for(let day=3;day<=30;day++) entriesByUid.a['2026-09-'+String(day).padStart(2,'0')]={selected:['walking'],values:{walking:5}};
 entriesByUid.b['2026-09-30']={selected:['walking'],values:{walking:0}};
 entriesByUid.a['2026-10-01']=full(); // outside month must not affect final stats
 stats=computeFinalStats();
 assert.equal(stats.total,1880);assert.equal(stats.leaders.value,1080);assert.equal(stats.leaders.rows[0].uid,'a');
 assert.equal(stats.allDays,1);assert.equal(stats.biggestClub.value,2);assert.equal(stats.biggestClub.rows.length,2);
 assert.equal(stats.bestDay.value,800);assert.equal(stats.bestDay.rows.length,2);assert.equal(stats.totalClubDays,4);
 assert.equal(stats.mostPopular.rows[0].id,'pushups');assert.equal(stats.mostPopular.value,800);
 assert.equal(stats.leastPopular.value,0);assert.ok(stats.leastPopular.rows.some(a=>a.id==='other'));
 assert.equal(computePlayerParticipationDays('a','2026-09-30'),30);
 assert.equal(computePlayerParticipationDays('b','2026-09-30'),2);
 renderFinalStats();assert.equal(document.getElementById('finalStats').classList.hidden,false);
 assert.equal(document.getElementById('finalStatsList').children.length,7);
 assert.ok(document.getElementById('finalStatsList').children[0].children[1].textContent.includes('A <test>'));
 ownedUid='a';renderPersonalActivities=()=>{};
 for(const id of ['historyButton','personalMonth','personalToday','personalAverage','personalParticipation']) els[id]=nodePlaceholder();
 function nodePlaceholder(){return {};}
 renderPersonalSummary();assert.equal(els.personalParticipation.textContent,'30/30');
 getChallengeDateParts=()=>({year:2026,month:9,day:30});renderPersonalSummary();assert.equal(els.personalParticipation.textContent,'30/30');
 getChallengeDateParts=()=>({year:2026,month:8,day:31});renderPersonalSummary();assert.equal(els.personalParticipation.textContent,'0/0');
`,ctx);
console.log('PASS: Pacific midnight visibility, September-only totals, ties, caps/doubles, full-month participation, zero-score entries, and final stats rendering.');
