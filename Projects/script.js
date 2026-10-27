(() => {
    'use strict';

    const resultElement = document.getElementById('result');
    const expressionElement = document.getElementById('expression');
    const historyList = document.getElementById('history-list');
    const emptyHistory = document.getElementById('empty-history');
    const historyPanel = document.getElementById('history-panel');
    const historyToggle = document.getElementById('history-toggle');
    const historyIndicator = document.getElementById('history-indicator');
    const calculator = document.getElementById('calculator');
    const scientificKeys = document.getElementById('scientific-keys');
    const modeLabel = document.getElementById('mode-label');
    const modeToggle = document.getElementById('mode-scientific');
    const keysWrap = document.querySelector('.keys-wrap');
    const display = document.querySelector('.display');
    const storageKey = 'nenotech-calculator-history-v1';
    const themeKey = 'nenotech-calculator-theme-v1';
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };
    const maxDigits = 14;
    let current = '0';
    let previous = null;
    let operator = null;
    let waitingForNext = false;
    let justEvaluated = false;
    let expression = '';
    let error = false;
    let history = [];
    let scientificMode = false;
    let degrees = true;
    let pendingFunction = null;
    let operandEntered = false;
    let groups = [];
    let groupedText = null;
    let leftText = null;
    const glowTimers = new WeakMap();

    function format(value) {
        if (!Number.isFinite(value)) return 'Error';
        if (value === 0) return '0';
        if (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-7) {
            return value.toExponential(6).replace('e+', 'e');
        }
        return value.toLocaleString('en-US', { maximumFractionDigits: 10 });
    }

    function render() {
        resultElement.textContent = error ? 'Error' : format(Number(current));
        const prefix = groups.map(group => `${group.prefix}(`).join('');
        const visibleExpression = `${prefix}${expression}${pendingFunction ? `${expression ? ' ' : ''}${pendingFunction}(` : ''}`;
        expressionElement.textContent = visibleExpression || '\u00a0';
        resultElement.classList.toggle('compact', resultElement.textContent.length > 10);
        resultElement.classList.toggle('tiny', resultElement.textContent.length > 16);
        document.querySelectorAll('[data-operator]').forEach(button => {
            button.classList.toggle('active', button.dataset.operator === operator && waitingForNext);
        });
    }

    function reset() {
        current = '0';
        previous = null;
        operator = null;
        waitingForNext = false;
        justEvaluated = false;
        expression = '';
        error = false;
        pendingFunction = null;
        operandEntered = false;
        groups = [];
        groupedText = null;
        leftText = null;
        render();
    }

    function showError(message) {
        current = '0';
        previous = null;
        operator = null;
        waitingForNext = false;
        justEvaluated = false;
        pendingFunction = null;
        operandEntered = false;
        groups = [];
        groupedText = null;
        leftText = null;
        expression = message;
        error = true;
        render();
    }

    function inputDigit(digit) {
        if (error) reset();
        if (justEvaluated) { expression = ''; current = '0'; justEvaluated = false; }
        groupedText = null;
        if (waitingForNext) {
            current = digit;
            waitingForNext = false;
        } else if (current.replace(/\D/g, '').length < maxDigits) {
            current = current === '0' ? digit : current === '-0' ? '-' + digit : current + digit;
        }
        operandEntered = true;
        render();
    }

    function inputDecimal() {
        if (error) reset();
        if (justEvaluated) { expression = ''; current = '0'; justEvaluated = false; }
        groupedText = null;
        if (waitingForNext) {
            current = '0.';
            waitingForNext = false;
        } else if (!current.includes('.')) {
            current += '.';
        }
        operandEntered = true;
        render();
    }

    function calculate(left, right, operation) {
        let value;
        switch (operation) {
            case '+': value = left + right; break;
            case '-': value = left - right; break;
            case '*': value = left * right; break;
            case '/': value = right === 0 ? NaN : left / right; break;
            case '^': value = Math.pow(left, right); break;
            default: return right;
        }
        return Number.isFinite(value) ? Number(value.toPrecision(12)) : NaN;
    }

    function selectOperator(nextOperator) {
        if (error) return;
        if (pendingFunction) resolvePending();
        if (error) return;
        if (operator && !waitingForNext) {
            const answer = calculate(previous, Number(current), operator);
            if (!Number.isFinite(answer)) return showError('Undefined result');
            leftText = `${leftText || format(previous)} ${symbols[operator]} ${groupedText || format(Number(current))}`;
            current = String(answer);
            previous = answer;
        } else if (!operator || justEvaluated) {
            previous = Number(current);
            leftText = groupedText || format(previous);
        }
        operator = nextOperator;
        expression = `${leftText} ${symbols[operator]}`;
        waitingForNext = true;
        operandEntered = false;
        justEvaluated = false;
        groupedText = null;
        render();
    }

    function openGroup() {
        if (error) reset();
        if (pendingFunction) return;
        if (operandEntered && !waitingForNext) selectOperator('*');
        if (groups.length >= 12) return;
        groups.push({ current, previous, operator, waitingForNext, expression, leftText, prefix: expression ? `${expression} ` : '' });
        current = '0';
        previous = null;
        operator = null;
        waitingForNext = false;
        expression = '';
        leftText = null;
        groupedText = null;
        operandEntered = false;
        justEvaluated = false;
        render();
    }

    function closeGroup() {
        if (!groups.length || error) return;
        if (pendingFunction) resolvePending();
        if (error || waitingForNext || !operandEntered) return;
        const right = Number(current);
        let answer = right;
        const innerText = operator ? `${leftText || format(previous)} ${symbols[operator]} ${groupedText || format(right)}` : groupedText || format(right);
        if (operator) answer = calculate(previous, right, operator);
        if (!Number.isFinite(answer)) return showError('Undefined result');
        const group = groups.pop();
        current = String(answer);
        previous = group.previous;
        operator = group.operator;
        waitingForNext = false;
        expression = group.expression;
        leftText = group.leftText;
        groupedText = `(${innerText})`;
        operandEntered = true;
        justEvaluated = false;
        render();
    }

    function persistHistory() {
        try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (_) { /* Storage can be unavailable. */ }
    }

    function renderHistory() {
        historyList.replaceChildren();
        emptyHistory.hidden = history.length > 0;
        historyIndicator.hidden = history.length === 0;
        history.forEach(entry => {
            const item = document.createElement('li');
            const button = document.createElement('button');
            const operation = document.createElement('span');
            const answer = document.createElement('span');
            button.type = 'button';
            button.className = 'history-item';
            button.title = 'Use this result';
            button.setAttribute('aria-label', `Use result ${format(entry.value)} from ${entry.expression}`);
            operation.className = 'history-expression';
            operation.textContent = entry.expression;
            answer.className = 'history-answer';
            answer.textContent = format(entry.value);
            button.append(operation, answer);
            button.addEventListener('click', () => {
                reset();
                current = String(entry.value);
                expression = 'From history';
                justEvaluated = true;
                showHistory(false);
                render();
            });
            item.append(button);
            historyList.append(item);
        });
    }

    function saveResult(text, answer) {
        history.unshift({ expression: text, value: answer });
        history = history.slice(0, 20);
        persistHistory();
        renderHistory();
    }

    function equals() {
        if (error) return;
        if (pendingFunction) resolvePending();
        if (error || waitingForNext) return;
        while (groups.length) {
            closeGroup();
            if (error || waitingForNext || !operandEntered) return;
        }
        if (!operator) {
            if (groupedText) {
                expression = `${groupedText} =`;
                saveResult(expression, Number(current));
                groupedText = null;
                justEvaluated = true;
                render();
            }
            return;
        }
        const right = Number(current);
        const text = `${leftText || format(previous)} ${symbols[operator]} ${groupedText || format(right)} =`;
        const answer = calculate(previous, right, operator);
        if (!Number.isFinite(answer)) return showError(operator === '/' && right === 0 ? 'Cannot divide by zero' : 'Undefined result');
        current = String(answer);
        previous = null;
        operator = null;
        waitingForNext = false;
        justEvaluated = true;
        expression = text;
        leftText = null;
        groupedText = null;
        saveResult(text, answer);
        render();
    }

    function changeSign() {
        if (error) return;
        if (waitingForNext) { current = '-0'; waitingForNext = false; }
        else current = current.startsWith('-') ? current.slice(1) : '-' + current;
        groupedText = null;
        operandEntered = true;
        if (justEvaluated) { expression = ''; justEvaluated = false; }
        render();
    }

    function percent() {
        if (error) return;
        const value = waitingForNext ? 0 : Number(current);
        const answer = previous !== null && !waitingForNext && (operator === '+' || operator === '-')
            ? previous * value / 100 : value / 100;
        current = String(Number(answer.toPrecision(12)));
        groupedText = null;
        waitingForNext = false;
        operandEntered = true;
        if (justEvaluated) { expression = ''; justEvaluated = false; }
        render();
    }

    function deleteLast() {
        if (error) return reset();
        if (waitingForNext) return;
        if (justEvaluated) { expression = ''; justEvaluated = false; }
        if (groupedText) { groupedText = null; current = '0'; }
        else current = current.length <= 1 || (current.length === 2 && current.startsWith('-')) ? '0' : current.slice(0, -1);
        operandEntered = current !== '0';
        render();
    }

    function resolvePending() {
        if (!pendingFunction) return;
        const name = pendingFunction;
        pendingFunction = null;
        useScientific(name, true);
    }

    function factorial(value) {
        if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
        let answer = 1;
        for (let n = 2; n <= value; n++) answer *= n;
        return answer;
    }

    function useScientific(name, resolving = false) {
        if (error) reset();
        const isConstant = name === 'pi' || name === 'e';
        if (!resolving && !isConstant && !operandEntered && !justEvaluated) {
            pendingFunction = name;
            render();
            return;
        }
        if (waitingForNext) { current = '0'; waitingForNext = false; }
        const value = Number(current);
        const angle = degrees ? value * Math.PI / 180 : value;
        let answer;
        let text;
        switch (name) {
            case 'pi': answer = Math.PI; text = 'π'; break;
            case 'e': answer = Math.E; text = 'e'; break;
            case 'sin': answer = Math.sin(angle); text = `sin(${format(value)} ${degrees ? 'deg' : 'rad'})`; break;
            case 'cos': answer = Math.cos(angle); text = `cos(${format(value)} ${degrees ? 'deg' : 'rad'})`; break;
            case 'tan': answer = Math.abs(Math.cos(angle)) < 1e-12 ? NaN : Math.tan(angle); text = `tan(${format(value)} ${degrees ? 'deg' : 'rad'})`; break;
            case 'log': answer = Math.log10(value); text = `log(${format(value)})`; break;
            case 'ln': answer = Math.log(value); text = `ln(${format(value)})`; break;
            case 'sqrt': answer = Math.sqrt(value); text = `√(${format(value)})`; break;
            case 'square': answer = value ** 2; text = `(${format(value)})²`; break;
            case 'cube': answer = value ** 3; text = `(${format(value)})³`; break;
            case 'inverse': answer = 1 / value; text = `1 / (${format(value)})`; break;
            case 'factorial': answer = factorial(value); text = `${format(value)}!`; break;
            case 'abs': answer = Math.abs(value); text = `|${format(value)}|`; break;
            case 'exp': answer = Math.exp(value); text = `e^(${format(value)})`; break;
            default: return;
        }
        if (!Number.isFinite(answer)) return showError('Undefined result');
        answer = Number(answer.toPrecision(12));
        if (Math.abs(answer) < 1e-12) answer = 0;
        current = String(answer);
        groupedText = null;
        if (operator) {
            expression = `${leftText || format(previous)} ${symbols[operator]}`;
            justEvaluated = false;
        } else {
            expression = isConstant ? text : `${text} =`;
            justEvaluated = true;
            if (!isConstant) saveResult(expression, answer);
        }
        operandEntered = true;
        render();
    }

    function showHistory(open) {
        historyPanel.hidden = !open;
        keysWrap.hidden = open;
        display.hidden = open;
        historyToggle.classList.toggle('active', open);
        historyToggle.setAttribute('aria-expanded', String(open));
        historyToggle.setAttribute('aria-label', open ? 'Close calculation history' : 'Show calculation history');
    }

    function setScientific(enabled) {
        if (!enabled && pendingFunction) resolvePending();
        scientificMode = enabled;
        calculator.classList.toggle('scientific-mode', enabled);
        scientificKeys.inert = !enabled;
        scientificKeys.setAttribute('aria-hidden', String(!enabled));
        modeToggle.classList.toggle('active', enabled);
        modeToggle.setAttribute('aria-pressed', String(enabled));
        modeToggle.setAttribute('aria-label', enabled ? 'Turn off scientific mode' : 'Turn on scientific mode');
        modeLabel.textContent = enabled ? `SCIENTIFIC MODE · ${degrees ? 'DEG' : 'RAD'}` : 'STANDARD';
    }

    function handleAction(action) {
        switch (action) {
            case 'clear': reset(); break;
            case 'sign': changeSign(); break;
            case 'percent': percent(); break;
            case 'delete': deleteLast(); break;
            case 'parentheses':
                if (groups.length && operandEntered && !waitingForNext) closeGroup();
                else openGroup();
                break;
            case 'decimal': inputDecimal(); break;
            case 'equals': equals(); break;
            case 'angle':
                degrees = !degrees;
                document.getElementById('angle-toggle').textContent = degrees ? 'Deg' : 'Rad';
                modeLabel.textContent = `SCIENTIFIC MODE · ${degrees ? 'DEG' : 'RAD'}`;
                break;
        }
    }

    function glow(button) {
        if (!button) return;
        clearTimeout(glowTimers.get(button));
        button.classList.remove('pressed');
        void button.offsetWidth;
        button.classList.add('pressed');
        glowTimers.set(button, setTimeout(() => button.classList.remove('pressed'), 440));
    }

    keysWrap.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || !keysWrap.contains(button)) return;
        glow(button);
        if (button.dataset.digit !== undefined) inputDigit(button.dataset.digit);
        else if (button.dataset.operator) selectOperator(button.dataset.operator);
        else if (button.dataset.scientific) useScientific(button.dataset.scientific);
        else handleAction(button.dataset.action);
    });

    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName)) return;
        const key = event.key;
        if (key === 'Escape' && !historyPanel.hidden) {
            showHistory(false);
        } else {
            if (!historyPanel.hidden) return;
            let button;
            if (/^[0-9]$/.test(key)) { inputDigit(key); button = keysWrap.querySelector(`[data-digit="${key}"]`); }
            else if (['+', '-', '*', '/'].includes(key) || (key === '^' && scientificMode)) { selectOperator(key); button = keysWrap.querySelector(`[data-operator="${key}"]`); }
            else if (key === '(') { openGroup(); button = keysWrap.querySelector('[data-action="parentheses"]'); }
            else if (key === ')') { closeGroup(); button = keysWrap.querySelector('[data-action="parentheses"]'); }
            else {
                const action = key === '.' ? 'decimal' : key === '=' || key === 'Enter' ? 'equals' : key === 'Escape' || key === 'Delete' ? 'clear' : key === 'Backspace' ? 'delete' : key === '%' ? 'percent' : null;
                if (!action) return;
                handleAction(action);
                button = keysWrap.querySelector(`[data-action="${action}"]`);
            }
            glow(button);
        }
        event.preventDefault();
    });

    function setTheme(theme) {
        const light = theme === 'light';
        document.documentElement.dataset.theme = light ? 'light' : 'dark';
        themeToggle.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
        themeToggle.setAttribute('title', light ? 'Switch to dark mode' : 'Switch to light mode');
        themeToggle.setAttribute('aria-pressed', String(light));
        themeIcon.textContent = light ? '☾' : '☀';
        document.querySelector('meta[name="theme-color"]').content = light ? '#f8f9fc' : '#090909';
        try { localStorage.setItem(themeKey, theme); } catch (_) { /* Storage can be unavailable. */ }
    }

    themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
    historyToggle.addEventListener('click', () => showHistory(historyPanel.hidden));
    document.getElementById('back-calculator').addEventListener('click', () => showHistory(false));
    modeToggle.addEventListener('click', () => setScientific(!scientificMode));
    document.getElementById('clear-history').addEventListener('click', () => {
        history = [];
        persistHistory();
        renderHistory();
    });

    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(saved)) history = saved.filter(item => item && typeof item.expression === 'string' && typeof item.value === 'number' && Number.isFinite(item.value)).slice(0, 20);
    } catch (_) { history = []; }
    try { setTheme(localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'); } catch (_) { setTheme('dark'); }
    setScientific(false);
    renderHistory();
    render();
})();
