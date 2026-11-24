import {CommonModule} from '@angular/common';
import {Component,EventEmitter,Input,OnDestroy,OnInit,Output} from '@angular/core';
import {marked} from 'marked';
import DOMPurify from 'dompurify';

type Source={title:string;url:string};
type GuideResponse={answer:string;sources:Source[];navigatePlanet:string|null;model:string;grounded:boolean};
type Turn={role:'user'|'assistant';text:string;html:string;sources:Source[];planet:string|null;complete:boolean};

@Component({
 selector:'app-space-guide',standalone:true,imports:[CommonModule],
 template:`
 <button class="astra-launch" (click)="toggle()" [attr.aria-expanded]="open" aria-label="Open or close OrbitLab space guide">
  <span class="astra-launch-glyph">✦</span><span>{{open?'CLOSE GUIDE':'ASK ASTRA'}}</span><span class="astra-launch-glow"></span>
 </button>
 <section class="astra-panel" *ngIf="open" aria-label="OrbitLab space guide" role="dialog">
  <header class="astra-header"><div class="astra-avatar">✦</div><div><div class="astra-name">ASTRA <span>SPACE GUIDE</span></div><div class="astra-status"><span class="astra-led"></span>{{configured===false?'API KEY REQUIRED':'GEMINI · SPACE-ONLY ASSISTANT'}}</div></div><button class="astra-close" (click)="open=false" aria-label="Close chat">✕</button></header>
  <div class="astra-body" #historyPanel>
   <div class="astra-welcome" *ngIf="messages.length===0">
    <div class="astra-planet">✺</div><div class="astra-kicker">YOUR INTERACTIVE SPACE COMPANION</div>
    <h3>Curiosity has<br><em>no limits.</em></h3>
    <p>Explore the Solar System, discover what makes each world unique, or ask how OrbitLab works.</p>
    <div class="astra-chips"><button (click)="sendSuggestion('Why is Mars red?')">WHY IS MARS RED? ↗</button><button (click)="sendSuggestion('How do Saturn\'s rings form?')">SATURN'S RINGS ↗</button><button (click)="sendSuggestion('What does NASA Horizons provide to OrbitLab?')">ABOUT ORBITLAB ↗</button></div>
   </div>
   <div class="astra-message" *ngFor="let message of messages" [class.astra-assistant]="message.role==='assistant'" [class.astra-user]="message.role==='user'">
    <div class="astra-speaker">{{message.role==='assistant'?'✦ ASTRA':'YOU'}}</div>
    <div class="astra-message-content" *ngIf="message.role==='user'">{{message.text}}</div>
    <div class="astra-message-content astra-markdown" *ngIf="message.role==='assistant'" [innerHTML]="message.html"></div>
    <span class="astra-cursor" *ngIf="message.role==='assistant'&&!message.complete">▍</span>
    <div *ngIf="message.role==='assistant'&&message.complete" class="astra-message-footer">
     <button class="astra-navigate" *ngIf="message.planet" (click)="goTo(message.planet)">◎ EXPLORE {{message.planet | uppercase}} <span>↗</span></button>
     <div class="astra-sources" *ngIf="message.sources.length>0"><span>VERIFIED LINKED SOURCES</span><a *ngFor="let source of message.sources" [href]="source.url" target="_blank" rel="noopener noreferrer">↗ {{source.title}}</a></div>
     <div class="astra-no-sources" *ngIf="message.sources.length===0">No verified sources returned for this answer. Please independently verify important claims.</div>
    </div>
   </div>
   <div class="astra-thinking" *ngIf="loading"><span></span><span></span><span></span><small>ASTRA IS SEARCHING THE COSMOS</small></div>
   <div class="astra-error" role="alert" *ngIf="error">{{error}}</div>
   <div class="astra-key-help" *ngIf="configured===false">Set <code>GEMINI_API_KEY</code> in the backend terminal, then restart Spring Boot. Never paste your key in this chat.</div>
  </div>
  <form class="astra-composer" (submit)="submit($event)">
    <textarea maxlength="600" rows="2" [value]="draft" (input)="draft=readValue($event)" (keydown)="keyDown($event)" [disabled]="loading" aria-label="Ask a question about space" placeholder="Ask about planets, space or OrbitLab..."></textarea>
    <button type="submit" [disabled]="loading || draft.trim().length<2" aria-label="Send question">↗</button>
  </form>
  <div class="astra-caption"><span>✦ GEMINI FLASH-LITE</span><span>FREE-TIER QUOTAS APPLY · AI CAN MAKE MISTAKES</span></div>
 </section>`,
 styleUrl:'./space-guide.component.css'
})
export class SpaceGuideComponent implements OnInit,OnDestroy {
 @Input() selectedPlanet='earth';
 @Output() navigatePlanet=new EventEmitter<string>();
 open=false;loading=false;draft='';error='';configured:boolean|null=null;
 messages:Turn[]=[];
 private timer?:ReturnType<typeof setInterval>;
 private readonly api='http://localhost:8080/api/space-guide';
 async ngOnInit(){
  try{const res=await fetch(this.api+'/status');if(res.ok){const data=await res.json() as {configured:boolean};this.configured=data.configured;}}
  catch{this.error='Spring Boot is offline. Start the backend at localhost:8080.';}
 }
 ngOnDestroy(){if(this.timer)clearInterval(this.timer);}
 toggle(){this.open=!this.open;}
 readValue(e:Event){return (e.target as HTMLTextAreaElement).value;}
 keyDown(e:KeyboardEvent){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void this.send();}}
 submit(e:Event){e.preventDefault();void this.send();}
 sendSuggestion(q:string){this.draft=q;void this.send();}
 goTo(id:string){if(!['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'].includes(id))return;this.navigatePlanet.emit(id);this.open=false;}
 private render(text:string):string{
  const html=marked.parse(text,{async:false,breaks:true,gfm:true}) as string;
  return DOMPurify.sanitize(html,{USE_PROFILES:{html:true},FORBID_TAGS:['style','iframe','form','button','input','svg','math']});
 }
 private reveal(turn:Turn){
  if(this.timer)clearInterval(this.timer);
  const full=turn.text;let offset=0;turn.html='';
  this.timer=setInterval(()=>{
   offset=Math.min(full.length,offset+Math.max(5,Math.ceil(full.length/95)));
   turn.html=this.render(full.slice(0,offset));
   if(offset>=full.length){turn.complete=true;if(this.timer)clearInterval(this.timer);this.timer=undefined;}
  },22);
 }
 private async send(){
  const question=this.draft.trim();
  if(question.length<2||this.loading)return;
  this.draft='';this.error='';
  const history=this.messages.slice(-6).map(x=>({role:x.role,content:x.text.slice(0,1000)}));
  this.messages.push({role:'user',text:question,html:'',sources:[],planet:null,complete:true});
  this.loading=true;
  try{
   const res=await fetch(this.api+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:question,history,selectedPlanet:this.selectedPlanet})});
   if(!res.ok){
    if(res.status===503)throw Error('Gemini is not configured. Set GEMINI_API_KEY in Spring Boot and restart it.');
    if(res.status===429)throw Error('Gemini free-tier or local demo limit reached. Try again shortly.');
    throw Error('Space Guide unavailable (HTTP '+res.status+'). Check the backend and Gemini settings.');
   }
   const body=await res.json() as GuideResponse;
   const turn:Turn={role:'assistant',text:body.answer,html:'',sources:body.sources??[],planet:body.navigatePlanet,complete:false};
   this.messages.push(turn);this.reveal(turn);
  }catch(e){this.error=e instanceof Error?e.message:'Unexpected network error.';}
  finally{this.loading=false;}
 }
}
