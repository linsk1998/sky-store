import {watch, store, observable, action, computed, startRender, endRender, Binding} from "sky-store";

@store
class Counter{
	@observable
	count:number=0;
	@action
	increase(){
		this.count++;
	}
}
test('observable', () => {
	var myStore=new Counter();
	watch(myStore,"count",function(){
		expect(myStore.count).toBe(1);
		//console.log(1);
	});
	myStore.increase();
});

var computedCount=0;
@store
class Person{
	@observable
	birthYear:number=2010;
	@computed
	get age():number{
		computedCount++;
		return 2019-this.birthYear;
	}
	set age(value:number){
		this.birthYear=2019-value;
	}
}
test('computed', () => {
	var tom=new Person();
	var a=tom.age;
	a=tom.age;
	a=tom.age;
	expect(computedCount).toBe(1);
	tom.birthYear=2000;
	a=tom.age;
	a=tom.age;
	expect(computedCount).toBe(2);
});

test('binding', () => {
	var tom=new Person();
	startRender();
	var age=tom.age;
	endRender();
	var ageBinding:Binding=age as any;
	expect(typeof tom.age).toBe("number");
	expect(ageBinding instanceof Binding).toBe(true);
	expect(ageBinding.name).toBe("age");
	expect(ageBinding.value).toBe(9);
});