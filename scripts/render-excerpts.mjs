import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(process.argv[2]||path.join(root,'../earthsiege-reverse/analysis/music'));
const rows=JSON.parse(await fs.readFile(path.join(root,'public/audio/catalogue.json'),'utf8')),provenance=[];
for(const row of rows){const input=path.join(source,row.source),output=path.join(root,'public/audio',row.file);
 const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(row.start),'-i',input,'-t',String(row.seconds),'-map_metadata','-1','-c:a','flac','-compression_level','12',output],{stdio:'inherit'});
 if(result.status!==0)throw Error('Excerpt render failed: '+row.file);
 const hash=async f=>crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
 provenance.push({...row,source_sha256:await hash(input),excerpt_sha256:await hash(output),encoding:'FFmpeg FLAC compression level 12; unchanged decoded sample amplitude'});console.log(row.file);
}
await fs.writeFile(path.join(root,'public/audio/provenance.json'),JSON.stringify(provenance,null,2)+'\n');
