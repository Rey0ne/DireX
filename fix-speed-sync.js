const fs=require('fs');
let c=fs.readFileSync('src/components/nodes/Scene3DNode.tsx','utf8');

// 1. Add maxSp in getTrackCamera
const oldGTC = 'const getTrackCamera=useCallback((prog:number):any=>{\n\t    const r=rigRef.current;if(!r)return null;\n\t    const sc=r.speedCurve.sort((a,b)=>a.time-b.time);\n\t    let sp=1;const targetTime=prog*r.duration;';
const newGTC = 'const getTrackCamera=useCallback((prog:number):any=>{\n\t    const r=rigRef.current;if(!r)return null;\n\t    const sc=r.speedCurve.sort((a,b)=>a.time-b.time);\n\t    const maxSp=sc.length>0?Math.max(...sc.map(k=>k.speed)):1;\n\t    let sp=1;const targetTime=prog*r.duration;';
c=c.replace(oldGTC,newGTC);

// 2. Normalize pp by maxSp
c=c.replace('const pp=Math.max(0,Math.min(1,prog*sp));','const pp=Math.max(0,Math.min(1,prog*sp/maxSp));');

// 3. Fix time display
c=c.replace('{(playTime||0).toFixed(1)}s / {rig.duration}s','{(()=>{const mx=rig.speedCurve.length>0?Math.max(...rig.speedCurve.map(k=>k.speed)):1;const ed=rig.duration/Math.max(0.1,mx);return (playTime||0).toFixed(1)+"s / "+ed.toFixed(1)+"s";})()}');

// 4. Fix time labels
c=c.replace('const dur=rig.duration;const labelStep=dur<=10?1:dur<=30?2:dur<=60?5:10;','const mx2=rig.speedCurve.length>0?Math.max(...rig.speedCurve.map(k=>k.speed)):1;const dur=rig.duration/Math.max(0.1,mx2);const labelStep=dur<=10?1:dur<=30?2:dur<=60?5:10;');

// 5. Fix tick marks
c=c.replaceAll('Math.ceil(rig.duration*fps)','Math.ceil(effD*fps)');
c=c.replace('const fps=30;const totalFrames=','const fps=30;const effD=rig.speedCurve.length>0?rig.duration/Math.max(0.1,Math.max(...rig.speedCurve.map(k=>k.speed))):rig.duration;const totalFrames=');

fs.writeFileSync('src/components/nodes/Scene3DNode.tsx',c);
console.log('Done');
