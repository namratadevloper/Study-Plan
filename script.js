// ==== Utility Functions ====
function formatDate(date) {
  // Returns YYYY-MM-DD
  return date.toISOString().split('T')[0];
}
function parseDate(str) {
  // 'YYYY-MM-DD' -> Date object (local)
  let [y, m, d] = str.split('-');
  return new Date(y, m - 1, d);
}
function getToday() {
  let now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}
function addDays(date, n) {
  let d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function getMonthDays(year, month) {
  // 0-based month
  return new Date(year, month + 1, 0).getDate();
}
function getWeekdayNames() {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
}

// ==== Data Persistence ====
const STORAGE_KEY = 'study_planner_tasks';
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==== App State ====
let tasksByDate = loadTasks(); // { 'YYYY-MM-DD': [ {text, completed, id} ] }
let selectedDate = formatDate(getToday());
let moveTaskObj = null;

// ==== Calendar Rendering ====
function renderCalendar(selected) {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  let selDate = parseDate(selected);
  let year = selDate.getFullYear();
  let month = selDate.getMonth();
  let todayStr = formatDate(getToday());
  // Calendar header
  let header = document.createElement('div');
  header.className = 'calendar-header';
  let prevBtn = document.createElement('button');
  prevBtn.textContent = '<';
  prevBtn.onclick = () => {
    let newDate = new Date(year, month - 1, 1);
    selectedDate = formatDate(newDate);
    renderCalendar(selectedDate);
    renderTodoList(selectedDate);
  };
  let nextBtn = document.createElement('button');
  nextBtn.textContent = '>';
  nextBtn.onclick = () => {
    let newDate = new Date(year, month + 1, 1);
    selectedDate = formatDate(newDate);
    renderCalendar(selectedDate);
    renderTodoList(selectedDate);
  };
  let monthName = selDate.toLocaleString('default', {month:'long', year:'numeric'});
  let title = document.createElement('span');
  title.textContent = monthName;
  header.append(prevBtn, title, nextBtn);
  calendar.appendChild(header);

  // Weekday names
  let grid = document.createElement('div');
  grid.className = 'calendar-grid';
  for(let wd of getWeekdayNames()) {
    let cell = document.createElement('div');
    cell.textContent = wd;
    cell.className = 'calendar-weekday';
    grid.appendChild(cell);
  }
  // Days
  let firstDay = new Date(year, month, 1).getDay();
  let days = getMonthDays(year, month);
  // Pad empty before 1st
  for(let i=0; i<firstDay; ++i) {
    let cell = document.createElement('div');
    cell.innerHTML = '&nbsp;';
    grid.appendChild(cell);
  }
  for(let d=1; d<=days; ++d) {
    let dateStr = formatDate(new Date(year, month, d));
    let cell = document.createElement('div');
    cell.className = 'calendar-day';
    if(dateStr === todayStr) cell.classList.add('today');
    if(dateStr === selected) cell.classList.add('selected');
    if(tasksByDate[dateStr] && tasksByDate[dateStr].length > 0)
      cell.classList.add('has-tasks');
    cell.textContent = d;
    cell.onclick = () => {
      selectedDate = dateStr;
      renderCalendar(selectedDate);
      renderTodoList(selectedDate);
    };
    grid.appendChild(cell);
  }
  calendar.appendChild(grid);
}

// ==== To-Do List Rendering ====
function renderTodoList(dateStr) {
  // Heading
  let title = document.getElementById('todo-date');
  let d = parseDate(dateStr);
  title.textContent = d.toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  // List
  let list = document.getElementById('todo-list');
  list.innerHTML = '';
  let arr = tasksByDate[dateStr] || [];
  if(arr.length === 0) {
    list.innerHTML = `<li style="color:#aaa;">No tasks for this day.</li>`;
  } else {
    for(let task of arr) {
      let li = document.createElement('li');
      li.className = 'todo-item';
      if(task.completed) li.classList.add('completed');
      // Checkbox
      let cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!task.completed;
      cb.onchange = () => {
        task.completed = cb.checked;
        saveTasks(tasksByDate);
        renderTodoList(dateStr);
        renderCalendar(selectedDate);
      };
      li.appendChild(cb);
      // Task text
      let span = document.createElement('span');
      span.textContent = task.text;
      li.appendChild(span);
      // Actions
      let actions = document.createElement('span');
      actions.className = 'todo-actions';
      // Move to another day
      let moveBtn = document.createElement('button');
      moveBtn.textContent = 'Move';
      moveBtn.onclick = () => openMoveModal(task, dateStr);
      actions.appendChild(moveBtn);
      // Delete
      let delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = () => {
        tasksByDate[dateStr] = tasksByDate[dateStr].filter(t=>t.id!==task.id);
        if(tasksByDate[dateStr].length === 0) delete tasksByDate[dateStr];
        saveTasks(tasksByDate);
        renderTodoList(dateStr);
        renderCalendar(selectedDate);
      };
      actions.appendChild(delBtn);
      li.appendChild(actions);
      list.appendChild(li);
    }
  }
}

// ==== Add Task ====
document.getElementById('todo-form').onsubmit = function(e) {
  e.preventDefault();
  let input = document.getElementById('todo-input');
  let text = input.value.trim();
  if(!text) return;
  let id = Date.now() + Math.random().toString(36).slice(2);
  let dateStr = selectedDate;
  if(!tasksByDate[dateStr]) tasksByDate[dateStr] = [];
  tasksByDate[dateStr].push({text, completed: false, id});
  saveTasks(tasksByDate);
  input.value = '';
  renderTodoList(selectedDate);
  renderCalendar(selectedDate);
};

// ==== Move Task Modal ====
function openMoveModal(task, fromDate) {
  moveTaskObj = {task, fromDate};
  let modal = document.getElementById('move-task-modal');
  let moveInput = document.getElementById('move-date');
  moveInput.value = fromDate;
  modal.style.display = 'block';
}
document.getElementById('close-modal').onclick = function() {
  document.getElementById('move-task-modal').style.display = 'none';
  moveTaskObj = null;
};
document.getElementById('move-task-btn').onclick = function() {
  if(!moveTaskObj) return;
  let toDate = document.getElementById('move-date').value;
  if(!toDate) return;
  // Remove from old, add to new
  let {task, fromDate} = moveTaskObj;
  tasksByDate[fromDate] = tasksByDate[fromDate].filter(t=>t.id!==task.id);
  if(tasksByDate[fromDate].length === 0) delete tasksByDate[fromDate];
  if(!tasksByDate[toDate]) tasksByDate[toDate] = [];
  tasksByDate[toDate].push({...task});
  saveTasks(tasksByDate);
  document.getElementById('move-task-modal').style.display = 'none';
  moveTaskObj = null;
  // If we moved to a different day, update calendar and both lists if visible
  renderCalendar(selectedDate);
  renderTodoList(selectedDate);
};

// ==== Daily Auto Move for Uncompleted Tasks ====
function autoRescheduleUncompletedTasks() {
  // If last seen date < today, move uncompleted tasks from past days to today or tomorrow
  let lastDate = localStorage.getItem('last_seen_date') || '';
  let todayStr = formatDate(getToday());
  if(lastDate && lastDate !== todayStr) {
    let yesterday = formatDate(addDays(parseDate(todayStr), -1));
    // Only check yesterday's tasks for pending
    if(tasksByDate[yesterday]) {
      let pending = tasksByDate[yesterday].filter(t=>!t.completed);
      if(pending.length > 0) {
        if(!tasksByDate[todayStr]) tasksByDate[todayStr] = [];
        tasksByDate[todayStr].push(...pending.map(t=>({...t, completed:false, id:Date.now()+Math.random().toString(36).slice(2)})));
      }
      // Remove moved tasks from yesterday
      tasksByDate[yesterday] = tasksByDate[yesterday].filter(t=>t.completed);
      if(tasksByDate[yesterday].length === 0) delete tasksByDate[yesterday];
    }
    saveTasks(tasksByDate);
  }
  localStorage.setItem('last_seen_date', todayStr);
}

// ==== Initial Render ====
window.onload = function() {
  autoRescheduleUncompletedTasks();
  renderCalendar(selectedDate);
  renderTodoList(selectedDate);
  // Modal close on outside click
  window.onclick = function(evt) {
    let modal = document.getElementById('move-task-modal');
    if(evt.target === modal) {
      modal.style.display = 'none';
      moveTaskObj = null;
    }
  };
};