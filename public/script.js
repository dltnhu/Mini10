async function fetchTodos() {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Không thể lấy danh sách todos');
      const todos = await response.json();
      const todoList = document.getElementById('todoList');
      todoList.innerHTML = '';
      todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = todo.completed ? 'completed' : '';
        li.innerHTML = `
          ${todo.task}
          <div>
            <button class="toggle-btn" data-id="${todo.id}" data-completed="${!todo.completed}">${todo.completed ? 'Chưa hoàn thành' : 'Hoàn thành'}</button>
            <button class="delete-btn" data-id="${todo.id}">Xóa</button>
          </div>
        `;
        todoList.appendChild(li);
      });
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  }
  
  async function addTodo() {
    const taskInput = document.getElementById('taskInput');
    const task = taskInput.value.trim();
    if (!task) return alert('Vui lòng nhập công việc');
  
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      if (!response.ok) throw new Error('Không thể thêm công việc');
      taskInput.value = '';
      fetchTodos();
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  }
  
  async function toggleTodo(id, completed) {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) throw new Error('Không thể cập nhật trạng thái');
      fetchTodos();
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  }
  
  async function deleteTodo(id) {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Không thể xóa công việc');
      fetchTodos();
    } catch (error) {
      alert(`Lỗi: ${error.message}`);
    }
  }
  
  // Sử dụng event delegation để xử lý các nút "Hoàn thành" và "Xóa"
  document.getElementById('todoList').addEventListener('click', (event) => {
    const target = event.target;
    
    // Xử lý nút "Hoàn thành"/"Chưa hoàn thành"
    if (target.classList.contains('toggle-btn')) {
      const id = parseInt(target.getAttribute('data-id'));
      const completed = target.getAttribute('data-completed') === 'true';
      toggleTodo(id, completed);
    }
    
    // Xử lý nút "Xóa"
    if (target.classList.contains('delete-btn')) {
      const id = parseInt(target.getAttribute('data-id'));
      deleteTodo(id);
    }
  });
  
  // Gán sự kiện cho nút "Thêm" bằng addEventListener
  document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('.todo-input button');
    if (addButton) {
      addButton.addEventListener('click', addTodo);
    } else {
      console.error('Không tìm thấy nút Thêm');
    }
  });
  
  // Load todos on page load
  fetchTodos();