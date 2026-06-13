const SPREADSHEET_ID = '1K8gIe6E-N7LX8HZuFrx0yLDyJwpXaKU1zLDqas67n8g';
const SHEET_NAME = 'tasks';

const COLS = {
  ID: 0,
  PARENT_ID: 1,
  PROJECT: 2,
  TASK: 3,
  STATUS: 4,
  MEMO: 5,
  CREATED_AT: 6,
  COMPLETED_AT: 7,
  SOURCE: 8,
};

const HEADERS = ['ID', '親ID', 'プロジェクト名', 'タスク名', '状態', 'メモ', '作成日時', '完了日時', '作成元'];

// ─── Webhook 受信 ─────────────────────────────────────────
function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);

    const handlers = {
      addTask:      () => addTask(json),
      addTasks:     () => addTasks(json),
      completeTask: () => completeTask(json),
      reopenTask:   () => reopenTask(json),
      listTasks:    () => listTasks(json),
    };

    const handler = handlers[json.action];
    const result = handler
      ? handler()
      : { success: false, message: `不明なaction: ${json.action}` };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── シート操作ユーティリティ ──────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function getAllData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
}

function getNextId(sheet) {
  const data = getAllData(sheet);
  if (data.length === 0) return 1;
  const ids = data.map(row => row[COLS.ID]).filter(id => id !== '' && id !== null);
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

function findByName(sheet, taskName, project) {
  const data = getAllData(sheet);
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[COLS.TASK] === taskName && (!project || row[COLS.PROJECT] === project)) {
      return { rowIndex: i + 2, data: row };
    }
  }
  return null;
}

function findById(sheet, id) {
  const data = getAllData(sheet);
  for (let i = 0; i < data.length; i++) {
    if (data[i][COLS.ID] === id) {
      return { rowIndex: i + 2, data: data[i] };
    }
  }
  return null;
}

function setStatus(sheet, rowIndex, status) {
  sheet.getRange(rowIndex, COLS.STATUS + 1).setValue(status);
  sheet.getRange(rowIndex, COLS.COMPLETED_AT + 1).setValue(status === 'done' ? new Date() : '');
}

// ─── 親タスク自動完了チェック ──────────────────────────────
function checkParentCompletion(sheet, parentId) {
  if (!parentId) return;
  const data = getAllData(sheet);
  const children = data.filter(row => row[COLS.PARENT_ID] === parentId);
  if (children.length === 0) return;

  const allDone = children.every(row => row[COLS.STATUS] === 'done');
  if (!allDone) return;

  const parent = findById(sheet, parentId);
  if (parent && parent.data[COLS.STATUS] !== 'done') {
    setStatus(sheet, parent.rowIndex, 'done');
  }
}

// ─── action: addTask ──────────────────────────────────────
function addTask(json) {
  const sheet = getSheet();
  const { project, task, parentTask, memo, source } = json;

  let parentId = '';

  if (parentTask) {
    const parent = findByName(sheet, parentTask, project);
    if (parent) {
      parentId = parent.data[COLS.ID];
    } else {
      parentId = getNextId(sheet);
      sheet.appendRow([parentId, '', project || '', parentTask, 'open', '', new Date(), '', source || 'manual']);
    }
  }

  const id = getNextId(sheet);
  sheet.appendRow([id, parentId, project || '', task, 'open', memo || '', new Date(), '', source || 'manual']);

  return { success: true, message: `タスク追加: ${task}`, id };
}

// ─── action: addTasks ─────────────────────────────────────
function addTasks(json) {
  const sheet = getSheet();
  const { project, parentTask, tasks, source } = json;

  let parentId = '';

  if (parentTask) {
    const parent = findByName(sheet, parentTask, project);
    if (parent) {
      parentId = parent.data[COLS.ID];
    } else {
      parentId = getNextId(sheet);
      sheet.appendRow([parentId, '', project || '', parentTask, 'open', '', new Date(), '', source || 'manual']);
    }
  }

  const added = [];
  for (const task of tasks) {
    const id = getNextId(sheet);
    sheet.appendRow([id, parentId, project || '', task, 'open', '', new Date(), '', source || 'manual']);
    added.push({ id, task });
  }

  return { success: true, message: `${added.length}件追加`, tasks: added };
}

// ─── action: completeTask ─────────────────────────────────
function completeTask(json) {
  const sheet = getSheet();
  const { task, project, id } = json;

  const target = id ? findById(sheet, id) : findByName(sheet, task, project);
  if (!target) return { success: false, message: `見つかりません: ${task || id}` };

  setStatus(sheet, target.rowIndex, 'done');

  const targetId = target.data[COLS.ID];
  const parentId = target.data[COLS.PARENT_ID];

  // 子を全完了
  const data = getAllData(sheet);
  for (let i = 0; i < data.length; i++) {
    if (data[i][COLS.PARENT_ID] === targetId && data[i][COLS.STATUS] !== 'done') {
      setStatus(sheet, i + 2, 'done');
    }
  }

  // 兄弟が全完了なら親も完了
  checkParentCompletion(sheet, parentId);

  return { success: true, message: `完了: ${target.data[COLS.TASK]}` };
}

// ─── action: reopenTask ───────────────────────────────────
function reopenTask(json) {
  const sheet = getSheet();
  const { task, project, id } = json;

  const target = id ? findById(sheet, id) : findByName(sheet, task, project);
  if (!target) return { success: false, message: `見つかりません: ${task || id}` };

  setStatus(sheet, target.rowIndex, 'open');

  return { success: true, message: `未完了に戻しました: ${target.data[COLS.TASK]}` };
}

// ─── action: listTasks ───────────────────────────────────
function listTasks(json) {
  const sheet = getSheet();
  const { project, includeCompleted } = json;

  let data = getAllData(sheet).filter(row => row[COLS.TASK] !== '');

  if (project) data = data.filter(row => row[COLS.PROJECT] === project);
  if (!includeCompleted) data = data.filter(row => row[COLS.STATUS] !== 'done');

  const tasks = data.map(row => ({
    id:          row[COLS.ID],
    parentId:    row[COLS.PARENT_ID] || null,
    project:     row[COLS.PROJECT],
    task:        row[COLS.TASK],
    status:      row[COLS.STATUS],
    memo:        row[COLS.MEMO],
    createdAt:   row[COLS.CREATED_AT],
    completedAt: row[COLS.COMPLETED_AT] || null,
    source:      row[COLS.SOURCE],
  }));

  return { success: true, count: tasks.length, tasks };
}
