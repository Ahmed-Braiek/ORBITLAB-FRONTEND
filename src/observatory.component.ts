import {CommonModule} from '@angular/common';
import {Component,EventEmitter,Input,OnInit,Output} from '@angular/core';
type Favorite={id:number;objectType:string;objectId:string;displayName:string;savedAt:string};
type ObservatoryList={id:number;name:string;description:string;createdAt:string};
type ListEntry={id:number;objectType:string;objectId:string;displayName:string;note:string;addedAt:string};
@Component({selector:'app-observatory',standalone:true,imports:[CommonModule],template:`
<section class="observatory-panel" role="dialog" aria-label="Personal observatory">
 <div class="obs-header"><div><span class="obs-label">PRIVATE · LOCAL DATABASE</span><h2>MY OBSERVATORY</h2></div><button (click)="close.emit()" aria-label="Close observatory">✕</button></div>
 <p class="obs-subtitle">Bookmark worlds and build your own observation lists. Data stays in your local MySQL database.</p>
 <div class="obs-error" *ngIf="error">{{error}}</div><div class="obs-notice" *ngIf="notice">{{notice}}</div>
 <button class="obs-primary" [disabled]="busy || isFavorite" (click)="saveSelected()">★ {{isFavorite?'CURRENT PLANET SAVED':'SAVE '+selectedName.toUpperCase()+' TO FAVORITES'}}</button>
 <div class="obs-section"><div class="obs-section-title">FAVORITES <span>{{favorites.length}}</span></div>
  <p class="obs-empty" *ngIf="favorites.length===0">No saved celestial objects yet.</p>
  <div class="obs-item" *ngFor="let item of favorites"><div><strong>{{item.displayName}}</strong><small>{{item.objectType}} · {{item.objectId}}</small></div><button (click)="removeFavorite(item.id)" [disabled]="busy" aria-label="Remove favorite">REMOVE</button></div>
 </div>
 <div class="obs-section"><div class="obs-section-title">OBSERVATION LISTS <span>{{lists.length}}</span></div>
  <form class="obs-form" (submit)="createList($event)"><input maxlength="100" required placeholder="New list name" [value]="newListName" (input)="newListName=readValue($event)" aria-label="New list name"><button [disabled]="busy || !newListName.trim()" type="submit">CREATE</button></form>
  <p class="obs-empty" *ngIf="lists.length===0">Create a list to organize your planned observations.</p>
  <div class="obs-list" *ngFor="let list of lists">
   <div class="obs-list-head"><button (click)="selectList(list.id)">{{openListId===list.id?'▾':'▸'}} {{list.name}}</button><button [disabled]="busy" (click)="removeList(list.id)" aria-label="Delete list">DELETE</button></div>
   <div *ngIf="openListId===list.id" class="obs-list-content">
    <button class="obs-add" [disabled]="busy || listedSelected" (click)="addSelectedToList(list.id)">+ {{listedSelected?'ALREADY IN LIST':'ADD '+selectedName.toUpperCase()}}</button>
    <p class="obs-empty" *ngIf="entries.length===0">This observation list is empty.</p>
    <div class="obs-item" *ngFor="let entry of entries"><div><strong>{{entry.displayName}}</strong><small>{{entry.note || entry.objectType}}</small></div><button [disabled]="busy" (click)="removeEntry(list.id,entry.id)">REMOVE</button></div>
   </div>
  </div>
 </div>
 <div class="obs-footer">Single local profile · No accounts or cloud synchronization in Phase 6</div>
</section>`})
export class ObservatoryComponent implements OnInit{
 @Input() selectedId='earth';@Input() selectedName='Earth';@Output() close=new EventEmitter<void>();
 favorites:Favorite[]=[];lists:ObservatoryList[]=[];entries:ListEntry[]=[];openListId?:number;
 newListName='';busy=false;error='';notice='';
 private readonly base='http://localhost:8080/api/observatory';
 get isFavorite(){return this.favorites.some(f=>f.objectType==='planet'&&f.objectId===this.selectedId);}
 get listedSelected(){return this.entries.some(e=>e.objectType==='planet'&&e.objectId===this.selectedId);}
 ngOnInit(){void this.refresh();}
 readValue(event:Event){return (event.target as HTMLInputElement).value;}
 private async request<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const response=await fetch(this.base+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  if(!response.ok)throw Error('Request failed ('+response.status+'). '+(response.status===409?'Object already exists.':response.status===404?'Not found.':'Check Spring Boot and local MySQL.'));
  if(response.status===204)return undefined as T;
  return await response.json() as T;
 }
 async refresh(){try{this.error='';const [favorites,lists]=await Promise.all([this.request<Favorite[]>('/favorites'),this.request<ObservatoryList[]>('/lists')]);this.favorites=favorites;this.lists=lists;if(this.openListId)await this.selectList(this.openListId);}catch(e){this.error=String(e);}}
 private async mutate(operation:()=>Promise<unknown>){this.busy=true;this.error='';this.notice='';try{await operation();await this.refresh();this.notice='Saved to local MySQL.';}catch(e){this.error=String(e);}finally{this.busy=false;}}
 async saveSelected(){if(this.isFavorite)return;await this.mutate(()=>this.request('/favorites','POST',{objectType:'planet',objectId:this.selectedId,displayName:this.selectedName}));}
 async removeFavorite(id:number){await this.mutate(()=>this.request('/favorites/'+id,'DELETE'));}
 async createList(event:Event){event.preventDefault();const name=this.newListName.trim();if(!name)return;await this.mutate(async()=>{await this.request('/lists','POST',{name,description:''});this.newListName='';});}
 async selectList(id:number){if(this.openListId===id&&this.entries.length){this.openListId=undefined;this.entries=[];return;}this.openListId=id;try{this.entries=await this.request<ListEntry[]>('/lists/'+id+'/entries');}catch(e){this.error=String(e);}}
 async removeList(id:number){await this.mutate(async()=>{await this.request('/lists/'+id,'DELETE');if(this.openListId===id){this.openListId=undefined;this.entries=[];}});}
 async addSelectedToList(id:number){if(this.listedSelected)return;await this.mutate(async()=>{await this.request('/lists/'+id+'/entries','POST',{objectType:'planet',objectId:this.selectedId,displayName:this.selectedName,note:''});this.entries=await this.request<ListEntry[]>('/lists/'+id+'/entries');});}
 async removeEntry(listId:number,entryId:number){await this.mutate(async()=>{await this.request('/lists/'+listId+'/entries/'+entryId,'DELETE');this.entries=await this.request<ListEntry[]>('/lists/'+listId+'/entries');});}
}
