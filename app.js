const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();  // Memuat file .env di awal

const app = express();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync(process.env.DB_SSL_CA_PATH).toString(), // Lokasi file CA dari .env
    },
});


app.use(cors());
app.use(express.json()); // Untuk parsing JSON di request body

// Endpoint untuk search product
// Endpoint untuk search product
app.get('/api/products', async (req, res) => {
    const search = req.query.search.toLowerCase();
    const query = `
        SELECT id, nama_produk, kategori, subkategori, toko, harga, post_date
        FROM products
        WHERE LOWER(nama_produk) LIKE $1
        ORDER BY post_date DESC;
    `;
    try {
        const result = await pool.query(query, [`%${search}%`]);
        
        // Hanya ambil produk dengan harga terbaru per kombinasi nama_produk, kategori, subkategori, toko
        const filteredProducts = [];
        const seenProducts = new Set();

        result.rows.forEach((product) => {
            const key = `${product.nama_produk}-${product.kategori}-${product.subkategori}-${product.toko}`;
            if (!seenProducts.has(key)) {
                seenProducts.add(key);
                filteredProducts.push(product);
            }
        });

        res.json(filteredProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching products');
    }
});


// Endpoint untuk menyimpan expense
app.post('/api/expenses', async (req, res) => {
    const { product_id, quantity, total_harga, total_harga_tax, pajak, date } = req.body;

    try {
        const insertQuery = `
            INSERT INTO expenses (product_id, quantity, total_harga, total_harga_tax, pajak, date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const result = await pool.query(insertQuery, [product_id, quantity, total_harga, total_harga_tax, pajak, date]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving expense');
    }
});

// Endpoint untuk menyimpan produk baru jika tidak ada
// Endpoint untuk menyimpan produk baru jika tidak ada
app.post('/api/products', async (req, res) => {
    const { nama_produk, kategori, subkategori, toko, harga } = req.body;

    try {
        const insertProductQuery = `
            INSERT INTO products (nama_produk, kategori, subkategori, toko, harga, post_date)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id;
        `;
        const result = await pool.query(insertProductQuery, [nama_produk, kategori, subkategori, toko, harga]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving product');
    }
});

// Endpoint untuk menyimpan pendapatan pribadi
app.post('/api/personal-income', async (req, res) => {
    const { kategori, subkategori, jumlah, date } = req.body;

    try {
        const insertQuery = `
            INSERT INTO personal_income (kategori, subkategori, jumlah, date)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const result = await pool.query(insertQuery, [kategori, subkategori, jumlah, date]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving personal income');
    }
});
// Endpoint untuk mengambil semua data pendapatan pribadi
app.get('/api/personal-income', async (req, res) => {
    try {
        const query = `
            SELECT id, kategori, subkategori, jumlah, date, created_at
            FROM personal_income
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching personal income');
    }
});



// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
