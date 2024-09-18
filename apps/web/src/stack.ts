export default class Stack {
  items: any;
  constructor() {
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  push(item: any) {
    this.items.push(item);
  }

  pop() {
    return this.items.pop();
  }
}