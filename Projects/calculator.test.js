const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class Element {
    constructor() {
        this.dataset = {};
        this.hidden = false;
        this.inert = false;
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.classNames = new Set();
        this.classList = {
            add: name => this.classNames.add(name),
            remove: name => this.classNames.delete(name),
            contains: name => this.classNames.has(name),
            toggle: (name, enabled) => enabled ? this.classNames.add(name) : this.classNames.delete(name)
        };
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    addEventListener(key, listener) { (this.listeners[key] ||= []).push(listener); }
    dispatch(key, event = {}) { for (const listener of this.listeners[key] || []) listener(event); }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; }
    closest(selector) { return selector === 'button' ? this : null; }
    contains(element) { return element === this || this.children.includes(element); }
    get offsetWidth() { return 100; }
}

const ids = ['result', 'expression', 'history-list', 'empty-history', 'history-panel', 'history-toggle', 'history-indicator', 'calculator', 'scientific-keys', 'mode-label', 'mode-scientific', 'theme-toggle', 'theme-icon', 'back-calculator', 'clear-history', 'angle-toggle'];
const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
elements['history-panel'].hidden = true;
const wrap = new Element();
const display = new Element();
const meta = new Element();
const buttons = new Map();
for (const digit of '0123456789') buttons.set(`digit:${digit}`, Object.assign(new Element(), { dataset: { digit } }));
for (const operator of ['+', '-', '*', '/', '^']) buttons.set(`operator:${operator}`, Object.assign(new Element(), { dataset: { operator } }));
for (const action of ['clear', 'delete', 'percent', 'decimal', 'parentheses', 'equals', 'angle']) buttons.set(`action:${action}`, Object.assign(new Element(), { dataset: { action } }));
for (const scientific of ['sin', 'sqrt', 'log']) buttons.set(`scientific:${scientific}`, Object.assign(new Element(), { dataset: { scientific } }));
wrap.children = [...buttons.values()];
wrap.querySelector = selector => {
    const [, kind, value] = selector.match(/\[data-(digit|operator|action)="([^"]+)"\]/) || [];
    return buttons.get(`${kind}:${value}`);
};
const storage = new Map();
const document = {
    documentElement: { dataset: {} },
    listeners: {},
    getElementById: id => elements[id],
    querySelector: selector => selector === '.keys-wrap' ? wrap : selector === '.display' ? display : meta,
    querySelectorAll: selector => selector === '[data-operator]' ? [...buttons.values()].filter(button => button.dataset.operator) : [],
    createElement: () => new Element(),
    addEventListener(key, listener) { (this.listeners[key] ||= []).push(listener); },
    dispatch(key, event) { for (const listener of this.listeners[key] || []) listener(event); }
};
const context = {
    document,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: callback => { /* Keep the pressed class for assertions. */ return callback; },
    clearTimeout: () => { }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), context);
function click(kind, value) {
    const button = buttons.get(`${kind}:${value}`);
    assert.ok(button, `Missing ${kind}:${value}`);
    wrap.dispatch('click', { target: button });
    assert.ok(button.classList.contains('pressed'), `No glow for ${kind}:${value}`);
}
function digit(value) { for (const char of String(value)) click('digit', char); }
function key(value) {
    let prevented = false;
    document.dispatch('keydown', { key: value, target: { tagName: 'BODY' }, preventDefault: () => { prevented = true; } });
    assert.ok(prevented, `Keyboard input not handled: ${value}`);
}
function result() { return elements.result.textContent; }
function reset() { click('action', 'clear'); }

digit(12); click('operator', '+'); digit(3); click('action', 'equals');
assert.equal(result(), '15');
assert.equal(elements['history-list'].children.length, 1);
digit(7);
assert.equal(result(), '7', 'Entering a digit after equals starts a new calculation');
elements['history-toggle'].dispatch('click');
assert.equal(display.hidden, true);
assert.equal(wrap.hidden, true);
elements['back-calculator'].dispatch('click');
assert.equal(display.hidden, false);
assert.equal(wrap.hidden, false);
elements['theme-toggle'].dispatch('click');
assert.equal(document.documentElement.dataset.theme, 'light');
assert.equal(meta.content, '#f8f9fc');
assert.equal(storage.get('nenotech-calculator-theme-v1'), 'light');
reset();
click('action', 'parentheses'); digit(2); click('operator', '+'); digit(3); click('action', 'parentheses'); click('operator', '*'); digit(4); click('action', 'equals');
assert.equal(result(), '20', 'Grouped expression');
assert.match(elements.expression.textContent, /\(2 \+ 3\) × 4 =/);
reset();
key('('); key('8'); key('-'); key('3'); key(')'); key('/'); key('5'); key('Enter');
assert.equal(result(), '1', 'Keyboard grouping');
assert.ok(buttons.get('action:equals').classList.contains('pressed'), 'Keyboard glow');
reset();
key('2'); key('('); key('3'); key('+'); key('4'); key('Enter');
assert.equal(result(), '14', 'Implicit multiplication and automatic group closure');
reset();
key('('); key('2'); key('+'); key('('); key('3'); key('*'); key('4'); key(')'); key(')'); key('Enter');
assert.equal(result(), '14', 'Nested groups');
assert.match(elements.expression.textContent, /\(2 \+ \(3 × 4\)\) =/);
reset();
key('('); key('2'); key('+'); key('3'); key(')'); key('Enter');
assert.equal(result(), '5', 'Standalone group');
assert.match(elements.expression.textContent, /\(2 \+ 3\) =/);
reset();
key('8'); key('/'); key('0'); key('Enter');
assert.equal(result(), 'Error', 'Division by zero');
elements['mode-scientific'].dispatch('click');
assert.equal(elements['scientific-keys'].inert, false);
assert.equal(elements['mode-scientific'].getAttribute('aria-pressed'), 'true');
reset(); click('scientific', 'sin'); digit(90); click('action', 'equals');
assert.equal(result(), '1', 'Scientific function-first input');
reset(); digit(9); click('scientific', 'sqrt');
assert.equal(result(), '3', 'Scientific function-after input');
elements['mode-scientific'].dispatch('click');
assert.equal(elements['scientific-keys'].inert, true);
assert.equal(elements['mode-scientific'].getAttribute('aria-pressed'), 'false');
console.log('Calculator interactions passed.');
