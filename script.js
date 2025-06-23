document.addEventListener('DOMContentLoaded', () => {
    const spreadsheetContainer = document.getElementById('spreadsheet-container');
    const runBtn = document.getElementById('run-btn');
    const stopBtn = document.getElementById('stop-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');

    const COLS = 26; // A-Z
    const ROWS = 100;

    let sheetData = {}; // To store cell data, e.g., { 'A1': 'value' }
    let isRunning = false;
    let executionPointer = null;

    // --- Selection State ---
    let selection = { start: null, end: null };
    let isDragging = false;

    // --- Grid Generation ---
    function createSpreadsheet() {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Header row (A, B, C...)
        const trHead = document.createElement('tr');
        const thEmpty = document.createElement('th');
        trHead.appendChild(thEmpty);
        for (let i = 0; i < COLS; i++) {
            const th = document.createElement('th');
            th.textContent = String.fromCharCode(65 + i);
            trHead.appendChild(th);
        }
        thead.appendChild(trHead);

        // Data rows (1, 2, 3...)
        for (let i = 1; i <= ROWS; i++) {
            const tr = document.createElement('tr');
            const thRow = document.createElement('th');
            thRow.textContent = i;
            tr.appendChild(thRow);

            for (let j = 0; j < COLS; j++) {
                const colName = String.fromCharCode(65 + j);
                const cellId = `${colName}${i}`;
                const td = document.createElement('td');
                td.id = cellId;
                td.addEventListener('dblclick', () => startEditing(td));
                td.addEventListener('mousedown', (e) => handleMouseDown(e.currentTarget));
                td.addEventListener('mouseover', (e) => handleMouseOver(e.currentTarget));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        spreadsheetContainer.innerHTML = ''; // Clear previous table if any
        spreadsheetContainer.appendChild(table);
    }

    // --- Selection and Copy/Paste ---
    function handleMouseDown(cell) {
        if (isRunning) return;
        isDragging = true;
        clearSelection();
        selection.start = cell.id;
        selection.end = cell.id;
        updateSelectionUI();
    }

    function handleMouseOver(cell) {
        if (isDragging) {
            selection.end = cell.id;
            updateSelectionUI();
        }
    }

    function handleMouseUp() {
        isDragging = false;
    }

    function handleKeyDown(e) {
        // Don't interfere with cell editing or execution
        if (e.target.tagName === 'INPUT' || isRunning) return;

        // Use metaKey for macOS Command key
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'c') {
                handleCopy();
                e.preventDefault();
            } else if (e.key.toLowerCase() === 'v') {
                handlePaste();
                e.preventDefault();
            }
        }
    }

    function clearSelection() {
        document.querySelectorAll('.selected-cell').forEach(c => {
            c.classList.remove('selected-cell');
        });
    }

    function parseCoords(cellId) {
        if (!cellId) return null;
        const col = cellId.charCodeAt(0) - 65; // 'A' -> 0
        const row = parseInt(cellId.substring(1), 10) - 1; // '1' -> 0
        return { row, col };
    }

    function toCellId({ row, col }) {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
        const colName = String.fromCharCode(65 + col);
        return `${colName}${row + 1}`;
    }

    function getSelectionCoords() {
        const startCoords = parseCoords(selection.start);
        const endCoords = parseCoords(selection.end);
        if (!startCoords || !endCoords) return null;

        return {
            start: {
                row: Math.min(startCoords.row, endCoords.row),
                col: Math.min(startCoords.col, endCoords.col),
            },
            end: {
                row: Math.max(startCoords.row, endCoords.row),
                col: Math.max(startCoords.col, endCoords.col),
            }
        };
    }
    
    function updateSelectionUI() {
        clearSelection();
        const coords = getSelectionCoords();
        if (!coords) return;

        for (let r = coords.start.row; r <= coords.end.row; r++) {
            for (let c = coords.start.col; c <= coords.end.col; c++) {
                const cellId = toCellId({ row: r, col: c });
                document.getElementById(cellId)?.classList.add('selected-cell');
            }
        }
    }

    function handleCopy() {
        const coords = getSelectionCoords();
        if (!coords) return;
    
        let clipboardData = [];
    
        for (let r = coords.start.row; r <= coords.end.row; r++) {
            let rowData = [];
            for (let c = coords.start.col; c <= coords.end.col; c++) {
                const cellId = toCellId({ row: r, col: c });
                rowData.push(getCellValue(cellId));
            }
            clipboardData.push(rowData.join('\t'));
        }
    
        navigator.clipboard.writeText(clipboardData.join('\n'))
            .then(() => console.log('Selection copied to clipboard.'))
            .catch(err => console.error('Failed to copy selection: ', err));
    }

    async function handlePaste() {
        if (!selection.start) return;

        try {
            const text = await navigator.clipboard.readText();
            const rows = text.split('\n');
            
            const startCoords = parseCoords(selection.start);
    
            rows.forEach((rowStr, rowIndex) => {
                const cols = rowStr.split('\t');
                cols.forEach((cellValue, colIndex) => {
                    const targetRow = startCoords.row + rowIndex;
                    const targetCol = startCoords.col + colIndex;
                    if (targetRow < ROWS && targetCol < COLS) {
                        const cellId = toCellId({ row: targetRow, col: targetCol });
                        updateCell(cellId, cellValue);
                    }
                });
            });

            // Update selection to match the pasted area
            const endRow = startCoords.row + rows.length - 1;
            const endCol = startCoords.col + (rows[0]?.split('\t').length - 1 || 0);
            selection.end = toCellId({ 
                row: Math.min(endRow, ROWS - 1), 
                col: Math.min(endCol, COLS - 1) 
            });
            updateSelectionUI();
    
        } catch (err) {
            console.error('Failed to paste from clipboard: ', err);
        }
    }

    // --- Cell Editing ---
    function startEditing(cell, force = false) {
        if (isRunning && !force) return; // Disable editing during execution unless forced
        if (cell.querySelector('input')) return;

        const originalValue = getCellValue(cell.id);
        cell.textContent = '';
        cell.classList.add('active-cell');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalValue;
        input.classList.add('cell-input');

        let isFinished = false; // State flag

        const finishEditing = (revert = false) => {
            if (isFinished) return;
            isFinished = true;

            const finalValue = revert ? originalValue : input.value;

            // Crucially, remove the input *before* updating the cell's text content,
            // as updateCell -> renderCell will replace all children of the cell.
            cell.removeChild(input);

            updateCell(cell.id, finalValue);
            cell.classList.remove('active-cell');
        };

        input.addEventListener('blur', () => finishEditing());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Stop other things from happening
                finishEditing();
            } else if (e.key === 'Escape') {
                finishEditing(true); // Revert to original and finish
            }
        });

        cell.appendChild(input);
        input.focus();
    }

    // --- Data Management ---
    function getCellValue(cellId) {
        return sheetData[cellId] || '';
    }

    function updateCell(cellId, value) {
        if (value) {
            sheetData[cellId] = value;
        } else {
            delete sheetData[cellId];
        }
        renderCell(cellId);
    }

    function renderCell(cellId) {
        const cell = document.getElementById(cellId);
        if (cell) {
            cell.textContent = getCellValue(cellId);
        }
    }
    
    function renderAllCells() {
        for (let i = 1; i <= ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const cellId = `${String.fromCharCode(65 + j)}${i}`;
                renderCell(cellId);
            }
        }
    }

    // --- Interpreter ---

    function resolveOperand(operandStr) {
        const trimmed = operandStr.trim();
        if (trimmed === '') throw new Error('Operand cannot be empty.');

        // 1. String literal
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.substring(1, trimmed.length - 1);
        }
        
        // 2. Number literal
        const num = Number(trimmed);
        if (!isNaN(num) && String(num) === trimmed) {
            return num;
        }

        // 3. Cell reference
        const cellId = parseCellId(trimmed);
        if (cellId) {
            const value = getCellValue(cellId);
            if (value.trim() === '') return ''; // Empty cell is empty string

            const numVal = Number(value);
            if (!isNaN(numVal) && String(numVal) === value) {
                return numVal;
            }
            return value;
        }

        throw new Error(`Invalid operand: ${operandStr}`);
    }


    function evaluateExpression(expressionStr) {
        if (typeof expressionStr !== 'string') return expressionStr;
        const trimmedExpr = expressionStr.trim();
        
        // Operators sorted by length to handle cases like '!=' vs '=' correctly
        const operators = ['!=', '=', '<', '>', '+', '-', '*', '/'];

        let parts = [];
        let currentPart = '';
        let inQuotes = false;
        
        for (let i = 0; i < trimmedExpr.length; i++) {
            const char = trimmedExpr[i];
            if (char === '"') inQuotes = !inQuotes;

            let foundOp = null;
            if (!inQuotes) {
                for (const op of operators) {
                    if (trimmedExpr.substring(i).startsWith(op)) {
                        foundOp = op;
                        break;
                    }
                }
            }
            
            if (foundOp) {
                if (currentPart.trim()) parts.push(currentPart.trim());
                parts.push(foundOp);
                currentPart = '';
                i += foundOp.length - 1;
            } else {
                currentPart += char;
            }
        }
        if (currentPart.trim()) parts.push(currentPart.trim());

        if (parts.length > 3) {
            throw new Error(`Expression contains multiple operators: ${trimmedExpr}`);
        }

        if (parts.length === 1) {
            return resolveOperand(parts[0]);
        }

        if (parts.length !== 3) {
            throw new Error(`Invalid expression syntax: ${trimmedExpr}`);
        }

        const [leftStr, op, rightStr] = parts;
        const leftVal = resolveOperand(leftStr);
        const rightVal = resolveOperand(rightStr);
        const leftType = typeof leftVal;
        const rightType = typeof rightVal;

        switch (op) {
            case '+':
                if (leftType === 'string' || rightType === 'string') {
                    return String(leftVal) + String(rightVal);
                }
                return leftVal + rightVal;
            
            case '-':
                if (leftType !== 'number' || rightType !== 'number') {
                    throw new Error(`Operator '-' can only be used with numbers.`);
                }
                return leftVal - rightVal;

            case '*':
                if (leftType === 'number' && rightType === 'number') return leftVal * rightVal;
                if (leftType === 'string' && rightType === 'number') return leftVal.repeat(rightVal);
                if (leftType === 'number' && rightType === 'string') {
                    throw new Error(`Invalid operands for '*' operator: cannot multiply a number by a string.`);
                }
                throw new Error(`Invalid operands for '*' operator.`);

            case '/':
                if (leftType !== 'number' || rightType !== 'number') {
                    throw new Error(`Operator '/' can only be used with numbers.`);
                }
                if (rightVal === 0) throw new Error('Division by zero.');
                return Math.floor(leftVal / rightVal);

            case '=': return leftVal === rightVal;
            case '!=': return leftVal !== rightVal;
            
            case '>':
            case '<':
                if (leftType !== rightType) return false;
                if (op === '>') return leftVal > rightVal;
                return leftVal < rightVal;

            default:
                 throw new Error(`Unsupported operator: ${op}`);
        }
    }

    function parseCellId(cellId) {
        if (!cellId || typeof cellId !== 'string' || !/^[A-Z]+[1-9][0-9]*$/.test(cellId.trim())) return null;
        return cellId.trim().toUpperCase();
    }
    
    function setExecutionPointer(cellId) {
        if (executionPointer) {
            document.getElementById(executionPointer)?.classList.remove('current-execution');
        }
        executionPointer = parseCellId(cellId);
        if (executionPointer) {
             document.getElementById(executionPointer)?.classList.add('current-execution');
        }
    }

    async function execute() {
        if (isRunning) return;
        isRunning = true;
        setExecutionPointer('A1');
        updateButtons();

        while (isRunning && executionPointer) {
            const commandStr = getCellValue(executionPointer);

            if (!commandStr) {
                console.log(`Execution halted: Cell ${executionPointer} is empty.`);
                break;
            }
            
            console.log(`Executing [${executionPointer}]: ${commandStr}`);

            try {
                const result = await runCommand(commandStr);
                 if (result.halt) {
                    break;
                 }
                setExecutionPointer(result.next);
            } catch (error) {
                alert(`Error at cell ${executionPointer}: ${error.message}`);
                stopExecution();
                break;
            }
            
            // Short delay to allow UI updates and prevent freezing
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        stopExecution();
    }
    
    async function runCommand(commandStr) {
        const cleanedCmd = commandStr.trim();
        const commandMatch = cleanedCmd.match(/^(\w+)/);
        if (!commandMatch) throw new Error(`Invalid command format: "${commandStr}"`);

        const command = commandMatch[1].toLowerCase();
        const restOfCmd = cleanedCmd.substring(command.length).trim();

        switch (command) {
            case 'change': {
                const argMatch = restOfCmd.match(/^\((.*?)\)(.*)/s);
                if (!argMatch) throw new Error(`Missing or invalid arguments for 'change'`);
                const argsStr = argMatch[1];
                const nextCellPart = argMatch[2].trim();
                
                const parts = argsStr.split(/,(.*)/s);
                const targetCell = parseCellId(parts[0]);
                if (!targetCell) throw new Error(`Invalid target cell in change: ${parts[0]}`);

                const source = parts[1]?.trim();
                if (source === undefined) throw new Error('change command requires two arguments');
                
                const valueToSet = evaluateExpression(source);
                updateCell(targetCell, String(valueToSet));
                
                const nextMatch = nextCellPart.match(/\[(.*?)\]/);
                if (!nextMatch) throw new Error(`Missing next cell for change: ${nextCellPart}`);
                return { next: parseCellId(nextMatch[1]) };
            }
            case 'if': {
                const argMatch = restOfCmd.match(/^\((.*?)\)(.*)/s);
                if (!argMatch) throw new Error(`Missing or invalid arguments for 'if'`);
                const argsStr = argMatch[1];
                const nextCellPart = argMatch[2].trim();

                const targetCell = parseCellId(argsStr);
                if (!targetCell) throw new Error(`Invalid cell in if: ${argsStr}`);
                
                const expression = getCellValue(targetCell);
                const branches = nextCellPart.match(/\[(.*?)\],\s*\[(.*?)\]/);
                if (!branches) throw new Error(`Invalid if statement branches: ${nextCellPart}`);
                
                if (!expression) {
                    return { next: parseCellId(branches[2]) };
                }
                
                const result = evaluateExpression(expression);
                return { next: parseCellId(result ? branches[1] : branches[2]) };
            }
            case 'goto': {
                const nextMatch = restOfCmd.match(/\[(.*?)\]/);
                if (!nextMatch) throw new Error(`Missing destination for goto: ${commandStr}`);
                return { next: parseCellId(nextMatch[1]) };
            }
            case 'input': {
                const argMatch = restOfCmd.match(/^\((.*?)\)(.*)/s);
                if (!argMatch) throw new Error(`Missing or invalid arguments for 'input'`);
                const argsStr = argMatch[1];
                const nextCellPart = argMatch[2].trim();

                const targetCellId = parseCellId(argsStr);
                if (!targetCellId) throw new Error(`Invalid cell in input: ${argsStr}`);
                const targetCellElement = document.getElementById(targetCellId);

                await new Promise(resolve => {
                    startEditing(targetCellElement, true);
                    const input = targetCellElement.querySelector('input');
                    if (input) {
                        input.addEventListener('blur', resolve, { once: true });
                    } else {
                        resolve(); 
                    }
                });
                
                const nextMatch = nextCellPart.match(/\[(.*?)\]/);
                if (!nextMatch) throw new Error(`Missing next cell for input: ${nextCellPart}`);
                return { next: parseCellId(nextMatch[1]) };
            }
            case 'wait': {
                const argMatch = restOfCmd.match(/^\((.*?)\)(.*)/s);
                if (!argMatch) throw new Error(`Missing or invalid arguments for 'wait'`);
                const argsStr = argMatch[1];
                const nextCellPart = argMatch[2].trim();

                const ms = parseInt(argsStr, 10);
                if (isNaN(ms)) throw new Error(`Invalid time for wait: ${argsStr}`);
                await new Promise(resolve => setTimeout(resolve, ms));
                
                const nextMatch = nextCellPart.match(/\[(.*?)\]/);
                if (!nextMatch) throw new Error(`Missing next cell for wait: ${nextCellPart}`);
                return { next: parseCellId(nextMatch[1]) };
            }
            case 'end':
                return { halt: true };
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    function stopExecution() {
        isRunning = false;
        setExecutionPointer(null);
        updateButtons();
        console.log("Execution stopped.");
    }

    // --- Controls ---
    function updateButtons() {
        runBtn.disabled = isRunning;
        stopBtn.disabled = !isRunning;
        importBtn.disabled = isRunning;
        exportBtn.disabled = isRunning;
    }

    function exportData() {
        const dataStr = JSON.stringify(sheetData, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sigbladfilum-sheet.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        sheetData = importedData;
                        renderAllCells();
                    } catch (error) {
                        alert('Failed to import file. Make sure it is a valid JSON file.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // --- Initial Setup ---
    runBtn.addEventListener('click', execute);
    stopBtn.addEventListener('click', stopExecution);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', importData);

    // Global listeners
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    createSpreadsheet();
    updateButtons();
}); 