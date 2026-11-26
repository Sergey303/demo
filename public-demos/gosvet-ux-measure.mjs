import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:http';
const [htmlPath,outputDir]=process.argv.slice(2);
if(!htmlPath||!outputDir)throw new Error('Usage: node gosvet-ux-measure.mjs <built GosVet index.html> <output-dir>');
const html=await readFile(resolve(htmlPath));
await mkdir(outputDir,{recursive:true});
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 for(const [width,height] of [[1366,768],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/#/appointment/demo-001');
  await page.locator('#soap-complaint').fill('Рвота второй день, вялость');
  await page.locator('.clinical-hypotheses').waitFor();
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await page.screenshot({path:join(outputDir,'gosvet-'+width+'.png'),fullPage:true});
  const metrics=await page.evaluate(()=>{const r=s=>{const e=document.querySelector(s),b=e?.getBoundingClientRect();return b?{top:Math.round(b.top+window.scrollY),height:Math.round(b.height),width:Math.round(b.width)}:null;};return {pageHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,history:r('#soap-complaint'),assistant:r('.clinical-assistant'),exam:r('#soap-soapObjective'),assessment:r('#soap-soapAssessment'),plan:r('#soap-soapPlan'),review:r('.visit-review'),buttons:document.querySelectorAll('.clinical-answer-options button').length,visibleButtons:[...document.querySelectorAll('.clinical-answer-options button')].filter(e=>e.getClientRects().length&&!e.closest('details:not([open])')).length};});
  console.log(JSON.stringify({width,...metrics}));await page.close();
 }
}finally{await browser.close();server.close();}
