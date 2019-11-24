
const OPTIONS=Symbol("store");
export interface IStore{
	[OPTIONS]:IStoreOptions
}
export interface IStoreOptions{
	watchers:[string,Function][];
	computedFrom:[string,IStore,string][];
	computedTo:[string,IStore,string][];
	target:any;
	rels:IStoreProperty[];
	name?:string;
	path?:string;
}
interface IStoreProperty{
	store:IStore,
	property:string,
}
interface IDep{
	collectionFn?:Function,
	computed?:IStoreProperty,
	reaction?:Function
}

export function watch(store:any,key:string,callback:(store:IStore,key:string)=>void){
	store[OPTIONS].watchers.push([key,callback]);
}
//TODO:unwatch
var actionStack:Set<Function>[]=[];
function actionStart(){
	actionStack.push(new Set());
}
function actionEnd(){
	var actions=actionStack.pop();
	actions.forEach(callAll);
}
function callAll(fn:Function){
	try{fn()}catch(e){ console.error(e);}
}
var depsStack:IDep[]=[];
function getObservableValue(store:IStore,key:string):any{
	collectDeps(store,key);
	var options=store[OPTIONS];
	var value=options.target[key];
	if(isRendering && (typeof value==="string") && !value[OPTIONS]){
		return new Binding(key,value,options.path);
	}
	return value;
}
function arraySame3(newComputed:[any,any,any]){
	if(newComputed[0]===this[0] && newComputed[1]===this[1] && newComputed[2]===this[2]){
		return true;
	}
	return false;
}
function collectDeps(store:IStore,key:string){
	var options=store[OPTIONS];
	if(depsStack.length){
		var curDep=depsStack[depsStack.length-1];
		if(curDep.computed){
			var depStore=curDep.computed.store;
			var depKey=curDep.computed.property;
			var curDepOptions=depStore[OPTIONS];
			var newComputedFrom:[string,IStore,string]=[depKey,store,key];
			if(!curDepOptions.computedFrom.some(arraySame3,newComputedFrom)){
				curDepOptions.computedFrom.push(newComputedFrom);
			}
			var newComputedTo:[string,IStore,string]=[key,depStore,depKey];
			if(!options.computedTo.some(arraySame3,newComputedTo)){
				options.computedTo.push(newComputedTo);
			}
		}else if(curDep.reaction){
			//TODO:reaction
		}else{
			//TODO:autorun
		}
	}
}
function setObservableValue(store:IStore,key:string,value:any):void{
	var options=store[OPTIONS];
	options.target[key]=value;
	options.computedTo.forEach(triggerEachComputed);
	if(actionStack.length){
		var lastSet=actionStack[actionStack.length-1];
		options.watchers.filter(watchersFilter,arguments).forEach(addToAction,lastSet);
	}else{
		options.watchers.filter(watchersFilter,arguments).forEach(callAllWatchers);
	}
}
function watchersFilter(watcher:[string,Function]){
	if(watcher[0]==this[1]){
		return true;
	}
	return false;
}
function addToAction(watcher:[string,Function]){
	this.add(watcher[1]);
}
function callAllWatchers(watcher:[string,Function]){
	try{watcher[1]()}catch(e){ console.log(e);}
}
function triggerEachComputed(options:[string,IStore,string]){
	var store=options[1];
	var key=options[2];
	delete store[OPTIONS].target[key];
}
function getComputedValue(store:IStore,property:string,getter:Function):any{
	var options=store[OPTIONS];
	if(!Object.prototype.hasOwnProperty.call(options.target,property)){
		depsStack.push({computed:{store,property}});
		try{
			options.target[property]=getter.call(store);
		}catch(e){console.error(e)}
		depsStack.pop();
	}
	collectDeps(store,property);
	var value=options.target[property];
	if(isRendering && (typeof value==="string") && !value[OPTIONS]){
		return new Binding(property,value,options.path);
	}
	return value;
}

function setComputedValue(store:IStore,property:string,value:any,setter:Function):void{
	try{
		actionStart();
		setter.call(store,value);
	}catch(e){
		console.error(e);
	}finally{
		actionEnd();
	}
}
const KEY_OBSERVABLE=Symbol("observable");
const KEY_COMPUTED=Symbol("computed");
const KEY_ACTION=Symbol("action");
export function dirct(prototype:any,prop:string){
	prototype[prop]=void 0;
}
export function observable(prototype:any,prop:string){
	var obs=prototype.constructor[KEY_OBSERVABLE];
	if(!obs){
		obs=prototype.constructor[KEY_OBSERVABLE]=new Array();
	}
	obs.push(prop);
	Reflect.defineProperty(prototype,prop,{
		get:function(){
			return getObservableValue(this,prop);
		},
		set:function(value){
			setObservableValue(this,prop,value);
		},
		enumerable:true
	});
};

export function computed(prototype:any,prop:string,descriptor?:PropertyDescriptor){
	if(descriptor){
		computed.accessor.apply(this,arguments);
	}else{
		computed.method.apply(this,arguments);
	}
};
computed.method=function(prototype:any,prop:string,undefined?:PropertyDescriptor){
	var computeds=prototype.constructor[KEY_COMPUTED];
	if(!computeds){
		computeds=prototype.constructor[KEY_COMPUTED]=new Array();
	}
	computeds.push(prop);
	var method=prototype[prop];
	prototype[prop]=function(){
		return getComputedValue(this,prop,method);
	};
};

computed.accessor=function(prototype:any,prop:string,descriptor:PropertyDescriptor){
	var computeds=prototype.constructor[KEY_COMPUTED];
	if(!computeds){
		computeds=prototype.constructor[KEY_COMPUTED]=new Array();
	}
	computeds.push(prop);
	var getter=descriptor.get;
	if(getter){
		descriptor.get=function(){
			return getComputedValue(this,prop,getter);
		};
	}
	var setter=descriptor.set;
	if(setter){
		descriptor.set=function(value){
			setComputedValue(this,prop,value,setter);
		};
	}
};
export function action(prototype:any,prop:string,undefined?:PropertyDescriptor){
	var actions=prototype.constructor[KEY_ACTION];
	if(!actions){
		actions=prototype.constructor[KEY_ACTION]=new Array();
	}
	actions.push(prop);
	
	var method=prototype[prop];
	prototype[prop]=function(){
		try{
			actionStart();
			var r=method.apply(this,arguments);
		}catch(e){
			console.error(e);
		}finally{
			actionEnd();
		}
		return r;
	};
};
export function store(Store:any){
	if(Object.defineProperties){
		return createStore(Store);
	}else{
		return createVBStore(Store);
	}
}
function createStore(Store:any){
	function Class(){
		var me:IStore=Object.create(Store.prototype);
		me[OPTIONS]={
			watchers:[],
			target:{},
			computedFrom:[],
			computedTo:[]
		};
		Store.call(me);
		return me;
	}
	return Class as any;
}
var isRendering:boolean=false;
export function startRender(){
	isRendering=true;
}
export function endRender(){
	isRendering=false;
}
export class Binding{
	subject:any;
	name:string;
	value:any;
	path:string;
	constructor(name:string,value:any,path:string){
		this.name=name;
		this.value=value;
		this.path=path?name:path+"."+name;
	}
}