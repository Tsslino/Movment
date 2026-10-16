const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração da ligação ao PostgreSQL do Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware para aceitar JSON grande (necessário para fotos em Base64)
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Criar tabelas automaticamente ao iniciar
async function criarTabelas() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS servicos (
                id BIGINT PRIMARY KEY,
                nome TEXT NOT NULL,
                valor NUMERIC NOT NULL
            );

            CREATE TABLE IF NOT EXISTS doutores (
                id BIGINT PRIMARY KEY,
                nome TEXT NOT NULL,
                foto TEXT,
                especialidade TEXT,
                servicos_ids JSONB
            );

            CREATE TABLE IF NOT EXISTS agendamentos (
                id BIGINT PRIMARY KEY,
                cliente_nome TEXT NOT NULL,
                doutor_id BIGINT,
                servico_id BIGINT,
                horario TEXT NOT NULL
            );
        `);
        console.log("Tabelas verificadas/criadas com sucesso na base de dados do Render!");
    } catch (erro) {
        console.error("Erro ao criar tabelas:", erro);
    }
}
criarTabelas();

// --- ROTAS DA API ---

// 1. Obter todos os dados
app.get('/api/dados', async (req, res) => {
    try {
        const servicos = await pool.query('SELECT * FROM servicos');
        const doutores = await pool.query('SELECT * FROM doutores');
        const agendamentos = await pool.query('SELECT * FROM agendamentos');

        res.json({
            servicos: servicos.rows,
            doutores: doutores.rows,
            agendamentos: agendamentos.rows
        });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 2. Salvar ou atualizar Serviço
app.post('/api/servicos', async (req, res) => {
    try {
        const { id, nome, valor } = req.body;
        await pool.query(
            `INSERT INTO servicos (id, nome, valor) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, valor = EXCLUDED.valor`,
            [id, nome, valor]
        );
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 3. Excluir Serviço
app.delete('/api/servicos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM servicos WHERE id = $1', [id]);
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 4. Salvar ou atualizar Doutor
app.post('/api/doutores', async (req, res) => {
    try {
        const { id, nome, foto, especialidade, servicos_ids } = req.body;
        await pool.query(
            `INSERT INTO doutores (id, nome, foto, especialidade, servicos_ids) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, foto = EXCLUDED.foto, especialidade = EXCLUDED.especialidade, servicos_ids = EXCLUDED.servicos_ids`,
            [id, nome, foto, especialidade, JSON.stringify(servicos_ids)]
        );
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 5. Excluir Doutor
app.delete('/api/doutores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM doutores WHERE id = $1', [id]);
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 6. Liberar/Excluir Agendamento
app.delete('/api/agendamentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM agendamentos WHERE id = $1', [id]);
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// 7. Resetar todos os agendamentos do dia
app.delete('/api/agendamentos', async (req, res) => {
    try {
        await pool.query('DELETE FROM agendamentos');
        res.json({ sucesso: true });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Rota principal do Painel Admin
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor da Movment a correr na porta ${PORT}`);
});