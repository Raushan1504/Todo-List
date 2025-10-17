const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'todo_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                text VARCHAR(500) NOT NULL,
                checked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('MySQL Database initialized');
        connection.release();
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}initDatabase();
app.get('/api/todos', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM todos ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/todos', async (req, res) => {
    try {
        const { text, checked } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }const [result] = await pool.query(
            'INSERT INTO todos (text, checked) VALUES (?, ?)',
            [text, checked || false]
        );const [newTodo] = await pool.query(
            'SELECT * FROM todos WHERE id = ?',
            [result.insertId]
        );
        res.status(201).json(newTodo[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.put('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { checked, text } = req.body;
        let query = 'UPDATE todos SET ';
        const params = [];
        if (checked !== undefined) {
            query += 'checked = ?';
            params.push(checked);
        }
        if (text !== undefined) {
            if (params.length > 0) query += ', ';
            query += 'text = ?';
            params.push(text);
        }
        query += ' WHERE id = ?';
        params.push(id);
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }const [updatedTodo] = await pool.query(
            'SELECT * FROM todos WHERE id = ?', [id]
        );
        res.json(updatedTodo[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'DELETE FROM todos WHERE id = ?',[id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        res.json({ message: 'Todo deleted successfully' });
    }catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.delete('/api/todos', async (req, res) => {
    try {
        await pool.query('DELETE FROM todos');
        res.json({ message: 'All todos deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
