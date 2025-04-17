const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Khởi tạo cache với TTL 1 giờ
const cache = new NodeCache({ stdTTL: 3600 });

// Cấu hình logger với winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Middleware
app.use(helmet()); // Bảo mật tiêu đề HTTP
app.use(morgan('combined')); // Ghi log yêu cầu HTTP
app.use(express.json()); // Parse JSON
app.use(express.static(path.join(__dirname, 'public'))); // Phục vụ file tĩnh (HTML, CSS, JS)

// Giới hạn yêu cầu
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 yêu cầu mỗi IP
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.'
});
app.use(limiter);

// Lưu trữ todos (in-memory, thay bằng database cho production)
let todos = [
  { id: 1, task: 'Học Node.js', completed: false },
  { id: 2, task: 'Xây dựng Todo API', completed: false }
];

// Hàm tạo ID mới
const generateId = () => {
  return todos.length > 0 ? Math.max(...todos.map(todo => todo.id)) + 1 : 1;
};

// Routes

// Lấy tất cả todos (có caching)
app.get('/api/todos', (req, res) => {
  const cacheKey = 'todos';
  const cachedTodos = cache.get(cacheKey);

  if (cachedTodos) {
    logger.info('Phục vụ todos từ cache');
    return res.json(cachedTodos);
  }

  logger.info('Phục vụ todos từ bộ nhớ');
  cache.set(cacheKey, todos);
  res.json(todos);
});

// Lấy todo theo ID
app.get('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);

  if (!todo) {
    logger.warn(`Không tìm thấy todo với ID ${id}`);
    return res.status(404).json({ error: 'Không tìm thấy todo' });
  }

  logger.info(`Lấy todo với ID ${id}`);
  res.json(todo);
});

// Tạo todo mới
app.post('/api/todos', (req, res) => {
  const { task } = req.body;

  if (!task || typeof task !== 'string') {
    logger.warn('Task không hợp lệ');
    return res.status(400).json({ error: 'Task là bắt buộc và phải là chuỗi' });
  }

  const newTodo = {
    id: generateId(),
    task,
    completed: false
  };

  todos.push(newTodo);
  cache.del('todos'); // Xóa cache
  logger.info(`Tạo todo mới với ID ${newTodo.id}`);
  res.status(201).json(newTodo);
});

// Cập nhật todo
app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { task, completed } = req.body;
  const todo = todos.find(t => t.id === id);

  if (!todo) {
    logger.warn(`Không tìm thấy todo với ID ${id}`);
    return res.status(404).json({ error: 'Không tìm thấy todo' });
  }

  if (task !== undefined && typeof task !== 'string') {
    logger.warn('Task không hợp lệ');
    return res.status(400).json({ error: 'Task phải là chuỗi' });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    logger.warn('Trạng thái hoàn thành không hợp lệ');
    return res.status(400).json({ error: 'Trạng thái hoàn thành phải là boolean' });
  }

  todo.task = task !== undefined ? task : todo.task;
  todo.completed = completed !== undefined ? completed : todo.completed;

  cache.del('todos'); // Xóa cache
  logger.info(`Cập nhật todo với ID ${id}`);
  res.json(todo);
});

// Xóa todo
app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(t => t.id === id);

  if (index === -1) {
    logger.warn(`Không tìm thấy todo với ID ${id}`);
    return res.status(404).json({ error: 'Không tìm thấy todo' });
  }

  todos.splice(index, 1);
  cache.del('todos'); // Xóa cache
  logger.info(`Xóa todo với ID ${id}`);
  res.status(204).send();
});

// Phục vụ giao diện HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  logger.error(`Lỗi: ${err.message}`);
  res.status(500).json({ error: 'Lỗi server' });
});

// Khởi động server
app.listen(port, () => {
  logger.info(`Server chạy trên cổng ${port}, http://localhost:3000`);
});