const http = require('http');
const url = require('url');
const fs = require("fs");
const pg = require("pg");

const config = {
    connectionString:
        "postgres://candidate:62I8anq3cFq5GYh2u4Lh@rc1b-r21uoagjy1t7k77h.mdb.yandexcloud.net:6432/db1",
    ssl: {
        rejectUnauthorized: true,
        ca: fs
            .readFileSync("root.crt")
            .toString(),
    },
};

const conn = new pg.Client(config);

conn.connect((err) => {
    if (err) throw err;
});

async function loadAndSaveCharacters() {
    try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch('https://rickandmortyapi.com/api/character');
        const data = await response.json();

        await conn.query(`
            CREATE TABLE IF NOT EXISTS jumperbreaker (
              id SERIAL PRIMARY KEY,
              name TEXT,
              data JSONB
            )
        `);

        for (const character of data.results) {
            await conn.query(`
              INSERT INTO jumperbreaker (name, data)
              VALUES ($1, $2)
            `, [character.name, JSON.stringify(character)]);
        }

        console.log('Characters saved to jumperbreaker table successfully!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        conn.end();
    }
}

loadAndSaveCharacters();
