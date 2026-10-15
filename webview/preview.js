(() => {
  'use strict';
  const vscode = acquireVsCodeApi();
  const app = document.getElementById('app');
  let version = -1;
  let unavailable = false;
  let data;
  let labels;
  let selectedRow = 0;
  let selectedColumn = 0;

  const el = (tag, content, className) => {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  };
  const format = (template, values) => template.replace(/\{(n|current|total)\}/g,
    (_, key) => String(values[key]));
  const requestPage = (page, focus) => {
    if (selectedRow < page * 50 || selectedRow >= (page + 1) * 50) selectedRow = page * 50;
    vscode.postMessage({ type: 'page', version, page });
    if (focus) app.dataset.focusCell = 'true';
  };
  const focusCell = (row, column) => {
    const cells = [...app.querySelectorAll('td[tabindex]')];
    const target = cells.find((cell) => Number(cell.dataset.row) === row &&
      Number(cell.dataset.column) === column);
    if (target) {
      cells.forEach((cell) => cell.tabIndex = -1);
      target.tabIndex = 0;
      target.focus();
      selectedRow = row;
      selectedColumn = column;
    }
  };
  const jump = () => {
    const record = data.rows.find((row) => row.number === selectedRow + 1);
    if (record?.cells[selectedColumn] && !record.cells[selectedColumn].missing) {
      vscode.postMessage({ type: 'jump', version, row: selectedRow, column: selectedColumn });
    }
  };
  const render = (dirty) => {
    const hadCellFocus = document.activeElement?.matches('td[tabindex]');
    app.replaceChildren();
    app.append(el('h1', labels.title));
    if (dirty) app.append(el('p', labels.unsaved, 'notice'));
    if (data.rowCount === 0) { app.append(el('p', labels.emptyFile)); return; }
    selectedRow = Math.max(data.page * 50,
      Math.min(selectedRow, Math.min(data.rowCount - 1, (data.page + 1) * 50 - 1)));
    selectedColumn = Math.min(selectedColumn, data.headers.length - 1);
    app.append(el('p', labels.instructions));
    const toolbar = el('div', undefined, 'toolbar');
    const previous = el('button', labels.previous);
    previous.disabled = data.page === 0;
    previous.addEventListener('click', () => requestPage(data.page - 1, false));
    toolbar.append(previous);
    const pageLabel = el('span', format(labels.page, { current: data.page + 1, total: data.pageCount }));
    pageLabel.setAttribute('aria-live', 'polite');
    toolbar.append(pageLabel);
    const next = el('button', labels.next);
    next.disabled = data.page + 1 >= data.pageCount;
    next.addEventListener('click', () => requestPage(data.page + 1, false));
    toolbar.append(next);
    const source = el('button', labels.jump);
    source.addEventListener('click', jump);
    toolbar.append(source);
    const problems = el('button', labels.problems);
    problems.addEventListener('click', () => vscode.postMessage({ type: 'problems', version }));
    toolbar.append(problems);
    app.append(toolbar);

    const scroll = el('div', undefined, 'scroll');
    const table = el('table');
    table.setAttribute('aria-rowcount', String(data.rowCount + 1));
    table.setAttribute('aria-colcount', String(data.headers.length + 1));
    const head = el('thead');
    const headRow = el('tr');
    const corner = el('th', '#');
    corner.scope = 'col';
    headRow.append(corner);
    data.headers.forEach((header, column) => {
      const th = el('th', data.generatedHeaders[column] ?
        format(labels.column, { n: column + 1 }) : header);
      th.id = `col-${column}`;
      th.scope = 'col';
      headRow.append(th);
    });
    head.append(headRow);
    table.append(head);
    const body = el('tbody');
    for (const row of data.rows) {
      const tr = el('tr');
      tr.setAttribute('aria-rowindex', String(row.number + 1));
      const rowHead = el('th', format(labels.row, { n: row.number }) +
        (data.hasHeader && row.number === 1 ? ` — ${labels.headerRow}` : ''));
      rowHead.scope = 'row';
      rowHead.id = `row-${row.number}`;
      tr.append(rowHead);
      row.cells.forEach((cell, column) => {
        const td = el('td');
        td.tabIndex = row.number - 1 === selectedRow && column === selectedColumn ? 0 : -1;
        td.dataset.row = String(row.number - 1);
        td.dataset.column = String(column);
        const valueId = `value-${row.number}-${column}`;
        td.setAttribute('aria-colindex', String(column + 2));
        const value = el('span', cell.missing ? labels.missing : cell.value === '' ? labels.empty : cell.value,
          'value');
        value.id = valueId;
        const labelledBy = [rowHead.id, `col-${column}`, valueId];
        td.append(value);
        if (cell.missing) td.classList.add('missing');
        if (cell.malformed || cell.problems.length) {
          const issue = el('span', labels.malformed, 'problem');
          issue.id = `issue-${row.number}-${column}`;
          td.append(issue);
          labelledBy.push(issue.id);
        }
        if (row.problems.length) {
          const issue = el('span', labels.columnCount, 'problem');
          issue.id = `count-${row.number}-${column}`;
          td.append(issue);
          labelledBy.push(issue.id);
        }
        td.setAttribute('aria-labelledby', labelledBy.join(' '));
        td.addEventListener('focus', () => { selectedRow = row.number - 1; selectedColumn = column; });
        td.addEventListener('click', () => focusCell(row.number - 1, column));
        td.addEventListener('keydown', (event) => {
          let targetRow = row.number - 1;
          let targetColumn = column;
          switch (event.key) {
            case 'ArrowLeft': targetColumn -= 1; break;
            case 'ArrowRight': targetColumn += 1; break;
            case 'ArrowUp': targetRow -= 1; break;
            case 'ArrowDown': targetRow += 1; break;
            case 'Home': targetColumn = 0; break;
            case 'End': targetColumn = data.headers.length - 1; break;
            case 'PageUp': targetRow -= 50; break;
            case 'PageDown': targetRow += 50; break;
            case 'Enter': event.preventDefault(); jump(); return;
            default: return;
          }
          event.preventDefault();
          targetRow = Math.max(0, Math.min(data.rowCount - 1, targetRow));
          targetColumn = Math.max(0, Math.min(data.headers.length - 1, targetColumn));
          selectedRow = targetRow;
          selectedColumn = targetColumn;
          if (Math.floor(targetRow / 50) !== data.page) requestPage(Math.floor(targetRow / 50), true);
          else focusCell(targetRow, targetColumn);
        });
        tr.append(td);
      });
      body.append(tr);
    }
    table.append(body);
    scroll.append(table);
    app.append(scroll);
    if (app.dataset.focusCell === 'true' || hadCellFocus) {
      delete app.dataset.focusCell;
      focusCell(selectedRow, selectedColumn);
    }
  };
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'unavailable') {
      app.replaceChildren(el('h1', labels?.title || 'CSV preview'), el('p', message.message));
      version = -1;
      unavailable = true;
    } else if (!unavailable && message.type === 'page' && Number.isSafeInteger(message.version) &&
      message.version >= version) {
      version = message.version;
      data = message.data;
      labels = message.labels;
      render(message.dirty);
    }
  });
  vscode.postMessage({ type: 'ready' });
})();
